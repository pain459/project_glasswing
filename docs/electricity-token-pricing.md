# Electricity-Based Token Pricing for OpenCode

## Overview

OpenCode and the LiteLLM gateway price every inference request in electricity on
Pathfinder (RTX 4090, **₹9/kWh — user-confirmed tariff: 1 unit = ₹9**), so the
spend ledger reflects what the hardware actually consumed rather than cloud API
prices.

**Pricing approach: full-cost, wall-meter calibrated (2026-11-15).** Per user
decision, the per-token price covers **all** wall draw from the socket —
equipment, server idle, and AI compute. Every unit of power draw is matched
to a token. Cached tokens are charged at a reduced rate (they keep the
equipment and server on for KV-cache warmth).

## The 2026-11-15 Wall-Meter Calibration

The 2026-11-10 calibration had two defects:
1. It **excluded** the 61W equipment baseline (only charged for server energy).
2. It **priced cached tokens at ₹0**, even though the equipment and server
   stay on to keep the KV cache warm.

The 2026-11-15 calibration fixes both: **all** wall draw is attributed to
tokens, and cached tokens carry their share of the idle cost.

### Key Findings

1. **Wall draw has three clear levels** (from hourly kWh, Nov 9–15):
   - **~41 W** (51 h): server OFF, equipment only
   - **~65 W** (30 h): server ON, idle (models loaded, no AI)
   - **>75 W** (82 h): server ON, AI active (prefill + generation)

2. **Server idle is ~24 W above equipment** (65W − 41W), not the 200 W
   estimated in the 2026-11-10 calibration.

3. **Cache hit rate is 95.8%** (116.8M cached / 121.9M prompt tokens,
   Nov 10–15). Ollama's KV-cache reuse means most "input tokens" are
   never re-prefilled. Cached tokens are now priced at ₹0.59/MTok
   (they keep the equipment + server on for cache warmth).

4. **AI compute time is 2.80 h** (10,082 s from request durations) over
   a 163 h period. The remaining 39.6 h of server-ON time is idle.

### Calibration Method

**Data sources:**
- Wall meter: hourly kWh (Nov 9 00:00 – Nov 15 18:00, 163 h)
- LiteLLM ledger: 1,725 requests, Nov 10 03:58 → Nov 15 13:02
  - 121.9M prompt tokens (116.8M cached, 5.1M fresh)
  - 610K completion tokens
  - 10,082 s total AI compute time
- Boot logs: `journalctl --list-boots` (server ON time: 42.4 h)

**Steps:**
1. **Wall energy** (Nov 9–15, 163 h): **19.075 kWh** = ₹171.68.
2. **Equipment energy** (41 W × 163 h): 6.68 kWh.
3. **Server idle energy** (24 W × 39.6 h): 0.95 kWh.
4. **AI compute energy** (remaining): 19.075 − 6.68 − 0.95 = **11.44 kWh**.
5. **AI compute split** (by time: fresh input 21.7%, output 78.3%):
   - Fresh input: 11.44 × 0.217 = 2.48 kWh
   - Output: 11.44 × 0.783 = 8.96 kWh
6. **Energy attribution:**
   - Cached tokens (116.83M) → equipment + idle = 7.63 kWh
   - Fresh input (5.12M) → prefill = 2.48 kWh
   - Output (0.61M) → generation = 8.96 kWh
7. **Rates:**
   - Cached: 7.63 × 9 / 116.83 = **₹0.59/MTok** ($0.0062)
   - Fresh input: 2.48 × 9 / 5.12 = **₹4.36/MTok** ($0.0459)
   - Output: 8.96 × 9 / 0.61 = **₹132.16/MTok** ($1.3925)

**Sanity check:** 116.83M × ₹0.59 + 5.12M × ₹4.36 + 0.61M × ₹132.16
= ₹68.71 + ₹22.31 + ₹80.66 = **₹171.68** = wall meter cost exactly. ✓

### Booked Rates (2026-11-15)

LiteLLM and OpenCode both define `cost_per_token` and `cost.*` as **USD** per
token (per million in the OpenCode config). Book USD; derive ₹ at ₹94.91/USD.

| Token type | ₹/MTok | $/MTok | Per-token (config, USD) |
|---|---|---|---|
| **Cached input** | ₹0.59 | $0.0062 | `0.0000000062` |
| **Fresh input** | ₹4.36 | $0.0459 | `0.0000000459` |
| **Output** | ₹132.16 | $1.3925 | `0.0000013925` |

> **Unit trap (fixed 2026-11-15).** The first booking of these rates stored the
> rupee figures *as* dollars — `0.0000043563` is ₹4.3563/MTok, not $4.3563/MTok.
> Because both fields are USD by definition, the ledger charged ₹-as-$ and
> overstated every qwen request by exactly 94.91×. `llama3.1` was booked
> correctly (`4.34e-8` = $0.0434/MTok), which is what exposed the mismatch.

### Why the 2026-11-10 Rates Were Wrong

1. **Excluded equipment:** The 61W equipment baseline was subtracted from
   the wall draw, so tokens only paid for server energy. But the equipment
   stays on for the tokens (cache warmth, network, storage).
