#!/usr/bin/env python3
"""Glasswing situation brief.

Gathers a compact snapshot of the platform, reasons over it with the local
Ollama model, and pushes a plain-English brief to Telegram.

Design goals:
  - Local inference only (no cloud calls).
  - Graceful degradation: one source failing never blocks the brief.
  - Always delivers a full brief (the user chose "always full brief").
  - Near-zero marginal cost: one inference call per run.

Environment (injected by Infisical via with-infisical.sh):
  TELEGRAM_BOT_TOKEN   Bot API token (required)
  TELEGRAM_CHAT_ID     Destination chat (required)
  OLLAMA_URL           e.g. http://glasswing-ollama:11434 (required)
  OLLAMA_MODEL         e.g. qwen3.8-opencode (default)
  KUMA_URL             e.g. http://glasswing-uptime-kuma:3001 (optional)
  KUMA_API_TOKEN       Uptime Kuma API token (optional, for /api/status)
  BESZEL_URL           e.g. http://glasswing-beszel:8090 (optional)
  BESZEL_API_KEY       Beszel API key (optional, for /api/v1/agents)
  OPENOBSERVE_URL      e.g. http://glasswing-openobserve:5080 (optional)
  OPENOBSERVE_EMAIL    OpenObserve root user (optional)
  OPENOBSERVE_PASSWORD OpenObserve root password (optional)
  LITELLM_URL          e.g. http://glasswing-litellm:4000 (optional)
  LITELLM_MASTER_KEY   LiteLLM master key (optional)
  TZ                   Timezone (optional)
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://glasswing-ollama:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.8-opencode")
KUMA_URL = os.environ.get("KUMA_URL", "http://glasswing-uptime-kuma:3001").rstrip("/")
KUMA_API_TOKEN = os.environ.get("KUMA_API_TOKEN", "")
BESZEL_URL = os.environ.get("BESZEL_URL", "http://glasswing-beszel:8090").rstrip("/")
BESZEL_API_KEY = os.environ.get("BESZEL_API_KEY", "")
OPENOBSERVE_URL = os.environ.get("OPENOBSERVE_URL", "http://glasswing-openobserve:5080").rstrip("/")
OPENOBSERVE_EMAIL = os.environ.get("OPENOBSERVE_EMAIL", "")
OPENOBSERVE_PASSWORD = os.environ.get("OPENOBSERVE_PASSWORD", "")
LITELLM_URL = os.environ.get("LITELLM_URL", "http://glasswing-litellm:4000").rstrip("/")
LITELLM_MASTER_KEY = os.environ.get("LITELLM_MASTER_KEY", "")

HTTP_TIMEOUT = 15  # seconds per HTTP call


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def http_get(url: str, headers: dict | None = None) -> dict | list | None:
    """GET a URL and parse JSON. Returns None on any failure."""
    try:
        req = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body)
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, OSError) as e:
        print(f"[warn] GET {url} failed: {e}", file=sys.stderr)
        return None


def http_post(url: str, payload: dict, headers: dict | None = None) -> dict | None:
    """POST JSON to a URL and parse the response. Returns None on failure."""
    try:
        data = json.dumps(payload).encode("utf-8")
        hdrs = {"Content-Type": "application/json"}
        if headers:
            hdrs.update(headers)
        req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body)
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, OSError) as e:
        print(f"[warn] POST {url} failed: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Gather: collect signals from each source
# ---------------------------------------------------------------------------


def gather_uptime_kuma() -> dict:
    """Get up/down status for all monitored services from Uptime Kuma."""
    # Kuma API: GET /metrics with Basic auth (API key as password).
    # The /metrics endpoint returns Prometheus-format metrics including
    # monitor_status{monitor_name="...", ...} 1 (UP) or 0 (DOWN).
    if not KUMA_API_TOKEN:
        return {"available": False, "note": "Uptime Kuma API token not configured"}

    import base64
    # Basic auth with empty username and API key as password
    auth = base64.b64encode(f":{KUMA_API_TOKEN}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}"}

    # /metrics returns plain text (Prometheus format), not JSON
    try:
        req = urllib.request.Request(f"{KUMA_URL}/metrics", headers=headers)
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f"[warn] GET {KUMA_URL}/metrics failed: {e}", file=sys.stderr)
        return {"available": False, "note": "Uptime Kuma unreachable"}

    # Parse monitor_status lines: monitor_status{..., monitor_name="...", ...} 1
    import re
    pattern = r'monitor_status\{[^}]*monitor_name="([^"]+)"[^}]*\}\s+(\d+)'
    matches = re.findall(pattern, body)

    if not matches:
        return {"available": False, "note": "No monitor_status metrics found"}

    up = sum(1 for _, status in matches if status == "1")
    down = sum(1 for _, status in matches if status == "0")
    other = len(matches) - up - down

    down_names = [name for name, status in matches if status == "0"]

    return {
        "available": True,
        "total": len(matches),
        "up": up,
        "down": down,
        "other": other,
        "down_services": down_names,
    }


def gather_beszel() -> dict:
    """Get host health (CPU, RAM, disk) from Beszel."""
    # Beszel uses PocketBase API. The /api/collections/systems/records endpoint
    # returns system records with metrics. No auth needed for read access.
    data = http_get(f"{BESZEL_URL}/api/collections/systems/records")
    if data is None:
        return {"available": False, "note": "Beszel unreachable"}

    # PocketBase returns {items: [...], totalItems: N, ...}
    items = data.get("items", [])
    if not items:
        return {"available": False, "note": "No Beszel systems found"}

    # Take the first system (Pathfinder)
    system = items[0]
    metrics = system.get("metrics", {})

    return {
        "available": True,
        "system": system.get("name", "pathfinder"),
        "status": system.get("status", "unknown"),
        "cpu_percent": metrics.get("cpu", {}).get("usage", "n/a"),
        "ram_percent": metrics.get("ram", {}).get("usage", "n/a"),
        "disk_percent": metrics.get("disk", {}).get("usage", "n/a"),
        "gpu": metrics.get("gpu", "n/a"),
    }


def gather_openobserve_errors() -> dict:
    """Count recent error-level logs from OpenObserve (last 1 hour)."""
    if not OPENOBSERVE_EMAIL or not OPENOBSERVE_PASSWORD:
        return {"available": False, "note": "OpenObserve credentials not configured"}

    # OpenObserve search API: POST /api/{org}/_search
    # Time values are in microseconds (not seconds).
    # org is "default"
    now_us = int(datetime.now(timezone.utc).timestamp() * 1_000_000)
    from_us = now_us - 3_600_000_000  # 1 hour ago in microseconds

    query = {
        "query": {
            "sql": "SELECT * FROM glasswing_errors LIMIT 50",
            "start_time": from_us,
            "end_time": now_us,
            "from": 0,
            "size": 50,
        }
    }

    import base64
    auth = base64.b64encode(f"{OPENOBSERVE_EMAIL}:{OPENOBSERVE_PASSWORD}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}"}

    data = http_post(f"{OPENOBSERVE_URL}/api/default/_search", query, headers=headers)
    if data is None:
        return {"available": False, "note": "OpenObserve query failed"}

    # Response: {hits: [...], total: N, ...}
    total = data.get("total", 0)
    hits = data.get("hits", [])[:5]  # sample up to 5

    return {
        "available": True,
        "error_count_last_hour": total,
        "sample": [
            {
                "message": h.get("message", h.get("body", ""))[:200],
                "service": h.get("container_name", h.get("service", "unknown")),
            }
            for h in hits
        ],
    }


def gather_litellm_spend() -> dict:
    """Get recent LLM spend and cache-hit rate from LiteLLM."""
    if not LITELLM_MASTER_KEY:
        return {"available": False, "note": "LiteLLM master key not configured"}

    headers = {"Authorization": f"Bearer {LITELLM_MASTER_KEY}"}
    data = http_get(f"{LITELLM_URL}/spend/logs", headers=headers)
    if data is None:
        return {"available": False, "note": "LiteLLM spend/logs unreachable"}

    # /spend/logs returns a list of spend entries
    if isinstance(data, dict) and "data" in data:
        logs = data["data"]
    elif isinstance(data, list):
        logs = data
    else:
        return {"available": False, "note": "Unexpected LiteLLM response"}

    if not logs:
        return {"available": True, "note": "No spend logs yet", "total_spend": 0}

    # Sum recent spend
    total_spend = sum(e.get("spend", 0) for e in logs)
    total_requests = len(logs)

    # Cache hit rate: compare prompt_tokens vs cached_tokens if available
    total_prompt = sum(e.get("prompt_tokens", 0) for e in logs)
    total_cached = sum(
        (e.get("usage_object", {}) or {}).get("cached_tokens", 0)
        or (e.get("prompt_tokens_details", {}) or {}).get("cached_tokens", 0)
        for e in logs
    )
    cache_hit_pct = (total_cached / total_prompt * 100) if total_prompt > 0 else 0

    return {
        "available": True,
        "total_requests": total_requests,
        "total_spend_usd": round(total_spend, 6),
        "cache_hit_pct": round(cache_hit_pct, 1),
    }


def gather_docker() -> dict:
    """Get container status via the Docker socket (if mounted)."""
    # The Docker socket is mounted at /var/run/docker.sock in the container.
    # We can use the Docker API to get container status.
    import socket
    import struct

    docker_sock = "/var/run/docker.sock"
    if not os.path.exists(docker_sock):
        return {
            "available": False,
            "note": "Docker socket not mounted",
        }

    try:
        # Connect to the Docker socket
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.connect(docker_sock)

        # Send a GET /containers/json request
        request = b"GET /containers/json?all=false HTTP/1.1\r\nHost: docker\r\nConnection: close\r\n\r\n"
        s.sendall(request)

        # Read the response
        response = b""
        while True:
            chunk = s.recv(4096)
            if not chunk:
                break
            response += chunk

        s.close()

        # Parse the response (skip headers)
        body = response.split(b"\r\n\r\n", 1)[1]

        # Handle chunked transfer encoding
        if b"Transfer-Encoding: chunked" in response:
            # Decode chunked encoding
            decoded = b""
            while body:
                # Read chunk size
                line_end = body.find(b"\r\n")
                if line_end == -1:
                    break
                chunk_size = int(body[:line_end], 16)
                if chunk_size == 0:
                    break
                body = body[line_end + 2:]
                decoded += body[:chunk_size]
                body = body[chunk_size + 2:]  # Skip chunk data + CRLF
            body = decoded

        containers = json.loads(body)

        running = sum(1 for c in containers if c.get("State") == "running")
        exited = sum(1 for c in containers if c.get("State") == "exited")
        names = [c.get("Names", ["?"])[0].lstrip("/") for c in containers]

        return {
            "available": True,
            "total": len(containers),
            "running": running,
            "exited": exited,
            "containers": names[:10],  # First 10 for brevity
        }
    except (OSError, json.JSONDecodeError) as e:
        return {
            "available": False,
            "note": f"Docker API error: {e}",
        }


def gather_host_metrics() -> dict:
    """Get host CPU, RAM, and disk usage from /proc and /sys."""
    metrics = {}

    # CPU usage from /proc/stat
    try:
        with open("/proc/stat") as f:
            line = f.readline()
            fields = line.split()[1:]
            cpu_times = list(map(int, fields[:8]))
            idle = cpu_times[3]
            total = sum(cpu_times)
            metrics["cpu_percent"] = round((1 - idle / total) * 100, 1) if total > 0 else 0
    except (OSError, ValueError):
        metrics["cpu_percent"] = "n/a"

    # RAM usage from /proc/meminfo
    try:
        meminfo = {}
        with open("/proc/meminfo") as f:
            for line in f:
                key, value = line.split(":", 1)
                meminfo[key] = int(value.split()[0])  # in kB
        total = meminfo.get("MemTotal", 0)
        available = meminfo.get("MemAvailable", 0)
        metrics["ram_percent"] = round((1 - available / total) * 100, 1) if total > 0 else 0
    except (OSError, ValueError):
        metrics["ram_percent"] = "n/a"

    # Disk usage from /proc/mounts or df
    try:
        import subprocess
        result = subprocess.run(["df", "-B1", "/"], capture_output=True, text=True, timeout=5)
        lines = result.stdout.strip().split("\n")
        if len(lines) >= 2:
            fields = lines[1].split()
            total = int(fields[1])
            used = int(fields[2])
            metrics["disk_percent"] = round(used / total * 100, 1) if total > 0 else 0
    except (OSError, subprocess.TimeoutExpired, ValueError, IndexError):
        metrics["disk_percent"] = "n/a"

    if metrics.get("cpu_percent") == "n/a" and metrics.get("ram_percent") == "n/a":
        return {"available": False, "note": "Host metrics unavailable"}

    return {"available": True, **metrics}


def gather_snapshot() -> dict:
    """Gather all signals into one snapshot dict."""
    snapshot = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_kuma": gather_uptime_kuma(),
        "beszel": gather_beszel(),
        "openobserve_errors": gather_openobserve_errors(),
        "litellm_spend": gather_litellm_spend(),
        "docker": gather_docker(),
        "host_metrics": gather_host_metrics(),
    }
    return snapshot


# ---------------------------------------------------------------------------
# Reason: ask the local LLM to produce a brief
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are the Glasswing situation analyst. You receive a JSON snapshot of a \
private datacenter's health. Produce a plain-English brief with these sections:

1. **Overall state** — one line: healthy / degraded / critical.
2. **What's healthy** — bullet list of systems that are fine.
3. **What's wrong or degrading** — bullet list of issues, with specifics.
4. **Suggested next step** — one concrete action for the operator.

Rules:
- Be concise. No fluff.
- If a data source is unavailable, note it briefly but don't dwell.
- If everything is fine, say so clearly and keep the brief short.
- Flag anything that needs human attention with ⚠️.
- Use Markdown formatting (bold, bullets).
"""


