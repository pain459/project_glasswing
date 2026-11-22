#!/usr/bin/env python3
"""Glasswing situation brief — Telegram command listener.

Long-polls the Telegram Bot API for commands from the authorized chat ID.
Supports multiple commands for on-demand status, diagnostics, and reporting.

Commands:
  /status   — Full situation brief (gather → LLM reason → deliver)
  /brief    — Alias for /status
  /containers — Container status and resource usage
  /errors   — Recent error-level logs from OpenObserve
  /spend    — LLM spend summary from LiteLLM
  /uptime   — Service uptime and recent restarts
  /help     — Show available commands

Design:
  - Same image as brief.py, different entrypoint.
  - Long polling (timeout=30s) — no webhook, no public port.
  - Only responds to commands from TELEGRAM_CHAT_ID.
  - Replies "⏳ Generating..." immediately for long-running commands.
  - Graceful: if a command fails, reports the error to the chat.

Environment (same as brief.py):
  TELEGRAM_BOT_TOKEN   Bot API token (required)
  TELEGRAM_CHAT_ID     Authorized chat ID (required)
  VLLM_URL             e.g. http://glasswing-vllm-qwen38:8000
  VLLM_MODEL           e.g. qwen3.8-opencode
  KUMA_URL, KUMA_API_TOKEN, BESZEL_URL, BESZEL_API_KEY,
  OPENOBSERVE_URL, OPENOBSERVE_EMAIL, OPENOBSERVE_PASSWORD,
  LITELLM_URL, LITELLM_MASTER_KEY
  TZ                   Timezone (optional)
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# Import the pipeline from brief.py (same image, same /app directory)
from brief import (
    gather_snapshot,
    reason,
    deliver,
    gather_docker,
    gather_host_metrics,
    gather_uptime_kuma,
    gather_openobserve_errors,
    gather_litellm_spend,
    paperless_ingest,
    paperless_list_tags,
    paperless_download_from_telegram,
    paperless_search,
    paperless_recent,
    paperless_get_document,
    HTTP_TIMEOUT,
)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

POLL_TIMEOUT = 30  # seconds per getUpdates long-poll
POLL_INTERVAL = 1  # brief pause between polls (avoids tight loop on error)
LISTENER_START_TIME = time.time()

# Formatting helpers
SEPARATOR = "─────────────────"


def format_percentage(value: float | str) -> str:
    """Format a percentage value."""
    if isinstance(value, str):
        return value
    return f"{value:.1f}%"


def format_currency(value: float) -> str:
    """Format a currency value."""
    return f"${value:.2f}"


def format_number(value: int) -> str:
    """Format a number with commas."""
    return f"{value:,}"


def section_header(emoji: str, title: str) -> str:
    """Create a section header."""
    return f"{emoji} *{title.upper()}*"


# ---------------------------------------------------------------------------
# Paperless inbox: tag set and caption grammar
# ---------------------------------------------------------------------------

# Load the allowed tag set from paperless-tags.list (baked into the image).
# Falls back to a default set if the file is missing.
_DEFAULT_TAGS = ["bills", "cards", "invites", "others"]
try:
    with open("/app/paperless-tags.list", "r") as _f:
        ALLOWED_TAGS = [
            line.strip().lower()
            for line in _f
            if line.strip() and not line.strip().startswith("#")
        ]
    if not ALLOWED_TAGS:
        ALLOWED_TAGS = _DEFAULT_TAGS
except FileNotFoundError:
    ALLOWED_TAGS = _DEFAULT_TAGS
    print("[warn] paperless-tags.list not found — using default tag set", file=sys.stderr)

# Staleness threshold: messages older than this (seconds) are considered
# "sent while offline" and get the ingested_late tag.
STALE_THRESHOLD = 300  # 5 minutes

# Maximum file size for ingestion (bytes).
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Allowed MIME types for ingestion.
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/heic",
    "image/heif",
    "application/pdf",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".heic", ".heif", ".pdf"}


def format_age(seconds: float) -> str:
    """Format a duration in seconds as a human-readable string."""
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        return f"{int(seconds // 60)}m"
    if seconds < 86400:
        hours = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        if mins:
            return f"{hours}h {mins}m"
        return f"{hours}h"
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    if hours:
        return f"{days}d {hours}h"
    return f"{days}d"


def parse_file_caption(caption: str) -> dict | None:
    """Parse a '#file ...' caption into metadata for Paperless ingestion.

    Returns None if the caption doesn't start with '#file'.
    Returns a dict with keys: title, tag, correspondence, subject.
    Returns {"error": "..."} if the tag is invalid.

    Grammar:
      #file                          → tag=others, no title
      #file tag=bills                → tag=bills
      #file tag=cards subject=Oct   → tag=cards, subject="Oct"
      #file tag=bills corr=HSBC     → tag=bills, correspondence="HSBC"
      #file electricity bill Oct    → title="electricity bill Oct", tag=others
      #file tag=bills electricity  → title="electricity", tag=bills
    """
    caption = caption.strip()
    if not caption.startswith("#file"):
        return None

    # Strip the '#file' prefix
    rest = caption[5:].strip()
    if not rest:
        return {"title": "", "tag": "others", "correspondence": "", "subject": ""}

    tag = "others"
    correspondence = ""
    subject = ""
    title_parts: list[str] = []

    for token in rest.split():
        if token.startswith("tag="):
            value = token[4:].lower()
            if value not in ALLOWED_TAGS:
                return {
                    "error": f"Unknown tag '{value}'. Valid tags: {', '.join(ALLOWED_TAGS)}"
                }
            tag = value
        elif token.startswith("corr=") or token.startswith("correspondence="):
            prefix = "corr=" if token.startswith("corr=") else "correspondence="
            correspondence = token[len(prefix):]
        elif token.startswith("subject="):
            subject = token[8:]
        else:
            title_parts.append(token)

    return {
        "title": " ".join(title_parts),
        "tag": tag,
        "correspondence": correspondence,
        "subject": subject,
    }


def tg_api(method: str, payload: dict | None = None) -> dict | None:
    """Call the Telegram Bot API. Returns the parsed JSON or None."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    try:
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url, data=data, headers={"Content-Type": "application/json"}, method="POST"
            )
        else:
            req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=POLL_TIMEOUT + 10) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body)
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, OSError) as e:
        print(f"[warn] Telegram API {method} failed: {e}", file=sys.stderr, flush=True)
        return None


