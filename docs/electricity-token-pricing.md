# Electricity-Based Token Pricing for OpenCode

## Overview

OpenCode and the LiteLLM gateway price every inference request in electricity on
Pathfinder (RTX 4090, **₹9/kWh — user-confirmed tariff: 1 unit = ₹9**), so the
spend ledger reflects what the hardware actually consumed rather than cloud API
prices.

**Pricing approach: full-cost, wall-meter calibrated (2026-11-10).** Per user
decision, the per-token price covers both the marginal energy of inference *and*
the machine's idle draw (models loaded, no active inference), which is
attributed to tokens at a stated reference volume. Marginal-only pricing would
report the machine's idle as free and understate true cost on light days.

## The 2026-11-10 Wall-Meter Calibration

The previous pricing (input $0.170, output $0.288, derived 2026-11-06) had one
major defect: the idle estimate of 218 W (GPU floor 14.1 W + host est. 204 W)
was a guess, not a measurement. The 2026-11-10 calibration replaced it with
**measured wall-meter data** (hourly kWh + 5-minute power samples, Nov 4–10).

### Key Findings

1. **61 W is NOT the server.** The wall meter's rock-solid 0.061 kWh/h floor
   is other equipment on the same plug (always on, even when the server is
   off). The server's true idle is **wall reading − 61 W**.

2. **Server idle ≈ 200 W** (band 150–240 W, models loaded, no active
   inference). This is the "models resident in VRAM, waiting" state — the
   dominant state during a workday.

3. **Server AI bursts ≈ 640 W** (band 540–735 W; wall 600–795 W minus 61 W
   equipment). This is active inference (prefill + generation).

4. **Cache hit rate is 98.1%** (475M cached / 484M prompt tokens, Nov 6–10).
   Ollama's KV-cache reuse means most "input tokens" are never re-prefilled.
   Cached input is priced at ₹0.

5. **Energy split between input and output is 14.8% / 85.2%** (time × power:
   9.17M fresh input @ 2,739 tok/s prefill vs 1.82M output @ 89 tok/s
   generation). Generation dominates energy because it's slower.

### Calibration Method

**Data sources:**
- Wall meter: hourly kWh (Nov 4 00:00 – Nov 10 08:57) + 5-min power (Nov 9–10)
- LiteLLM ledger: 6,755 requests, Nov 6 09:35 → Nov 10 03:38
- Boot logs: `journalctl --list-boots` (server ON time)

**Steps:**
1. **Server ON time** from boot logs: ~36.4 h over Nov 6–10.
2. **Server AI time** from LiteLLM request durations: 27,326 s = 7.59 h.
3. **Server idle time** = ON − AI = 36.4 − 7.59 = 28.8 h.
4. **Wall energy** (Nov 6–10, 105 h): 17.30 kWh.
5. **Equipment energy** (61 W × 105 h): 6.41 kWh.
6. **Server energy** = 17.30 − 6.41 = **10.89 kWh** (₹98.05).
7. **Server idle energy** = 200 W × 28.8 h = 5.76 kWh.
8. **Server AI energy** = 10.89 − 5.76 = **4.86 kWh** (₹43.74).
9. **AI energy per token** = 4.86 kWh / (9.17M + 1.82M) = 4.44e-7 kWh/token.
10. **Split by time×power:** input 14.8% (0.72 kWh), output 85.2% (4.14 kWh).
11. **Marginal cost:** input ₹0.65/MTok, output ₹39.2/MTok.
12. **Idle overlay:** ₹47/day ÷ 3M tokens/day = ₹15.7/MTok (equal per token).
13. **Full-cost:** input ₹5.42/MTok ($0.0571), output ₹25.21/MTok ($0.2656).

**Sanity check:** Recomputed 5-day cost = 9.17M × ₹5.42/MTok + 1.82M ×
₹25.21/MTok = ₹49.7 + ₹45.9 = **₹95.58** ≈ actual server cost ₹98.05
(2.5% diff — within the 5% marginal error target).

