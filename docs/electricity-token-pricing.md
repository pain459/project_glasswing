# Electricity-Based Token Pricing for OpenCode

## Overview

OpenCode is configured to display estimated dollar costs for local Ollama inference, based on measured electricity consumption on Pathfinder (RTX 4090, ₹9/kWh tariff) rather than commercial API prices.

**Pricing approach: Full-cost.** Each per-token price amortizes both active inference power *and* the model-loaded idle time between turns (when the GPU sits at ~80 W keeping the model in VRAM while you read and respond). This is more honest than marginal-only pricing, which would ignore ~60% of the actual electricity consumed.

## How It Works

### Configuration

Each model in `/home/ravik/.config/opencode/opencode.json` has a `cost` block:

```json
"cost": {
  "input": 0.0485,
  "output": 0.2063,
  "cache_read": 0,
  "cache_write": 0
}
```

These values represent **estimated USD cost per million tokens**, derived from:
1. Measured GPU power draw during inference (`nvidia-smi`)
2. Estimated whole-system power (CPU, RAM, fans, PSU)
3. Measured token throughput via Ollama API benchmarks
4. Indian electricity tariff of ₹9/kWh
5. USD/INR exchange rate of 94.91
6. Assumed 45 s model-loaded idle time per turn

### Calculation Formula

```
seconds_per_million_tokens = 1,000,000 / tokens_per_second
kwh_per_million_tokens = (power_watts / 1000) * (seconds_per_million_tokens / 3600)
cost_inr = kwh_per_million_tokens * 9
cost_usd = cost_inr / 94.91
```

The idle energy per turn is split between input and output tokens proportionally to their count, then added to the active inference cost.

## Full-Cost vs. Marginal-Only

| Model | Approach | Input $/MTok | Output $/MTok |
|---|---|---|---|
| Qwen 3.6 27B | Marginal-only | 0.0032 | 0.0958 |
| Qwen 3.6 27B | **Full-cost** | **0.0485** | **0.2063** |
| Llama 3.1 8B | Marginal-only | 0.0002 | 0.0396 |
| Llama 3.1 8B | **Full-cost** | **0.0434** | **0.1104** |

Full-cost is ~5-20× higher because it captures the GPU sitting idle with the model loaded in VRAM between your turns.

## Benchmark Results (2026-10-30)

### Hardware

| Component | Model |
|---|---|
| CPU | AMD Ryzen 9 7950X (16-core) |
| GPU | MSI RTX 4090 Ventus 3X OC 24GB |
| RAM | Corsair 64GB DDR5 6000MHz (4×16GB) |
| Mobo | MSI X670E Tomahawk WiFi |
| Cooling | Corsair H150i AIO + 6× Arctic P12 Max fans |
| Storage | 2× Samsung 990 Pro 2TB NVMe + 1× WD 4TB HDD |
| PSU | Corsair HX1200i Platinum |
| Case | Hyte Y70 Black |

### Power Measurements (nvidia-smi, 254 readings)

| Metric | Value |
|---|---|
| GPU idle (model in VRAM, 0% util) | ~80 W |
| GPU during inference (avg) | ~271 W |
| GPU marginal | ~191 W |
| Estimated system idle (whole machine) | ~218 W |
| Estimated system during inference | ~463 W |
| **Total marginal inference power** | **~245 W** |

### Throughput (warm model, median)

| Model | Input tok/s | Output tok/s |
|---|---|---|
| Qwen 3.6 27B | 1,967 | 66 |
| Llama 3.1 8B | 32,412 | 160 |

### Derived Full-Cost Pricing

| Model | Input $/MTok | Output $/MTok | Input ₹/MTok | Output ₹/MTok |
|---|---|---|---|---|
| Qwen 3.6 27B | 0.0485 | 0.2063 | 4.61 | 19.58 |
| Llama 3.1 8B | 0.0434 | 0.1104 | 4.12 | 10.48 |

### Session-Level Example

A typical coding session (~20 turns, 5K input + 1K output tokens per turn, 45s idle between turns):

| | Qwen 3.6 27B |
|---|---|
| Active inference time | ~6 min |
| Model-loaded idle time | ~20 min |
| Total energy | ~0.005 kWh |
| Cost | ~₹0.04 / $0.0004 per turn |

## Assumptions & Limitations

1. **45s idle per turn.** This is a middle-ground estimate. Fast interactions (15s/turn) would halve the idle cost; slow deliberation (120s/turn) would triple it. The prices scale roughly linearly with idle time.

2. **5K input + 1K output per turn.** Typical for coding sessions. Sessions with much longer outputs (e.g., generating large files) will have different active/idle ratios.

3. **System power is estimated, not measured.** The ~218 W idle and ~463 W active figures combine measured GPU data with component-level estimates for CPU, RAM, fans, PSU, etc. A plug meter would give exact wall power.

4. **Output tokens dominate cost.** Generation is 30-200× slower than input processing, so output tokens account for most of the active inference cost.

5. **Cache reads are free.** KV cache lookups consume negligible power compared to full inference.

6. **Does not include base system overhead.** Pathfinder runs ~30 Docker services 24/7. The ~218 W idle baseline is shared across all services and not fully attributed to OpenCode.

7. **USD/INR rate.** The rate of 94.91 was current as of October 2026. Update if it changes significantly.

## Recalibration

To recalibrate pricing after hardware changes, model updates, or rate changes:

1. **Re-benchmark throughput:**
   ```bash
   python3 /tmp/benchmark_ollama.py
   ```

2. **Re-measure power:**
   ```bash
   nvidia-smi --query-gpu=timestamp,power.draw,utilization.gpu --format=csv -l 1
   ```
   Run during inference and during idle. Calculate the difference.

3. **Recalculate pricing** using the formula above.

4. **Update** `/home/ravik/.config/opencode/opencode.json` and `config/opencode/opencode.example.json`.

5. **Reload OpenCode:**
   ```bash
   opencode reload
   ```

## Files

| File | Purpose |
|---|---|
| `/home/ravik/.config/opencode/opencode.json` | Active OpenCode config with cost values |
| `config/opencode/opencode.example.json` | Repository reference copy |
| `scripts/opencode-costs.py` | Cost estimation and comparison script |

## Verification

Run `python3 scripts/opencode-costs.py` to see current session costs. The "Local (Ollama)" row shows nonzero electricity-based costs that include both active inference and model-loaded idle time.
