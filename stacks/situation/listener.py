#!/usr/bin/env python3
"""Glasswing situation brief — Telegram command listener.

Long-polls the Telegram Bot API for /status commands from the authorized
chat ID. When received, runs the full gather → reason → deliver pipeline
and sends the brief back to the chat.

Design:
  - Same image as brief.py, different entrypoint.
  - Long polling (timeout=30s) — no webhook, no public port.
  - Only responds to /status from TELEGRAM_CHAT_ID.
  - Replies "⏳ Generating..." immediately, then the brief when done.
  - Graceful: if the pipeline fails, reports the error to the chat.

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

# Import the pipeline from brief.py (same image, same /app directory)
from brief import gather_snapshot, reason, deliver, HTTP_TIMEOUT

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
    """Run the full brief pipeline and deliver to the chat."""
    # Acknowledge immediately
    send_message(chat_id, "⏳ Generating situation brief…")

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


def main() -> int:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[FAIL] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set", file=sys.stderr)
        return 1

    print(f"[INFO] Situation listener started (chat_id={TELEGRAM_CHAT_ID[:4]}...)", flush=True)
    print(f"[INFO] Waiting for /status commands…", flush=True)

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

            # Only respond to /status from the authorized chat
            if chat_id != TELEGRAM_CHAT_ID:
                continue

            if text == "/status":
                print("[INFO] /status received — running brief pipeline", flush=True)
                handle_status(chat_id)
            elif text.startswith("/"):
                # Unknown command — brief help
                send_message(
                    chat_id,
                    "Available commands:\n/status — run a situation brief now"
                )
            # Ignore non-command messages silently

    return 0


if __name__ == "__main__":
    sys.exit(main())
