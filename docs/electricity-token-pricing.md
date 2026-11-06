# Electricity-Based Token Pricing for OpenCode

## Overview

OpenCode and the LiteLLM gateway price every inference request in electricity on
Pathfinder (RTX 4090, **₹9/kWh — user-confirmed tariff: 1 unit = ₹9**), so the
spend ledger reflects what the hardware actually consumed rather than cloud API
prices.

**Pricing approach: full-cost, uptime-inclusive (audited 2026-11-06).** Per
user decision, the per-token price covers both the marginal energy of inference
*and* the machine's nominal uptime (total-server idle: GPU floor + host), which
is attributed to tokens at a stated reference volume. Marginal-only pricing
would report the machine's ₹47/day idle as free and understate true cost on
light days.

## The 2026-10-30 Audit Findings

The previous pricing (input $0.0485, output $0.2063, derived 2026-10-30) had two
defects, found by reverse-engineering its own numbers:

1. **Internally inconsistent idle allocation.** The doc claimed idle energy is
   split between input and output "proportionally to their count" — which by
   arithmetic identity means an *equal per-token* adder. The booked prices
   instead implied ~93 W idle for output and ~229 W for input: output was priced
   against GPU-only idle, input against whole-system idle. Two different bases,
   one price pair.
2. **Stale throughput basis.** Prices used Qwen 3.6 @ 68 tok/s output /
   1,967 tok/s prefill (the 88%-GPU-residency era). The primary now runs
   100% residency: ~2,700 tok/s prefill, 75-113 tok/s generation.

## Idle-Power Discovery (measured 2026-11-06)

**The GPU idle floor is ~14.1 W whether models are loaded or not.** Verified by
unloading both models with `ollama stop` and sampling for 12 s: 14.1 W either
way. So *model residency itself has effectively zero power premium*; the old
"GPU idle ~80 W (model in VRAM)" row was a post-burst clock/power-decay
artifact (68 W observed for minutes after a burst, decaying to 14 W).

The real per-turn idle cost is the **decay tail**: after a burst, board power
stays elevated (~330 → 58 → 14 W) for ~20-46 s, costing ~0.3 Wh per turn —
worth ₹0.1/cluster. Negligible per token, kept in "busy" below.

## Measured Basis (RTX 4090 board power, nvidia-smi 0.35 s sampling)

| State | Power | Benchmark |
|---|---|---|
| Idle floor (models resident or unloaded) | 14.1 W | 12-sample sets both states |
| Prefill (prompt processing) | ~440 W @ ~2,700-2,800 tok/s | 18,942-token prompt |
| Generation | ~415 W @ 89 tok/s | 400- and 344-token benches (band: 75-113 tok/s) |
| Post-burst decay tail | ~0.3-1 kJ above floor, ~20-46 s | 2 trailing windows |
| Post-embed spike | ~58 W, ~seconds | embedder indexing a note |

GPU-marginal energy per token (kWh/MTok = W ÷ (3.6 × tok/s)):

| Direction | Energy | ₹/MTok | $/MTok (₹94.91/$) |
|---|---|---|---|
| Input  | 440/(3.6 × 2,739) = 0.045 | ₹0.40 | $0.0042 |
| Output | 415/(3.6 × 89) = 1.29 | ₹11.6 | $0.1224 |

## Uptime / Idle Overlay (whole server)

The machine runs 24/7 for ~30 services. Attribution basis (no wall meter —
estimates kept from the 2026-10-30 component study; RAPL is not readable on
this host without a new sudo rule):

| Component | Power | Energy/day |
|---|---|---|
| GPU idle floor (measured) | 14.1 W | 0.34 kWh |
| Host + disks + fans + PSU idle (estimated, ex-GPU) | ~204 W | 4.9 kWh |
| **Total idle overlay** | **~218 W** | **≈ 5.23 kWh/day ≈ ₹47/day** |

Idle is a *day-level constant*. It can only become a per-token price by naming
a reference daily volume. Chosen: **3M tokens/day** (a solid coding day on the
7.19M-token measured day, lighter than record days). Overlay per MTok:
5.23 kWh ÷ 3M = 1.74 kWh/MTok → **₹15.7/MTok, equal per token**.

### Price Ladder (₹/MTok; overlay + marginal)

| Tokens/day | Overlay adder | Input full | Output full |
|---|---|---|---|
| 0.5M | ₹104.8 | ₹105.2 ($1.11) | ₹116.4 ($1.23) |
| 1M | ₹52.4 | ₹52.8 ($0.55) | ₹64.0 ($0.67) |
| 2M | ₹26.2 | ₹26.6 ($0.28) | ₹37.8 ($0.40) |
| **3M (booked)** | **₹15.7** | **₹16.1 ($0.170)** | **₹27.3 ($0.288)** |
| 7.2M (2026-11-06 actual) | ₹7.2 | ₹7.6 ($0.08) | ₹18.8 ($0.20) |