def send_message(chat_id: str, text: str, parse_mode: str | None = "Markdown") -> bool:
    """Send a text message to a chat. Returns True on success.

    Set parse_mode=None for plain text (no Markdown formatting).
    """
    if len(text) > 4000:
        text = text[:4000] + "\n\n…(truncated)"
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode
    result = tg_api("sendMessage", payload)
    return bool(result and result.get("ok"))


def handle_status(chat_id: str) -> None:
    """Run the full brief pipeline (LLM-generated, detailed) and deliver to the chat."""
    # Acknowledge immediately
    send_message(chat_id, "⏳ Generating full status report…")

    try:
        # 1. Gather
        snapshot = gather_snapshot()
        available = sum(1 for v in snapshot.values() if isinstance(v, dict) and v.get("available"))
        total = len(snapshot) - 1
        print(f"[INFO] /status: snapshot gathered ({available}/{total} sources)", flush=True)

        # 2. Reason
        brief = reason(snapshot)
        print(f"[INFO] /status: brief generated ({len(brief)} chars)", flush=True)

        # 3. Deliver
        ok = deliver(brief)
        if ok:
            print("[PASS] /status: brief delivered", flush=True)
        else:
            send_message(chat_id, "⚠️ Brief was generated but Telegram delivery failed. Check bot logs.")

    except Exception as e:
        print(f"[FAIL] /status: pipeline error: {e}", file=sys.stderr, flush=True)
        send_message(chat_id, f"⚠️ Brief generation failed: {e}")