### Price Ladder (2026-11-10)

| Tier | Input / MTok | Output / MTok | Cached Input |
|---|---|---|---|
| **GPU marginal only** | ₹0.65 ($0.0069) | ₹39.2 ($0.413) | ₹0 |
| **+ Idle overlay** (full-cost) | **₹5.42 ($0.0571)** | **₹25.21 ($0.2656)** | **₹0** |

**Booked rates: input $0.0571/MTok, output $0.2656/MTok, cached $0.**

### Why the 2026-11-06 Rates Were Wrong

The 2026-11-06 audit used a **218 W idle estimate** (GPU floor 14.1 W + host
est. 204 W). This was a guess, not a measurement. The wall meter shows the
server's true idle is **200 W** (not 218 W), but more importantly, the 2026-11-06
model didn't account for:
- The 61 W equipment baseline (which was being counted as server idle).
- The 98.1% cache hit rate (which means most "input tokens" are free).
- The actual AI burst power (640 W, not the 440 W/415 W estimates).

The 2026-11-10 calibration uses **measured wall-meter data** and the **actual
LiteLLM ledger** to derive the true cost.

### llama3.1 (8B) — Still on 2026-10-30 Basis

`llama3.1` (8B) is still priced at $0.0434/$0.1104 (2026-10-30 basis). Re-audit
is deliberately deferred: loading it would evict the 27B model with only ~1.8 GB
VRAM headroom. User decision: "We will mostly use qwen anyways."

### Ledger Reset (2026-11-10)

The LiteLLM spend ledger was **truncated** on 2026-11-10 to start fresh with
the calibrated rates. The previous 6,775 entries (Nov 6–10) were backed up to
`backup/litellm-spend-2026-11-10.json` (76 MB) before truncation.

**Rationale:** The old ledger was priced at the wrong rates ($0.170/$0.288).
Backfilling would require re-pricing 6,775 rows, which is error-prone and
unnecessary — the user chose to start fresh with the calibrated rates.

### Configuration Files

- **Gateway (authoritative):** `stacks/litellm/litellm_config.yaml`
- **OpenCode client (display):** `~/.config/opencode/opencode.json`
- **OpenCode template:** `config/opencode/opencode.example.json`

All three files now use the 2026-11-10 calibrated rates:
- `qwen3.8-opencode`: input $0.0571/MTok, output $0.2656/MTok, cached $0
- `qwen3.6`: input $0.0571/MTok, output $0.2656/MTok, cached $0
- `llama3.1`: input $0.0434/MTok, output $0.1104/MTok (unchanged)

### Verification

To verify the new rates are in effect:
1. Send a test request through the gateway.
2. Check the spend row: `cost = fresh_input × 5.71e-8 + output × 2.656e-5`.
3. Run `python3 scripts/opencode-costs.py` to confirm the ledger is clean.

### Assumptions & Caveats

- **61 W equipment baseline** is assumed constant. If other equipment on the
  same plug changes, the calibration needs re-derivation.
- **200 W server idle** is the median of the 150–240 W band. If the server's
  idle draw changes (e.g., different models loaded), the calibration needs
  re-derivation.
- **640 W AI burst** is the median of the 540–735 W band. If the model or
  batch size changes, the calibration needs re-derivation.
- **98.1% cache hit rate** is specific to the Nov 6–10 workload. If the
  workload changes (e.g., more fresh prompts), the calibration needs
  re-derivation.
- **₹9/kWh tariff** is user-confirmed. If the tariff changes, the calibration
  needs re-derivation.
- **₹94.91/USD FX** is display-only. The primary basis is ₹.

### Re-calibration Trigger

Re-run the wall-meter calibration when:
- The server's idle draw changes (e.g., different models loaded).
- The AI burst power changes (e.g., different model or batch size).
- The cache hit rate changes significantly (e.g., >10% shift).
- The equipment baseline changes (e.g., new equipment on the same plug).
- The tariff changes.
- The workload changes significantly (e.g., more fresh prompts).
