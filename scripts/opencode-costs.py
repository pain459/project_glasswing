#!/usr/bin/env python3
"""
opencode-costs.py - Token usage and cost from the LiteLLM gateway.

OpenCode routes every request through LiteLLM. LiteLLM prices each call with the
electricity-based rates in stacks/litellm/litellm_config.yaml and writes the
result to Postgres. This script reads that ledger instead of estimating costs
from OpenCode session stats.

The dollar values represent estimated electricity expenditure, not cloud API
costs. Cloud prices are shown only for comparison.

Environment:
  LITELLM_URL         Gateway base URL (default http://192.168.68.62:3035)
  LITELLM_MASTER_KEY  Gateway key. Falls back to
                      stacks/litellm/litellm-config.registry.

Usage:
  ./opencode-costs.py
  ./opencode-costs.py --days 7
  ./opencode-costs.py --json
"""

import json
import os
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

DEFAULT_URL = "http://192.168.68.62:3035"
REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY = REPO_ROOT / "stacks" / "litellm" / "litellm-config.registry"

# ── Comparison pricing: what the same tokens would cost on cloud providers ──
# Approximate equivalents for a ~27B-34B parameter coding model.
# All rates per 1M tokens, October 2026.
COMPARISON_PROVIDERS = {
    "Qwen 3.6 Plus": (0.50, 3.00),    # Alibaba Cloud, <=256K context
    "Claude Sonnet 5": (2.00, 10.00),  # Anthropic
    "GPT-4o": (2.50, 10.00),           # OpenAI
    "Gemini 2.0 Pro": (1.25, 7.50),    # Google, <=128K context
}


def master_key() -> str:
    """Resolve the LiteLLM master key from the environment or local registry."""
    key = os.environ.get("LITELLM_MASTER_KEY", "").strip()
    if key:
        return key
    if REGISTRY.is_file():
        for line in REGISTRY.read_text(encoding="utf-8").splitlines():
            if line.startswith("LITELLM_MASTER_KEY="):
                return line.split("=", 1)[1].strip()
    sys.exit(
        "Error: LITELLM_MASTER_KEY is unset and "
        f"{REGISTRY.relative_to(REPO_ROOT)} was not found."
    )