def handle_brief(chat_id: str) -> None:
    """Generate a quick summary (3-5 lines, instant, no LLM)."""
    try:
        # Gather all data
        snapshot = gather_snapshot()
        
        # Extract key metrics
        docker_data = snapshot.get("docker", {})
        host_metrics = snapshot.get("host_metrics", {})
        kuma_data = snapshot.get("uptime_kuma", {})
        litellm_data = snapshot.get("litellm_spend", {})
        
        lines = [section_header("📋", "Quick Summary"), SEPARATOR, ""]
        
        # Containers
        if docker_data.get("available"):
            total = docker_data.get("total", 0)
            running = docker_data.get("running", 0)
            status = "✅" if running == total else "⚠️"
            lines.append(f"{status} *Containers*")
            lines.append(f"   {format_number(running)}/{format_number(total)} running")
            lines.append("")
        
        # Host metrics
        if host_metrics.get("available"):
            cpu = host_metrics.get("cpu_percent", "N/A")
            ram = host_metrics.get("ram_percent", "N/A")
            disk = host_metrics.get("disk_percent", "N/A")
            lines.append("*📊 Resources*")
            lines.append(f"   CPU   {format_percentage(cpu)}")
            lines.append(f"   RAM   {format_percentage(ram)}")
            lines.append(f"   Disk  {format_percentage(disk)}")
            lines.append("")
        
        # Service status
        if kuma_data.get("available"):
            up = kuma_data.get("up", 0)
            down = kuma_data.get("down", 0)
            if down > 0:
                lines.append("🚨 *Services*")
                lines.append(f"   {format_number(up)} up, {format_number(down)} down")
            else:
                lines.append("✅ *Services*")
                lines.append(f"   All {format_number(up)} up")
            lines.append("")
        
        # LLM spend
        if litellm_data.get("available"):
            spend = litellm_data.get("total_spend_usd", 0)
            requests = litellm_data.get("total_requests", 0)
            lines.append("*💰 LLM Spend*")
            lines.append(f"   {format_currency(spend)} ({format_number(requests)} requests)")
            lines.append("")
        
        # Add a note if any sources are unavailable
        unavailable = [k for k, v in snapshot.items() if isinstance(v, dict) and not v.get("available")]
        if unavailable:
            lines.append(SEPARATOR)
            lines.append(f"⚠️ Unavailable: {', '.join(unavailable)}")
        
        send_message(chat_id, "\n".join(lines))
        print("[PASS] /brief: delivered", flush=True)

    except Exception as e:
        print(f"[FAIL] /brief: error: {e}", file=sys.stderr, flush=True)
        send_message(chat_id, f"⚠️ Failed to generate quick summary: {e}")


def handle_containers(chat_id: str) -> None:
    """Show container status and resource usage."""
    send_message(chat_id, "📦 Fetching container status…")

    try:
        docker_data = gather_docker()
        if not docker_data.get("available"):
            send_message(chat_id, "⚠️ Docker data unavailable")
            return

        total = docker_data.get("total", 0)
        running = docker_data.get("running", 0)
        exited = docker_data.get("exited", 0)
        container_names = docker_data.get("containers", [])
        
        # Get host metrics for resource usage
        host_metrics = gather_host_metrics()
        
        lines = [section_header("📦", "Containers"), SEPARATOR, ""]
        
        # Status
        lines.append("*Status*")
        lines.append(f"   ✅ {format_number(running)} running")
        if exited > 0:
            lines.append(f"   ❌ {format_number(exited)} exited")
        lines.append("")
        
        # Container list
        if container_names:
            lines.append("*Running (top 10)*")
            for name in container_names[:10]:
                lines.append(f"   • {name}")
            if len(container_names) > 10:
                lines.append(f"   …and {format_number(len(container_names) - 10)} more")
            lines.append("")
        
        # Host metrics
        if host_metrics.get("available"):
            lines.append("*📊 Host Resources*")
            lines.append(f"   CPU   {format_percentage(host_metrics.get('cpu_percent', 'N/A'))}")
            lines.append(f"   RAM   {format_percentage(host_metrics.get('ram_percent', 'N/A'))}")
            lines.append(f"   Disk  {format_percentage(host_metrics.get('disk_percent', 'N/A'))}")
        
        send_message(chat_id, "\n".join(lines))
        print("[PASS] /containers: delivered", flush=True)

    except Exception as e:
        print(f"[FAIL] /containers: error: {e}", file=sys.stderr, flush=True)
        send_message(chat_id, f"⚠️ Failed to fetch container status: {e}")


