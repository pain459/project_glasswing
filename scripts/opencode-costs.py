#!/usr/bin/env python3
"""
opencode-costs.py - Show equivalent cloud costs for local OpenCode token usage.

Fetches session stats from the OpenCode API and calculates what you'd pay
if you were using comparable models via cloud API instead of running locally.

Shows costs across multiple providers for comparison:
  - Qwen 3.6 Plus (Alibaba Cloud Model Studio)
  - Claude Sonnet 5 (Anthropic)
  - GPT-4o (OpenAI)
  - Gemini 2.0 Pro (Google)

All pricing per 1M tokens, October 2026 rates.

Usage:
  ./opencode-costs.py
  ./opencode-costs.py --pretty
  ./opencode-costs.py --json
"""

import json
import subprocess
import sys
from datetime import datetime, timezone

# ── Actual pricing for models you're running ──
# qwen3.6-opencode is a fine-tune of qwen3.6, so we use qwen3.6-plus pricing.
# qwen3.6-resilient is also based on qwen3.6.
# qwen3.6:27b is the base model, same family.
PRICING = {
    # Pattern: (input $/MTok, output $/MTok)
    # Using the ≤256K tier (most common for coding sessions)
    "qwen3.6": (0.50, 3.00),
    # If you add other models, add their pricing here:
    # "qwen3.5": (0.40, 2.40),
}

DEFAULT_PRICING = (0.50, 3.00)  # fallback for unrecognized Qwen 3.6 variants

# ── Comparison pricing: what you'd pay on other cloud providers ──
# These are approximate equivalents for a ~27B-34B parameter coding model.
# All rates per 1M tokens, October 2026.
COMPARISON_PROVIDERS = {
    "Qwen 3.6 Plus": (0.50, 3.00),   # Alibaba Cloud, ≤256K context
    "Claude Sonnet 5": (2.00, 10.00), # Anthropic (rate freeze since Aug 2026)
    "GPT-4o": (2.50, 10.00),         # OpenAI
    "Gemini 2.0 Pro": (1.25, 7.50),  # Google, ≤128K context
}