Note the honest reading: input full-cost is *overlay-dominated* (marginal is
only ₹0.40), so the input price is really a "machine uptime share" — it rises
as usage falls. Output stays marginal-dominated at every realistic volume.

## Booked Prices (in configs)

| Rate | Value |
|---|---|
| Input | $0.170/MTok (0.00000017 per token) |
| Output | $0.288/MTok (0.000000288 per token) |
| Basis | GPU-marginal (₹0.40/₹11.6) + ₹15.7 overlay, ref 3M tokens/day |

Booked for both `qwen3.8-opencode` (primary) and `qwen3.6` (failback, same
Modelfile budget → same power). `llama3.1` still carries the 2026-10-30 basis
($0.0434/$0.1104); re-audit pending — deliberately not re-benchmarked, because
loading the 8B model alongside the 27B (only ~1.8 GB free) risks eviction.

USD is display-only (₹94.91/$ as of Oct 2026). The ₹ figures are primary.

## Session Reality Check (2026-11-06)

The heavy coding day: 152 gateway requests → 11 agent turn-clusters, 7.19M
prompt tokens (median 48,362/turn, max 91,120), 8,150 completion tokens
(median 41/turn). GPU busy ≈ 0.33 kWh, idle overlay 5.23 kWh → ₹50 total.
At the booked (3M-reference) prices the ledger shows ₹115 for that day; the
truth was ₹50 and a light day under the same prices would overstate — the
ladder above is the calibration map. Median turns are prefill-dominated:
completion work (41 tokens/turn) is negligible against 48k-token prompts.

## How It Works

### Configuration

Each model in `/home/ravik/.config/opencode/opencode.json` has a `cost` block:

```json
"cost": {
  "input": 0.17,
  "output": 0.288,
  "cache_read": 0,
  "cache_write": 0
}
```

USD per million tokens; the gateway's `input_cost_per_token` /
`output_cost_per_token` are these divided by 1M.

### Calculation Formula

```
kwh_per_million_tokens = power_watts / (3.6 × tokens_per_second)
cost_inr = kwh_per_million_tokens × 9
cost_usd_param = cost_inr / 94.91
idle_overlay_per_million_tokens = (idle_watts × 24 / 1000) × 9 / (reference_Mtok_per_day)
```

## Assumptions & Limitations

1. **Whole-server idle IS included** (user decision, 2026-11-06). The ~204 W
   host estimate is shared by ~30 other services; if you later want
   GPU-attributable-only prices, use the marginal row (₹0.40/₹11.6) with no
   overlay.
2. **Host idle is estimated, not measured.** No wall meter; RAPL denied to this
   user. GPU numbers are measured. A plug meter reading should replace the
   204 W estimate when one is available.
3. **Reference volume 3M tokens/day** is a policy constant, not a law. Recheck
   against the ledger monthly-ish; the ladder shows prices at other volumes.
4. **Generation throughput band 75-113 tok/s.** Booked price uses 89 tok/s
   (measured with matched power sampling); faster output would lower the
   marginal ₹/MTok by up to ~30%.
5. **Cache reads are free** (KV-reuse; negligible power).
6. **FX ₹94.91/$** dates from Oct 2026 — display-only; verify before quoting
   USD externally.
7. **llama3.1 basis is stale** (2026-10-30) pending a safe re-benchmark.
8. **Embedding** (nomic-embed-text, 11 ms/note at 100% GPU): negligible, in
   "busy" but unpriced separately.

## Recalibration

1. Re-bench throughput with matched power sampling (0.3 s nvidia-smi sampler +
   one ~4k prefill + one 400-token generation request; see
   `/tmp/opencode/powerprobe` run of 2026-11-06 for the harness pattern).
2. Floor check: sample power for 12 s, then `docker exec glasswing-ollama
   ollama stop` both models, sample again (both should be ~14 W), then reload
   both and verify `/api/ps` residency.
3. Recompute the ladder, pick the reference volume, update
   `stacks/litellm/litellm_config.yaml` (authoritative), then mirror
   `/home/ravik/.config/opencode/opencode.json` and
   `config/opencode/opencode.example.json`.
4. `docker restart glasswing-litellm` (bind-mounted config reads at startup).
5. Verify: one gateway request, then compare the new spend row's `cost`
   against (input × prompt_tokens + output × completion_tokens).

## Files

| File | Purpose |
|---|---|
| `stacks/litellm/litellm_config.yaml` | Authoritative gateway rates |
| `/home/ravik/.config/opencode/opencode.json` | Active client cost display |
| `config/opencode/opencode.example.json` | Repo template (placeholder key) |
| `scripts/opencode-costs.py` | Reads the spend ledger, compares cloud costs |
| `/tmp/opencode/powerprobe/` | 2026-11-06 measurement artifacts (samples, results) |

## Verification

`python3 scripts/opencode-costs.py` shows ledger usage; totals match the
Admin UI at `http://192.168.68.62:3035/ui`. The 2026-11-06 audit is recorded
in Open Notebook ("Fix - project_glasswing - Electricity Pricing Idle
Amortization Inconsistent").