def handle_errors(chat_id: str) -> None:
    """Show recent error-level logs from OpenObserve."""
    send_message(chat_id, "🚨 Fetching recent errors…")

    try:
        oo_data = gather_openobserve_errors()
        if not oo_data.get("available"):
            send_message(chat_id, "⚠️ OpenObserve data unavailable")
            return

        error_count = oo_data.get("error_count_last_hour", 0)
        sample_errors = oo_data.get("sample", [])
        
        lines = [section_header("🚨", "Recent Errors"), SEPARATOR, ""]
        
        # Summary
        lines.append(f"*Last 1 hour:* {format_number(error_count)} error-level logs")
        lines.append("")
        
        # Sample errors
        if sample_errors:
            lines.append("*Sample*")
            for err in sample_errors[:5]:
                service = err.get("service", "unknown")
                message = err.get("message", "")[:80]
                lines.append(f"   • {service}: {message}")
        else:
            lines.append("✅ No recent errors found")
        
        send_message(chat_id, "\n".join(lines))
        print("[PASS] /errors: delivered", flush=True)

    except Exception as e:
        print(f"[FAIL] /errors: error: {e}", file=sys.stderr, flush=True)
        send_message(chat_id, f"⚠️ Failed to fetch errors: {e}")


def handle_spend(chat_id: str) -> None:
    """Show LLM spend summary from LiteLLM."""
    send_message(chat_id, "💰 Fetching LLM spend…")

    try:
        litellm_data = gather_litellm_spend()
        if not litellm_data.get("available"):
            send_message(chat_id, "⚠️ LiteLLM data unavailable")
            return

        total_spend = litellm_data.get("total_spend_usd", 0)
        total_requests = litellm_data.get("total_requests", 0)
        cache_hit_rate = litellm_data.get("cache_hit_pct", 0)
        
        lines = [section_header("💰", "LLM Spend"), SEPARATOR, ""]
        
        # Total
        lines.append("*Total*")
        lines.append(f"   {format_currency(total_spend)} ({format_number(total_requests)} requests)")
        lines.append("")
        
        # Cache
        if cache_hit_rate:
            lines.append("*Cache*")
            lines.append(f"   Hit rate: {format_percentage(cache_hit_rate)}")
        
        send_message(chat_id, "\n".join(lines))
        print("[PASS] /spend: delivered", flush=True)

    except Exception as e:
        print(f"[FAIL] /spend: error: {e}", file=sys.stderr, flush=True)
        send_message(chat_id, f"⚠️ Failed to fetch spend data: {e}")


def handle_uptime(chat_id: str) -> None:
    """Show service uptime and recent restarts."""
    send_message(chat_id, "📊 Fetching service status…")

    try:
        kuma_data = gather_uptime_kuma()
        if not kuma_data.get("available"):
            send_message(chat_id, "⚠️ Uptime Kuma data unavailable")
            return

        total = kuma_data.get("total", 0)
        up = kuma_data.get("up", 0)
        down = kuma_data.get("down", 0)
        down_services = kuma_data.get("down_services", [])
        
        lines = [section_header("📊", "Service Status"), SEPARATOR, ""]
        
        # Status
        lines.append(f"✅ {format_number(up)} up")
        if down > 0:
            lines.append(f"❌ {format_number(down)} down")
            if down_services:
                lines.append("")
                lines.append("*Down services*")
                for service in down_services[:5]:
                    lines.append(f"   • {service}")
                if len(down_services) > 5:
                    lines.append(f"   …and {format_number(len(down_services) - 5)} more")
        else:
            lines.append("")
            lines.append("✅ All services are operational!")
        
        send_message(chat_id, "\n".join(lines))
        print("[PASS] /uptime: delivered", flush=True)

    except Exception as e:
        print(f"[FAIL] /uptime: error: {e}", file=sys.stderr, flush=True)
        send_message(chat_id, f"⚠️ Failed to fetch uptime data: {e}")


def handle_help(chat_id: str) -> None:
    """Show available commands."""
    lines = [
        section_header("📖", "Available Commands"),
        SEPARATOR,
        "",
        "*Reports*",
        "   /status — Full detailed report (LLM, ~10-20s)",
        "   /brief — Quick summary (instant)",
        "",
        "*Diagnostics*",
        "   /containers — Container status",
        "   /errors — Recent errors",
        "   /uptime — Service status",
        "",
        "*Metrics*",
        "   /spend — LLM spend",
        "",
        "*Inbox & Search*",
        "   Send a photo/PDF with caption '#file' to ingest into Paperless",
        f"   e.g. #file tag=bills, #file tag=cards subject=October",
        f"   Valid tags: {', '.join(ALLOWED_TAGS)} (default: others)",
        "",
        "   /docs <query> — Search documents (tag=X, corr=Y, page=N)",
        "   /recent — Last 5 documents",
        "   /doc <id> — Document detail",
        "",
        "*Liveness*",
        "   /ping — Check if the bot is alive",
        "",
        "*Help*",
        "   /help — Show this message",
        "",
        SEPARATOR,
        "💡 Quick commands are instant. /status uses LLM.",
    ]
    
    send_message(chat_id, "\n".join(lines))
    print("[PASS] /help: delivered", flush=True)


