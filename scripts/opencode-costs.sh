#!/usr/bin/env bash
# opencode-costs.sh - Show equivalent cloud costs for local OpenCode token usage.
#
# Since Ollama runs locally for free, OpenCode reports $0 cost.
# This script computes what those same tokens would cost across multiple
# cloud providers, so you can see your savings.
#
# Pricing reference (per 1M tokens, October 2026):
#   Qwen 3.6 Plus:     input $0.50   output $3.00
#   Claude Sonnet 5:   input $2.00   output $10.00
#   GPT-4o:            input $2.50   output $10.00
#   Gemini 2.0 Pro:    input $1.25   output $7.50
#
# Usage:
#   ./scripts/opencode-costs.sh              # show summary
#   ./scripts/opencode-costs.sh --detail     # show per-model breakdown
#   ./scripts/opencode-costs.sh --json       # raw JSON output

set -euo pipefail

# --- Fetch stats from OpenCode ---
STATS=$(opencode api get /api/experimental/session/stats 2>/dev/null)

if [ -z "$STATS" ]; then
  echo "Error: could not fetch session stats. Is OpenCode running?"
  exit 1
fi

# --- JSON output mode ---
if [[ "${1:-}" == "--json" ]]; then
  echo "$STATS" | python3 -c "
import sys, json

providers = {
    'Qwen 3.6 Plus': (0.50, 3.00),
    'Claude Sonnet 5': (2.00, 10.00),
    'GPT-4o': (2.50, 10.00),
    'Gemini 2.0 Pro': (1.25, 7.50),
}

def calc_cost(t, inp_p, out_p):
    return (
        t['input'] * inp_p / 1e6
        + t['output'] * out_p / 1e6
    )

data = json.load(sys.stdin)['data']
total_input = data['tokens']['input']
total_output = data['tokens']['output']

provider_costs = {}
for name, (inp_p, out_p) in providers.items():
    provider_costs[name] = round(calc_cost(data['tokens'], inp_p, out_p), 4)

data['provider_comparison_costs'] = provider_costs
data['equivalent_cost'] = provider_costs.get('Qwen 3.6 Plus', 0)

for m in data['models']:
    m['equivalent_cost'] = round(calc_cost(m['tokens'], 0.50, 3.00), 4)

json.dump(data, sys.stdout, indent=2)
print()
"
  exit 0
fi

# --- Pretty output ---
echo "$STATS" | python3 -c "
import sys, json

providers = {
    'Qwen 3.6 Plus': (0.50, 3.00),
    'Claude Sonnet 5': (2.00, 10.00),
    'GPT-4o': (2.50, 10.00),
    'Gemini 2.0 Pro': (1.25, 7.50),
}

def calc_cost(t, inp_p, out_p):
    return (
        t['input'] * inp_p / 1e6
        + t['output'] * out_p / 1e6
    )

def fmt(t):
    if t >= 1e6: return f'{t/1e6:.1f}M'
    if t >= 1e3: return f'{t/1e3:.1f}K'
    return str(t)

def dollar(c):
    if c >= 1: return f'\${c:.2f}'
    if c >= 0.01: return f'\${c:.3f}'
    return f'\${c:.4f}'

data = json.load(sys.stdin)['data']
tokens = data['tokens']
total_input = tokens['input']
total_output = tokens['output']

print('=' * 60)
print('  OpenCode Token Usage & Equivalent Cloud Costs')
print('=' * 60)
print(f'  Sessions: {data[\"sessions\"]}  |  Prompts: {data[\"prompts\"]}  |  Steps: {data[\"steps\"]}')
print(f'  Active days: {data[\"activeDays\"]}')
print()
print(f'  Input tokens:   {fmt(total_input):>8}  ({total_input:,})')
print(f'  Output tokens:  {fmt(total_output):>8}  ({total_output:,})')
if tokens.get('cache', {}).get('read', 0):
    print(f'  Cache reads:    {fmt(tokens[\"cache\"][\"read\"]):>8}')
print()

# Comparison table
print('  What you\\'d pay on cloud providers:')
print('  ' + '-' * 56)
header = f'  {{\"Provider\":<20}} {{\"Input\":>10}} {{\"Output\":>10}} {{\"Total\":>10}}'
print(f'  {\"Provider\":<20} {\"Input Cost\":>10} {\"Output Cost\":>10} {\"Total\":>10}')
print('  ' + '-' * 56)

max_cost = 0
max_provider = ''
for name, (inp_p, out_p) in providers.items():
    inp_cost = total_input * inp_p / 1e6
    out_cost = total_output * out_p / 1e6
    total = inp_cost + out_cost
    print(f'  {name:<20} {dollar(inp_cost):>10}  {dollar(out_cost):>10}  {dollar(total):>10}')
    if total > max_cost:
        max_cost = total
        max_provider = name

print('  ' + '-' * 56)
print(f'  {\"Local (Ollama)\":<20} {\"\$0.00\":>10}  {\"\$0.00\":>10}  {\"\$0.00\":>10}')
print()
print(f'  You saved up to {dollar(max_cost)} vs {max_provider}')
print('=' * 60)

import os
if os.environ.get('DETAIL') or '--detail' in sys.argv:
    print()
    print('Per-model breakdown (Qwen pricing):')
    print('-' * 60)
    for m in data['models']:
        mid = m['model']['id']
        prov = m['model']['providerID']
        cost = calc_cost(m['tokens'], 0.50, 3.00)
        t = m['tokens']
        print(f'  {mid} ({prov})')
        print(f'    Steps: {m[\"steps\"]}  |  Input: {fmt(t[\"input\"])}  |  Output: {fmt(t[\"output\"])}')
        print(f'    Equivalent cost: {dollar(cost)}')
        print()
" -- \"${1:-}\"