def fetch_logs(base_url: str, key: str) -> list[dict]:
    """Fetch per-request spend logs from the LiteLLM proxy."""
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/spend/logs",
        headers={"Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        sys.exit(f"Error: LiteLLM returned HTTP {exc.code} for /spend/logs")
    except urllib.error.URLError as exc:
        sys.exit(f"Error: cannot reach LiteLLM at {base_url}: {exc.reason}")

    if not isinstance(payload, list):
        sys.exit("Error: unexpected /spend/logs response shape")
    return payload


def parse_timestamp(value: str | None) -> datetime | None:
    """Parse LiteLLM ISO timestamps, which may end in Z or carry an offset."""
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def aggregate(logs: list[dict], cutoff: datetime) -> dict:
    """Aggregate spend logs by model group within the cutoff window."""
    models: dict[str, dict] = defaultdict(
        lambda: {
            "requests": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "spend": 0.0,
        }
    )
    earliest = None
    latest = None

    for entry in logs:
        created = parse_timestamp(entry.get("created_at") or entry.get("startTime"))
        if created is None or created < cutoff:
            continue

        # Health checks and model listings are logged as spend entries with no
        # model group. Only inference calls belong in the usage report.
        group = entry.get("model_group")
        if not group:
            continue

        row = models[group]
        row["requests"] += 1
        row["prompt_tokens"] += entry.get("prompt_tokens") or 0
        row["completion_tokens"] += entry.get("completion_tokens") or 0
        row["total_tokens"] += entry.get("total_tokens") or 0
        row["spend"] += entry.get("spend") or 0.0

        earliest = created if earliest is None or created < earliest else earliest
        latest = created if latest is None or created > latest else latest

    return {
        "from": earliest,
        "to": latest,
        "models": dict(sorted(models.items())),
    }


def format_tokens(count: int) -> str:
    if count >= 1_000_000:
        return f"{count / 1_000_000:.1f}M"
    if count >= 1_000:
        return f"{count / 1_000:.0f}K"
    return str(count)


def format_cost(dollars: float) -> str:
    if dollars >= 1:
        return f"${dollars:.2f}"
    if dollars >= 0.01:
        return f"${dollars:.3f}"
    if dollars >= 0.0001:
        return f"${dollars:.4f}"
    return f"${dollars:.6f}"


def build_report(data: dict, days: int) -> dict:
    """Add totals and cloud comparison costs to the aggregated data."""
    totals = {
        "requests": 0,
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
        "spend": 0.0,
    }
    for row in data["models"].values():
        for key in totals:
            totals[key] += row[key]

    comparison = {}
    for name, (input_price, output_price) in COMPARISON_PROVIDERS.items():
        comparison[name] = round(
            (totals["prompt_tokens"] / 1_000_000) * input_price
            + (totals["completion_tokens"] / 1_000_000) * output_price,
            6,
        )

    return {
        "gateway": "litellm",
        "window_days": days,
        "from": data["from"].isoformat() if data["from"] else None,
        "to": data["to"].isoformat() if data["to"] else None,
        "totals": totals,
        "models": data["models"],
        "cloud_comparison": comparison,
    }


def pretty_print(report: dict) -> None:
    totals = report["totals"]
    start = report["from"][:10] if report["from"] else "no data"
    end = report["to"][:10] if report["to"] else "no data"

    print("=" * 64)
    print("  OpenCode Token Usage (via LiteLLM)")
    print("=" * 64)
    print(f"  Period: {start} → {end}  (last {report['window_days']} days)")
    print(f"  Requests: {totals['requests']}")
    print()
    print(f"  Input tokens:   {format_tokens(totals['prompt_tokens']):>8}")
    print(f"  Output tokens:  {format_tokens(totals['completion_tokens']):>8}")
    print(f"  Total tokens:   {format_tokens(totals['total_tokens']):>8}")
    print()

    if report["models"]:
        print("  Per-model usage:")
        print("  " + "-" * 60)
        print(
            f"  {'Model':<24} {'Requests':>8} {'Input':>8} {'Output':>8} {'Cost':>10}"
        )
        print("  " + "-" * 60)
        for name, row in report["models"].items():
            print(
                f"  {name[:24]:<24} {row['requests']:>8} "
                f"{format_tokens(row['prompt_tokens']):>8} "
                f"{format_tokens(row['completion_tokens']):>8} "
                f"{format_cost(row['spend']):>10}"
            )
        print("  " + "-" * 60)

    print()
    print(f"  Electricity cost: {format_cost(totals['spend'])}")
    print()

    if totals["total_tokens"]:
        print("  What the same tokens would cost on cloud providers:")
        print("  " + "-" * 60)
        print(f"  {'Provider':<20} {'Cost':>10} {'vs Local':>12}")
        print("  " + "-" * 60)
        best_name = ""
        best_cost = 0.0
        for name, cost in report["cloud_comparison"].items():
            ratio = cost / totals["spend"] if totals["spend"] else 0
            print(f"  {name:<20} {format_cost(cost):>10} {ratio:>11.0f}x")
            if cost > best_cost:
                best_cost = cost
                best_name = name
        print("  " + "-" * 60)
        if best_name:
            print(
                f"  💸 {format_cost(best_cost - totals['spend'])} saved "
                f"vs {best_name}"
            )
    print("=" * 64)


def main() -> None:
    days = 30
    as_json = False
    args = sys.argv[1:]
    index = 0
    while index < len(args):
        arg = args[index]
        if arg in ("--json", "-j"):
            as_json = True
        elif arg in ("--help", "-h"):
            print(__doc__)
            return
        elif arg in ("--days", "-d"):
            index += 1
            if index >= len(args) or not args[index].isdigit():
                sys.exit("Error: --days requires a positive integer")
            days = int(args[index])
        elif arg.startswith("--days="):
            value = arg.split("=", 1)[1]
            if not value.isdigit():
                sys.exit("Error: --days requires a positive integer")
            days = int(value)
        else:
            sys.exit(f"Error: unknown argument '{arg}'")
        index += 1

    base_url = os.environ.get("LITELLM_URL", DEFAULT_URL)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    logs = fetch_logs(base_url, master_key())
    report = build_report(aggregate(logs, cutoff), days)

    if as_json:
        print(json.dumps(report, indent=2, default=str))
    else:
        pretty_print(report)


if __name__ == "__main__":
    main()