def handle_photo(update: dict) -> None:
    """Handle a photo or document update: ingest into Paperless if captioned #file."""
    msg = update.get("message", {})
    chat_id = str(msg.get("chat", {}).get("id", ""))

    # Extract the file from the update
    file_id = ""
    file_size = 0
    file_name = ""
    mime_type = ""

    if "photo" in msg:
        # Take the largest photo variant
        photos = msg["photo"]
        if photos:
            largest = photos[-1]
            file_id = largest.get("file_id", "")
            file_size = largest.get("file_size", 0)
            file_name = "photo.jpg"
            mime_type = "image/jpeg"
    elif "document" in msg:
        doc = msg["document"]
        file_id = doc.get("file_id", "")
        file_size = doc.get("file_size", 0)
        file_name = doc.get("file_name", "document")
        mime_type = doc.get("mime_type", "")

    if not file_id:
        send_message(chat_id, "⚠️ Could not extract a file from the message.")
        return

    # Size check
    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        send_message(
            chat_id,
            f"⚠️ File is {size_mb:.1f} MB — over the 10 MB limit. NOT ingested.",
        )
        return

    # Type check
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        # Also check by extension as a fallback
        ext = "." + file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        if ext not in ALLOWED_EXTENSIONS:
            send_message(
                chat_id,
                f"⚠️ Unsupported file type '{mime_type}'. Send a photo or PDF. NOT ingested.",
            )
            return

    # Staleness check
    msg_date = msg.get("date", 0)
    age = time.time() - msg_date if msg_date else 0
    is_stale = age > STALE_THRESHOLD

    # Parse caption
    caption = msg.get("caption", "") or msg.get("text", "") or ""
    parsed = parse_file_caption(caption)

    if parsed is None:
        # No '#file' prefix — hint the user
        send_message(
            chat_id,
            "ℹ️ Send with a '#file' caption to ingest into Paperless.\n"
            "   e.g. #file tag=bills\n"
            f"   Valid tags: {', '.join(ALLOWED_TAGS)}",
            parse_mode=None,
        )
        return

    if "error" in parsed:
        send_message(chat_id, f"⚠️ {parsed['error']}", parse_mode=None)
        return

    # Download from Telegram
    print(f"[INFO] Downloading file from Telegram (id={file_id[:8]}...)", flush=True)
    downloaded = paperless_download_from_telegram(file_id)
    if downloaded is None:
        send_message(
            chat_id,
            "⚠️ Failed to download the file from Telegram. NOT ingested. Re-send if needed.",
        )
        return

    file_bytes, filename = downloaded

    # Build the tag list
    user_tag = parsed.get("tag", "others")
    tag_list = [user_tag]
    if is_stale:
        tag_list.append("ingested_late")

    # Ingest into Paperless
    print(f"[INFO] Ingesting into Paperless (tags={tag_list})", flush=True)
    result = paperless_ingest(
        file_bytes=file_bytes,
        filename=filename,
        title=parsed.get("title", ""),
        tags=tag_list,
        correspondence=parsed.get("correspondence", ""),
        subject=parsed.get("subject", ""),
    )

    if result is None:
        send_message(
            chat_id,
            "⚠️ Paperless is unreachable. The file was NOT ingested.\n"
            "   Re-send once Paperless is back up.",
        )
        return

    if result.get("duplicate"):
        send_message(
            chat_id,
            "ℹ️ Paperless already has this file (duplicate). NOT re-ingested.",
        )
        return

    doc_id = result.get("id", "?")
    doc_title = result.get("title", filename) or filename

    if is_stale:
        send_message(
            chat_id,
            f"⏰ Ingested a file from {format_age(age)} ago (sent while offline).\n"
            f"   Document: {doc_id}\n"
            f"   Title: {doc_title}\n"
            f"   Tags: {', '.join(tag_list)}",
            parse_mode=None,
        )
    else:
        send_message(
            chat_id,
            f"✅ Ingested as document: {doc_id}\n"
            f"   Title: {doc_title}\n"
            f"   Tags: {', '.join(tag_list)}",
            parse_mode=None,
        )

    print(f"[PASS] Paperless ingest: doc #{doc_id}", flush=True)