2. **Cached tokens at ₹0:** 95.8% of prompt tokens are cached. Pricing them
   at zero meant the cost was spread over only 4.2% of tokens, distorting
   the input/output split.
3. **Overestimated server idle:** The 200 W idle estimate was 8x higher than
   the measured 24 W above equipment.

### llama3.1 (8B) — Still on 2026-10-30 Basis

`llama3.1` (8B) is still priced at $0.0434/$0.1104 (2026-10-30 basis). Re-audit
is deliberately deferred: loading it would evict the 27B model with only ~1.8 GB
VRAM headroom. User decision: "We will mostly use qwen anyways."

### Configuration Files

- **Gateway (authoritative):** `stacks/litellm/litellm_config.yaml`
- **OpenCode client (display):** `~/.config/opencode/opencode.json`
- **OpenCode template:** `config/opencode/opencode.example.json`

All three files now use the 2026-11-15 calibrated rates:
- `qwen3.8-opencode`: input $0.0459/MTok, output $1.3925/MTok, cached $0.0062/MTok
- `qwen3.6`: input $0.0459/MTok, output $1.3925/MTok, cached $0.0062/MTok
- `llama3.1`: input $0.0434/MTok, output $0.1104/MTok (unchanged)

### Historical Ledger Recalculation (2026-11-15)

Rows written before the unit fix carried ₹-as-$ amounts, so all qwen spend for
`startTime >= 2026-11-10` was recomputed in place:

```
spend = cached × 6.2e-9 + (prompt - cached) × 4.59e-8 + completion × 1.3925e-6
```

Applied to **every row** in `LiteLLM_SpendLogs` (all 1,797 priced rows; the whole
ledger starts 2026-11-10, so no pre-calibration rows exist), plus
`LiteLLM_DailyUserSpend` and `LiteLLM_DailyModelUsage`. No row is left on a
superseded rate card.

- **qwen3.8 / qwen3.6 / dolphin** → electricity card
  (`6.2e-9` / `4.59e-8` / `1.3925e-6`). The dolphin models are retired from
  `model_list`, but they ran on the same GPU and the wall meter cannot separate
  them, so the session card applies.
- **llama3.1** → its own live card (`4.34e-8` / `1.104e-7`, no cache rate).

Aggregates were rebuilt by re-deriving from `SpendLogs`; three 2026-11-10
health-check rows missing from the daily rollup were inserted. All three stores
now tie to the cent: **$1.867418 = ₹177.24**. The `Last30d*` / `Monthly*` tables
are views, so they recompute automatically.

Backups: `LiteLLM_SpendLogs_bak_20261115`, `LiteLLM_DailyUserSpend_bak_20261115`,
`LiteLLM_DailyModelUsage_bak_20261115`.

**Recalculated total (whole ledger, Nov 10 → present):**

| Model | Rows | USD | INR |
|---|---|---|---|
| qwen3.8-opencode | 1,755 | $1.84753 | ₹175.35 |
| qwen3.6 | 14 | $0.01503 | ₹1.43 |
| dolphin3 | 4 | $0.00398 | ₹0.38 |
| dolphin-nemo | 5 | $0.00087 | ₹0.08 |
| llama3.1 | 4 | $0.00001 | ₹0.00 |
| **Total** | **1,782** | **$1.86742** | **₹177.24** |

₹177.24 vs the ₹171.68 wall-meter reading is window mismatch, not error: the
meter was read at 18:00 on Nov 15 while the ledger runs to the last request,
and the ₹171.68 figure is the attribution target for the calibration set.

### Verification

To verify the new rates are in effect:
1. Send a test request through the gateway.
2. Check the spend row: `cost = cached × 6.2e-9 + fresh_input × 4.59e-8 + output × 1.3925e-6`, and confirm it is a plausible **dollar** amount (a ~24k-token cached request should cost roughly $0.0003, not $0.026).
3. Run `python3 scripts/opencode-costs.py` to confirm the ledger is clean.

### Assumptions & Caveats

- **41 W equipment baseline** is assumed constant. If other equipment on the
  same plug changes, the calibration needs re-derivation.
- **24 W server idle** (above equipment) is measured from the wall meter.
  If the server's idle draw changes (e.g., different models loaded), the
  calibration needs re-derivation.
- **95.8% cache hit rate** is specific to the Nov 10–15 workload. If the
  workload changes (e.g., more fresh prompts), the calibration needs
  re-derivation.
- **₹9/kWh tariff** is user-confirmed. If the tariff changes, the calibration
  needs re-derivation.
- **₹94.91/USD FX** is a fixed conversion in the booking. LiteLLM and OpenCode
  only accept USD, so USD is what is stored; ₹ remains the primary accounting
  basis and is derived as `USD × 94.91`. If the FX moves, restate ₹ — the kWh
  derivation and the USD figures stay valid.

### Re-calibration Trigger

Re-run the wall-meter calibration when:
- The server's idle draw changes (e.g., different models loaded).
- The AI compute power changes (e.g., different model or batch size).
- The cache hit rate changes significantly (e.g., >10% shift).
- The equipment baseline changes (e.g., new equipment on the same plug).
- The tariff changes.
- The workload changes significantly (e.g., more fresh prompts).
