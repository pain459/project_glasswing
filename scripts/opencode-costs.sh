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
# Power estimation (Ryzen 9 7950X + RTX 4090):
#   Marginal power during inference: ~280W
#   Inference speed: ~50 tokens/sec
#   Electricity: ₹9/kWh
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

# Power estimate
total_cache = data['tokens'].get('cache', {}).get('read', 0)
fresh_input = max(data['tokens']['input'] - total_cache, 0)
inf_tokens = fresh_input + data['tokens']['output']
inf_sec = inf_tokens / 50
energy = (inf_sec / 3600) * 0.28
data['power_estimate'] = {
    'machine': 'Ryzen 9 7950X + RTX 4090 (24GB)',
    'inference_seconds': round(inf_sec, 1),
    'energy_kwh': round(energy, 4),
    'electricity_cost_inr': round(energy * 9, 4),
    'electricity_cost_usd': round(energy * 9 / 84.5, 6),
}

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

# Power & electricity cost estimation
MARGINAL_W = 280
TOK_PER_S = 50
RATE_INR = 9
USD_PER_INR = 1 / 84.5

total_cache = tokens.get('cache', {}).get('read', 0)
fresh_input = max(total_input - total_cache, 0)
inference_tokens = fresh_input + total_output
inf_seconds = inference_tokens / TOK_PER_S
energy_kwh = (inf_seconds / 3600) * (MARGINAL_W / 1000)
elec_inr = energy_kwh * RATE_INR
elec_usd = elec_inr * USD_PER_INR

def inr_fmt(c):
    if c >= 1: return f'₹{c:.2f}'
    return f'₹{c:.3f}'

print()
print('  ⚡ Power & Electricity Cost (local inference)')
print('  ' + '-' * 56)
print(f'  Machine: Ryzen 9 7950X + RTX 4090 (24GB)')
print(f'  Inference time:      {inf_seconds/60:.1f} min ({inf_seconds:.0f} s)')
print(f'  Marginal energy:     {energy_kwh:.3f} kWh')
print(f'  Electricity cost:    {inr_fmt(elec_inr)} ({dollar(elec_usd)})')
print(f'  Rate: ₹{RATE_INR}/kWh, ~{MARGINAL_W}W marginal, ~{TOK_PER_S} tok/s')
print('  ' + '-' * 56)

net_usd = max_cost - elec_usd
net_inr = net_usd / USD_PER_INR
print()
print(f'  💰 Net savings (vs {max_provider}):')
print(f'     Cloud cost:      {dollar(max_cost)}')
print(f'     Electricity:     -{dollar(elec_usd)} ({inr_fmt(elec_inr)})')
print(f'     Net saved:       {dollar(net_usd)} ({inr_fmt(net_inr)})')
if elec_usd > 0:
    print(f'     ROI:               {max_cost/elec_usd:.0f}x')
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