def _strip_html(text: str) -> str:
    """Strip HTML tags from a string (for search highlights)."""
    import re
    return re.sub(r"<[^>]+>", "", text)


def _format_doc_line(idx: int, doc: dict, show_highlights: bool = False) -> list[str]:
    """Format a single document as a list of lines for Telegram."""
    doc_id = doc.get("id", "?")
    title = doc.get("title", "(untitled)") or "(untitled)"
    created = doc.get("created", "")[:10]  # YYYY-MM-DD
    tags = [t.get("name", "") for t in doc.get("tags", []) if isinstance(t, dict)]
    corr = doc.get("correspondent", "")

    lines = [f"{idx}. #{doc_id} — {title}"]
    meta_parts = []
    if created:
        meta_parts.append(f"📅 {created}")
    if tags:
        meta_parts.append(f"🏷️ {', '.join(tags)}")
    if corr:
        meta_parts.append(f"✉️ {corr}")
    if meta_parts:
        lines.append("   " + "  ".join(meta_parts))

    if show_highlights:
        hit = doc.get("__search_hit__", {})
        highlights = hit.get("highlights", "")
        if highlights:
            clean = _strip_html(highlights)
            # Truncate long highlights
            if len(clean) > 120:
                clean = clean[:117] + "..."
            lines.append(f'   "{clean}"')

    return lines


def parse_docs_command(text: str) -> dict | None:
    """Parse '/docs ...' into {query, tag, corr, page}.

    Grammar:
      /docs electricity              → {query: "electricity"}
      /docs tag=bills                → {tag: "bills"}
      /docs corr=HSBC                → {corr: "HSBC"}
      /docs tag=bills electricity   → {tag: "bills", query: "electricity"}
      /docs page=2 electricity      → {query: "electricity", page: 2}

    Returns None if the text doesn't start with '/docs'.
    Returns {"error": "..."} if the tag is invalid.
    """
    text = text.strip()
    if not text.startswith("/docs"):
        return None

    rest = text[5:].strip()
    if not rest:
        return None  # No args — caller shows usage

    query_parts: list[str] = []
    tag = ""
    corr = ""
    page = 1

    for token in rest.split():
        if token.startswith("tag="):
            value = token[4:].lower()
            if value not in ALLOWED_TAGS:
                return {
                    "error": f"Unknown tag '{value}'. Valid tags: {', '.join(ALLOWED_TAGS)}"
                }
            tag = value
        elif token.startswith("corr=") or token.startswith("correspondence="):
            prefix = "corr=" if token.startswith("corr=") else "correspondence="
            corr = token[len(prefix):]
        elif token.startswith("page="):
            try:
                page = max(1, int(token[5:]))
            except ValueError:
                page = 1
        else:
            query_parts.append(token)

    return {
        "query": " ".join(query_parts),
        "tag": tag,
        "corr": corr,
        "page": page,
    }


def handle_docs(chat_id: str, args: dict) -> None:
    """Search Paperless and format results for Telegram."""
    if "error" in args:
        send_message(chat_id, f"⚠️ {args['error']}", parse_mode=None)
        return

    query = args.get("query", "")
    tag = args.get("tag", "")
    corr = args.get("corr", "")
    page = args.get("page", 1)

    # Need at least one search criterion
    if not query and not tag and not corr:
        send_message(
            chat_id,
            "Usage: /docs <query> [tag=X] [corr=Y] [page=N]\n"
            f"   e.g. /docs electricity, /docs tag=bills, /docs corr=HSBC",
            parse_mode=None,
        )
        return

    send_message(chat_id, "📄 Searching Paperless…")

    result = paperless_search(query=query, tag=tag, corr=corr, page=page)
    if result is None:
        send_message(chat_id, "⚠️ Paperless is unreachable. Try again later.")
        return

    count = result.get("count", 0)
    results = result.get("results", [])

    if count == 0:
        search_desc = query or tag or corr
        send_message(chat_id, f"No documents found for '{search_desc}'.")
        return

    lines = [f"📄 {count} result(s) for '{query or tag or corr}'", ""]

    for i, doc in enumerate(results, 1):
        lines.extend(_format_doc_line(i, doc, show_highlights=True))
        lines.append("")

    # Pagination hint
    if count > len(results):
        next_page = page + 1
        query_hint = query or tag or corr
        lines.append(f"   ({count} total — /docs page={next_page} {query_hint} for more)")

    send_message(chat_id, "\n".join(lines), parse_mode=None)
    print(f"[PASS] /docs: {count} results, page {page}", flush=True)