def get_stats():
    """Fetch session stats from OpenCode API."""
    result = subprocess.run(
        ["opencode", "api", "get", "/api/experimental/session/stats"],
        capture_output=True, text=True, timeout=10,
    )
    if result.returncode != 0:
        print(f"Error: opencode api returned {result.returncode}", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def find_pricing(model_id: str):
    """Look up pricing for a model by pattern matching."""
    model_lower = model_id.lower()
    for pattern, price in PRICING.items():
        if pattern in model_lower:
            return price
    return DEFAULT_PRICING


def format_tokens(n: int) -> str:
    """Format token count with K/M suffix."""
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    elif n >= 1_000:
        return f"{n / 1_000:.0f}K"
    return str(n)


def format_cost(dollars: float) -> str:
    """Format dollar amount."""
    if dollars >= 1:
        return f"${dollars:.2f}"
    elif dollars >= 0.01:
        return f"${dollars:.3f}"
    elif dollars >= 0.0001:
        return f"${dollars:.4f}"
    return f"${dollars:.5f}"


def pretty_print(stats: dict):
    """Print a nice summary with costs across providers."""
    data = stats["data"]
    models = data.get("models", [])
    range_info = data.get("range", {})

    # Date range
    from_ts = range_info.get("from", 0)
    to_ts = range_info.get("to", 0)
    if from_ts and to_ts:
        from_dt = datetime.fromtimestamp(from_ts / 1000, tz=timezone.utc)
        to_dt = datetime.fromtimestamp(to_ts / 1000, tz=timezone.utc)
        date_range = f"{from_dt.strftime('%Y-%m-%d')} → {to_dt.strftime('%Y-%m-%d')}"
    else:
        date_range = "unknown"

    print("=" * 62)
    print("  OpenCode Token Usage & Equivalent Cloud Costs")
    print("=" * 62)
    print(f"  Period: {date_range}")
    print(f"  Sessions: {data.get('sessions', '?')}  |  "
          f"Prompts: {data.get('prompts', '?')}  |  "
          f"Steps: {data.get('steps', '?')}")
    print()

    grand_input = 0
    grand_output = 0
    grand_cache_read = 0

    for m in models:
        model_info = m.get("model", {})
        tok = m.get("tokens", {})
        in_t = tok.get("input", 0)
        out_t = tok.get("output", 0)
        cache_r = tok.get("cache", {}).get("read", 0)
        steps = m.get("steps", 0)

        grand_input += in_t
        grand_output += out_t
        grand_cache_read += cache_r

        model_name = model_info.get("id", "unknown")
        provider = model_info.get("providerID", "?")

        print(f"  Model: {model_name}")
        print(f"    Provider: {provider}  |  Steps: {steps}")
        print(f"    Input tokens:  {format_tokens(in_t):>8}")
        print(f"    Output tokens: {format_tokens(out_t):>8}")
        if cache_r:
            print(f"    Cache reads:   {format_tokens(cache_r):>8}")
        print()

    print("-" * 62)
    print(f"  TOTAL tokens:  {format_tokens(grand_input + grand_output)}")
    print(f"    Input:  {format_tokens(grand_input)}")
    print(f"    Output: {format_tokens(grand_output)}")
    if grand_cache_read:
        print(f"    Cache reads: {format_tokens(grand_cache_read)}")
    print()

    # ── Comparison table across providers ──
    print("  What you'd pay on cloud providers:")
    print("  " + "-" * 58)
    header = f"  {'Provider':<20} {'Input Cost':>10} {'Output Cost':>11} {'Total':>10}"
    print(header)
    print("  " + "-" * 58)

    max_savings = 0
    max_savings_provider = ""
    for provider_name, (inp_price, out_price) in COMPARISON_PROVIDERS.items():
        inp_cost = (grand_input / 1_000_000) * inp_price
        out_cost = (grand_output / 1_000_000) * out_price
        total_cost = inp_cost + out_cost

        print(f"  {provider_name:<20} {format_cost(inp_cost):>10}  {format_cost(out_cost):>10}  {format_cost(total_cost):>10}")

        if total_cost > max_savings:
            max_savings = total_cost
            max_savings_provider = provider_name

    print("  " + "-" * 58)
    print(f"  {'🏠 Local (Ollama)':<20} {'$0.00':>10}  {'$0.00':>10}  {'$0.00':>10}")
    print()

    # Use the most expensive provider as the "you saved" benchmark
    print(f"  💸 You saved up to {format_cost(max_savings)} vs {max_savings_provider}")
    print(f"  🏠 Running locally via Ollama = $0.00")
    print("=" * 62)

    # Per-day breakdown using the Qwen baseline (actual equivalent)
    qwen_inp, qwen_out = COMPARISON_PROVIDERS.get("Qwen 3.6 Plus", DEFAULT_PRICING)
    qwen_cost = (grand_input / 1_000_000) * qwen_inp + (grand_output / 1_000_000) * qwen_out

    activity = data.get("activity", [])
    if activity:
        total_steps = sum(a.get("steps", 0) for a in activity)
        if total_steps and qwen_cost:
            cost_per_step = qwen_cost / total_steps
            print(f"\n  ~{format_cost(cost_per_step)} per step on average (Qwen baseline)")
            print(f"  ~{format_cost(qwen_cost / max(data.get('activeDays', 1), 1))} per day")


def main():
    mode = "pretty"
    for arg in sys.argv[1:]:
        if arg in ("--json", "-j"):
            mode = "json"
        elif arg in ("--help", "-h"):
            print(__doc__)
            sys.exit(0)

    stats = get_stats()

    if mode == "json":
        # Add computed costs across all providers to the JSON output
        data = stats["data"]
        total_input = sum(m.get("tokens", {}).get("input", 0) for m in data.get("models", []))
        total_output = sum(m.get("tokens", {}).get("output", 0) for m in data.get("models", []))

        provider_costs = {}
        for provider_name, (inp_price, out_price) in COMPARISON_PROVIDERS.items():
            cost = (total_input / 1_000_000) * inp_price + (total_output / 1_000_000) * out_price
            provider_costs[provider_name] = round(cost, 6)

        # Per-model costs using actual pricing
        for m in data.get("models", []):
            tok = m.get("tokens", {})
            in_t = tok.get("input", 0)
            out_t = tok.get("output", 0)
            input_price, output_price = find_pricing(
                m.get("model", {}).get("id", "")
            )
            cost = (in_t / 1_000_000) * input_price + (out_t / 1_000_000) * output_price
            m["estimated_cost"] = round(cost, 6)

        data["provider_comparison_costs"] = provider_costs
        data["estimated_total_cost"] = provider_costs.get("Qwen 3.6 Plus", 0)
        print(json.dumps(stats, indent=2))
    else:
        pretty_print(stats)


if __name__ == "__main__":
    main()