def reason(snapshot: dict) -> str:
    """Send the snapshot to the local LLM and get back a brief."""
    user_message = f"Here is the current snapshot:\n\n{json.dumps(snapshot, indent=2)}"

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.3,
        "max_tokens": 1024,
        "stream": False,
    }

    # Ollama OpenAI-compatible endpoint
    data = http_post(f"{OLLAMA_URL}/v1/chat/completions", payload)
    if data is None:
        return "⚠️ **Brief generation failed** — Ollama is unreachable or the model is not loaded. The raw snapshot is attached below.\n\n```\n" + json.dumps(snapshot, indent=2) + "\n```"

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        return f"⚠️ **Brief generation failed** — unexpected Ollama response: {e}"


# ---------------------------------------------------------------------------
# Deliver: send to Telegram
# ---------------------------------------------------------------------------


def deliver(brief: str) -> bool:
    """Send the brief to Telegram. Returns True on success."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[FAIL] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set", file=sys.stderr)
        return False

    # Telegram limits messages to 4096 chars. Truncate if needed.
    if len(brief) > 4000:
        brief = brief[:4000] + "\n\n…(truncated)"

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": brief,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }

    data = http_post(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        payload,
    )

    if data and data.get("ok"):
        print(f"[PASS] Brief delivered to Telegram (message_id={data['result']['message_id']})")
        return True
    else:
        print(f"[FAIL] Telegram delivery failed: {data}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    print(f"[INFO] Glasswing situation brief — {datetime.now(timezone.utc).isoformat()}")
    print(f"[INFO] Ollama: {OLLAMA_URL} (model: {OLLAMA_MODEL})")
    print(f"[INFO] Telegram: chat_id={TELEGRAM_CHAT_ID[:4]}...")

    # 1. Gather
    print("[INFO] Gathering snapshot...")
    snapshot = gather_snapshot()

    # Count available sources
    available = sum(1 for v in snapshot.values() if isinstance(v, dict) and v.get("available"))
    total_sources = len(snapshot) - 1  # exclude timestamp
    print(f"[INFO] Snapshot gathered: {available}/{total_sources} sources available")

    # 2. Reason
    print("[INFO] Generating brief via local LLM...")
    brief = reason(snapshot)
    print(f"[INFO] Brief generated ({len(brief)} chars)")

    # 3. Deliver
    print("[INFO] Delivering to Telegram...")
    ok = deliver(brief)

    if ok:
        print("[PASS] Situation brief complete")
        return 0
    else:
        print("[FAIL] Situation brief failed at delivery", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