def handle_recent(chat_id: str) -> None:
    """Show the last 5 documents."""
    send_message(chat_id, "📄 Fetching recent documents…")

    result = paperless_recent(limit=5)
    if result is None:
        send_message(chat_id, "⚠️ Paperless is unreachable. Try again later.")
        return

    results = result.get("results", [])
    if not results:
        send_message(chat_id, "No documents in Paperless yet.")
        return

    lines = ["📄 Recent documents", ""]
    for i, doc in enumerate(results, 1):
        lines.extend(_format_doc_line(i, doc, show_highlights=False))
        lines.append("")

    send_message(chat_id, "\n".join(lines), parse_mode=None)
    print(f"[PASS] /recent: {len(results)} documents", flush=True)


def handle_doc(chat_id: str, doc_id: int) -> None:
    """Show detail for a single document."""
    send_message(chat_id, f"📄 Fetching document #{doc_id}…")

    doc = paperless_get_document(doc_id)
    if doc is None:
        send_message(chat_id, f"Document #{doc_id} not found (or Paperless unreachable).")
        return

    title = doc.get("title", "(untitled)") or "(untitled)"
    created = doc.get("created", "")
    modified = doc.get("modified", "")
    tags = [t.get("name", "") for t in doc.get("tags", []) if isinstance(t, dict)]
    corr = doc.get("correspondent", "")
    subject = doc.get("subject", "")
    pages = doc.get("page_count", 0)
    size = doc.get("file_size", 0)
    filename = doc.get("original_file_name", "")

    # Format size
    if size > 1024 * 1024:
        size_str = f"{size / (1024 * 1024):.1f} MB"
    elif size > 1024:
        size_str = f"{size / 1024:.0f} KB"
    else:
        size_str = f"{size} B"

    # Format dates
    created_str = created[:16].replace("T", " ") if created else "N/A"
    modified_str = modified[:16].replace("T", " ") if modified else "N/A"

    lines = [
        f"📄 Document #{doc_id}",
        "",
        f"   Title:         {title}",
        f"   Created:       {created_str}",
        f"   Modified:      {modified_str}",
        f"   Tags:          {', '.join(tags) if tags else '(none)'}",
        f"   Correspondent: {corr if corr else '(none)'}",
        f"   Subject:       {subject if subject else '(none)'}",
        f"   Pages:         {pages if pages else 'N/A'}",
        f"   Size:          {size_str}",
        f"   File:          {filename if filename else 'N/A'}",
    ]

    send_message(chat_id, "\n".join(lines), parse_mode=None)
    print(f"[PASS] /doc: #{doc_id} ({title})", flush=True)


def handle_ping(chat_id: str) -> None:
    """Reply with liveness info."""
    uptime = time.time() - LISTENER_START_TIME
    lines = [f"🏓 pong — up for {format_age(uptime)}"]

    # Check Paperless reachability
    tags = paperless_list_tags()
    if tags is not None:
        lines.append(f"   Paperless: ✅ reachable ({len(tags)} tags)")
    else:
        lines.append("   Paperless: ❌ unreachable")

    send_message(chat_id, "\n".join(lines))
    print("[PASS] /ping: delivered", flush=True)


