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
  OLLAMA_URL           e.g. http://glasswing-ollama:11434
  OLLAMA_MODEL         e.g. qwen3.8-opencode
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
    HTTP_TIMEOUT,
)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

POLL_TIMEOUT = 30  # seconds per getUpdates long-poll
POLL_INTERVAL = 1  # brief pause between polls (avoids tight loop on error)


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


def send_message(chat_id: str, text: str) -> bool:
    """Send a text message to a chat. Returns True on success."""
    if len(text) > 4000:
        text = text[:4000] + "\n\n…(truncated)"
    result = tg_api("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    })
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
        
        lines = ["📋 Quick Summary", ""]
        
        # Containers
        if docker_data.get("available"):
            total = docker_data.get("total", 0)
            running = docker_data.get("running", 0)
            lines.append(f"📦 Containers: {running}/{total} running")
        
        # Host metrics
        if host_metrics.get("available"):
            cpu = host_metrics.get("cpu_percent", "N/A")
            ram = host_metrics.get("ram_percent", "N/A")
            disk = host_metrics.get("disk_percent", "N/A")
            lines.append(f"📊 Resources: CPU {cpu}%, RAM {ram}%, Disk {disk}%")
        
        # Service status
        if kuma_data.get("available"):
            up = kuma_data.get("up", 0)
            down = kuma_data.get("down", 0)
            if down > 0:
                lines.append(f"🚨 Services: {up} up, {down} down")
            else:
                lines.append(f"✅ Services: All {up} up")
        
        # LLM spend
        if litellm_data.get("available"):
            spend = litellm_data.get("total_spend_usd", 0)
            requests = litellm_data.get("total_requests", 0)
            lines.append(f"💰 LLM: ${spend:.2f} ({requests} requests)")
        
        # Add a note if any sources are unavailable
        unavailable = [k for k, v in snapshot.items() if isinstance(v, dict) and not v.get("available")]
        if unavailable:
            lines.append("")
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
        
        lines = [
            f"📦 Containers ({total} total)",
            "",
            f"✅ {running} running",
        ]
        
        if exited > 0:
            lines.append(f"❌ {exited} exited")
        
        if container_names:
            lines.append("")
            lines.append("Running containers:")
            for name in container_names[:10]:  # Show up to 10 containers
                lines.append(f"   • {name}")
            if len(container_names) > 10:
                lines.append(f"   …and {len(container_names) - 10} more")
        
        if host_metrics.get("available"):
            lines.append("")
            lines.append("📊 Host Resources")
            lines.append(f"   CPU: {host_metrics.get('cpu_percent', 'N/A')}%")
            lines.append(f"   RAM: {host_metrics.get('ram_percent', 'N/A')}% used")
            lines.append(f"   Disk: {host_metrics.get('disk_percent', 'N/A')}% used")
        
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
        
        lines = [
            f"🚨 Recent Errors (last 1h)",
            "",
            f"Total: {error_count} error-level logs",
        ]
        
        if sample_errors:
            lines.append("")
            lines.append("Sample errors:")
            for err in sample_errors[:5]:  # Show up to 5 sample errors
                service = err.get("service", "unknown")
                message = err.get("message", "")[:80]  # Truncate long messages
                lines.append(f"   • {service}: {message}")
        
        if not sample_errors:
            lines.append("")
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
        
        lines = [
            "💰 LLM Spend",
            "",
            f"Total: ${total_spend:.2f} ({total_requests} requests)",
        ]
        
        if cache_hit_rate:
            lines.append("")
            lines.append(f"Cache hit rate: {cache_hit_rate:.1f}%")
        
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
        
        lines = [
            f"📊 Service Status ({total} monitors)",
            "",
            f"✅ {up} up",
        ]
        
        if down > 0:
            lines.append(f"❌ {down} down")
            if down_services:
                for service in down_services[:5]:  # Show up to 5 down services
                    lines.append(f"   • {service}")
                if len(down_services) > 5:
                    lines.append(f"   …and {len(down_services) - 5} more")
        else:
            lines.append("")
            lines.append("✅ All services are up!")
        
        send_message(chat_id, "\n".join(lines))
        print("[PASS] /uptime: delivered", flush=True)

    except Exception as e:
        print(f"[FAIL] /uptime: error: {e}", file=sys.stderr, flush=True)
        send_message(chat_id, f"⚠️ Failed to fetch uptime data: {e}")


def handle_help(chat_id: str) -> None:
    """Show available commands."""
    help_text = """📖 Available Commands

/status — Full detailed report (LLM-generated, ~10-20s)
/brief — Quick summary (3-5 lines, instant)
/containers — Container status and resource usage
/errors — Recent error-level logs
/spend — LLM spend summary
/uptime — Service uptime status
/help — Show this help message

Quick commands (/brief, /containers, /errors, /spend, /uptime) are instant.
The full report (/status) uses the local LLM for a comprehensive analysis."""
    
    send_message(chat_id, help_text)
    print("[PASS] /help: delivered", flush=True)


def main() -> int:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[FAIL] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set", file=sys.stderr)
        return 1

    print(f"[INFO] Situation listener started (chat_id={TELEGRAM_CHAT_ID[:4]}...)", flush=True)
    print(f"[INFO] Waiting for commands…", flush=True)

    offset = None

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

        for update in updates:
            # Track offset to avoid reprocessing
            offset = update["update_id"] + 1

            msg = update.get("message", {})
            chat_id = str(msg.get("chat", {}).get("id", ""))
            text = msg.get("text", "").strip()

            # Only respond to commands from the authorized chat
            if chat_id != TELEGRAM_CHAT_ID:
                continue

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