def main() -> int:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[FAIL] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set", file=sys.stderr)
        return 1

    print(f"[INFO] Situation listener started (chat_id={TELEGRAM_CHAT_ID[:4]}...)", flush=True)
    print(f"[INFO] Allowed tags: {', '.join(ALLOWED_TAGS)}", flush=True)
    print(f"[INFO] Waiting for commands…", flush=True)

    offset = None
    first_batch = True

    while True:
        payload = {"timeout": POLL_TIMEOUT}
        if offset is not None:
            payload["offset"] = offset

        result = tg_api("getUpdates", payload)

        if result is None:
            time.sleep(POLL_INTERVAL)
            continue

        if not result.get("ok"):
            print(f"[warn] getUpdates not ok: {result}", file=sys.stderr, flush=True)
            time.sleep(POLL_INTERVAL)
            continue

        updates = result.get("result", [])

        # Catch-up summary: if this is the first batch and it has multiple
        # updates, the server was likely offline. Send a summary before
        # processing so the user knows what's coming.
        if first_batch and len(updates) > 1:
            first_batch = False
            photos = sum(
                1
                for u in updates
                if "photo" in u.get("message", {}) or "document" in u.get("message", {})
            )
            commands = len(updates) - photos
            dates = [
                u["message"]["date"]
                for u in updates
                if "message" in u and "date" in u.get("message", {})
            ]
            if dates:
                oldest_age = time.time() - min(dates)
                summary = [f"⏰ I was offline for {format_age(oldest_age)}."]
                if photos:
                    summary.append(f"   {photos} photo(s) queued — will ingest.")
                if commands:
                    summary.append(f"   {commands} command(s) queued — will run.")
                summary.append("   Processing now…")
                send_message(TELEGRAM_CHAT_ID, "\n".join(summary))
                print(f"[INFO] Catch-up summary sent ({len(updates)} queued updates)", flush=True)
        elif updates:
            first_batch = False

        for update in updates:
            # Track offset to avoid reprocessing
            offset = update["update_id"] + 1

            msg = update.get("message", {})
            chat_id = str(msg.get("chat", {}).get("id", ""))

            # Only respond to messages from the authorized chat
            if chat_id != TELEGRAM_CHAT_ID:
                continue

            # --- Photo / document handling (Paperless inbox) ---
            if "photo" in msg or "document" in msg:
                print("[INFO] Photo/document received — routing to Paperless inbox", flush=True)
                try:
                    handle_photo(update)
                except Exception as e:
                    print(f"[FAIL] handle_photo error: {e}", file=sys.stderr, flush=True)
                    try:
                        send_message(chat_id, f"⚠️ Ingest failed: {e}")
                    except Exception:
                        pass
                continue

            text = msg.get("text", "").strip()

            # Route to the appropriate handler
            if text == "/status":
                print("[INFO] /status received — running full brief pipeline", flush=True)
                handle_status(chat_id)
            elif text == "/brief":
                print("[INFO] /brief received — generating quick summary", flush=True)
                handle_brief(chat_id)
            elif text == "/containers":
                print("[INFO] /containers received", flush=True)
                handle_containers(chat_id)
            elif text == "/errors":
                print("[INFO] /errors received", flush=True)
                handle_errors(chat_id)
            elif text == "/spend":
                print("[INFO] /spend received", flush=True)
                handle_spend(chat_id)
            elif text == "/uptime":
                print("[INFO] /uptime received", flush=True)
                handle_uptime(chat_id)
            elif text.startswith("/docs"):
                print("[INFO] /docs received", flush=True)
                args = parse_docs_command(text)
                if args is None:
                    send_message(
                        chat_id,
                        "Usage: /docs <query> [tag=X] [corr=Y] [page=N]\n"
                        f"   e.g. /docs electricity, /docs tag=bills, /docs corr=HSBC",
                        parse_mode=None,
                    )
                else:
                    handle_docs(chat_id, args)
            elif text == "/recent":
                print("[INFO] /recent received", flush=True)
                handle_recent(chat_id)
            elif text.startswith("/doc "):
                doc_id_str = text[5:].strip()
                if not doc_id_str.isdigit():
                    send_message(chat_id, "Usage: /doc <id>  (e.g. /doc 42)", parse_mode=None)
                else:
                    print(f"[INFO] /doc {doc_id_str} received", flush=True)
                    handle_doc(chat_id, int(doc_id_str))
            elif text == "/ping":
                print("[INFO] /ping received", flush=True)
                handle_ping(chat_id)
            elif text == "/help":
                print("[INFO] /help received", flush=True)
                handle_help(chat_id)
            elif text.startswith("/"):
                # Unknown command — show help
                print(f"[INFO] Unknown command: {text}", flush=True)
                handle_help(chat_id)
            # Ignore non-command messages silently

    return 0


if __name__ == "__main__":
    sys.exit(main())
