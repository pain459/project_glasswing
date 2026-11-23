# vLLM — LLM Inference (replaces Ollama)

vLLM serves Qwen 3.8 27B (primary) and Qwen 3.6 27B (failback) on the RTX 4090.
Replaces Ollama for all chat completions. Embeddings are handled by TEI (see `stacks/tei/`).

## Architecture

**Option C: one container per model, one awake at a time.**

| Model | Container | Compose profile | Port | Role |
|-------|-----------|-----------------|------|------|
| Qwen 3.8 27B | `glasswing-vllm-qwen38` | default | 3043 | Primary |
| Qwen 3.8 27B (4-bit KV) | `glasswing-vllm-qwen38-4bit` | `alt-4bit` | 3043 | Primary, alt profile |
| Qwen 3.6 27B | `glasswing-vllm-qwen36` | `failback` | 3044 | Failback |
| Qwen 3.6 27B (4-bit KV) | `glasswing-vllm-qwen36-4bit` | `failback-4bit` | 3044 | Failback, alt profile |
| Nemotron Nano 9B v2 | `glasswing-vllm-nemotron` | `lightweight` | 3045 | Not provisioned yet |

Profiles are **alternative backend configs of the same served model ID**, not
separate models. Both 3.8 services serve `qwen3.8-opencode`; both 3.6 services
serve `qwen3.6`. OpenCode's model selector therefore shows one entry per model,
not one per profile.

Sleeping containers keep weights in CPU RAM (~16GB each). Switching between
models takes ~2s (Level 1 sleep/wake) vs ~55s (process restart).

## Commands

```bash
# Start vLLM (primary model)
make up STACK=vllm

# Validation runs automatically after `make up`; to rerun it alone:
./stacks/vllm/post-up.sh

# List available models
make vllm-model list

# Show current model
make vllm-model current

# Switch to failback (both are 131K)
make vllm-model MODEL=qwen3.6

# Switch back to primary
make vllm-model MODEL=qwen3.8-opencode

# Opt-in 4-bit KV profiles (same model ID, more KV/VRAM headroom)
make vllm-model MODEL=qwen3.6-4bit
make vllm-model MODEL=qwen3.8-4bit

# GPU mode switching
make gpu-comfyui    # sleep vLLM, start ComfyUI
make gpu-vllm       # stop ComfyUI, wake the default vLLM model
make gpu-status     # show who owns the GPU
```

### Exclusivity

Only one vLLM service should ever be awake. Every switch sleeps all other
registry models first:

- `switch-model.sh` sleeps awake models on other ports, stops models sharing the
  target port, and stops any container that is `restarting` or unresponsive
  (those still hold VRAM and cause the next start to fail with a
  `Free memory ... less than desired GPU memory utilization` error).
- `gpu-mode.sh vllm` does the same before waking the default: sleep everyone
  else, then wake or restart the target.
- `gpu-mode.sh comfyui` sleeps every vLLM model and stops any that cannot reach
  a clean sleep.

A container that is running but cannot confirm `{"is_sleeping": true}` is
treated as unsafe and stopped, not trusted.

## OpenCode model selector

OpenCode shows one entry per **served model ID**, not per KV profile:

```
litellm/qwen3.8-opencode
litellm/qwen3.6
litellm/llama3.1
```

Pick with `/models` in the TUI, or `opencode run --model litellm/qwen3.6 "..."`
for a one-off run. `/reload` refreshes the catalog after config edits. Both
clients cap input at 122,880 tokens (131,072 − 8,192 output reserve);
auto-compaction at 80% is unchanged.

### Automatic backend switching

Model selection is wired to the backend through the project-local plugin
`.opencode/plugins/vllm-autoswitch.ts`. It hooks OpenCode's `context`,
`compaction`, `generate`, and `title` stages for the `litellm` provider, so a
sleeping model is woken **before** the request is dispatched (including
sub-agents, compaction, and title generation). Behavior:

- Reads `stacks/vllm/model-registry.yaml` to map a model ID to its port.
- Checks `http://<host>:<port>/is_sleeping` (LAN IP, not `127.0.0.1` — see the
  note below). If the container is stopped or unreachable, it is treated as
  asleep and started.
- If asleep, runs `make -C <repo> vllm-model MODEL=<model>`. That sleeps the
  currently awake model and wakes the requested one (~2s). Concurrent prompts
  for the same model are serialized.

The plugin is **project-local**: OpenCode discovers it only when launched from
the repository directory (e.g. the TUI started in `/home/ravik/src_git/project_glasswing`).
A session that was already open before the plugin was added must be restarted
(or `/reload`) to pick it up. One-off `opencode run` from the repo loads it
automatically. Sessions started elsewhere (e.g. the background `opencode serve
--service` rooted at `/home/ravik`) do **not** load it.

Host IP resolution for the sleep check: `GLASSWING_HOST_IP` env var →
`stacks/infisical/.env` (`GLASSWING_HOST_IP` / `HOST_IP`) → `192.168.68.62`.
`127.0.0.1:3043/is_sleeping` does not work because the probe runs on the host
while vLLM is inside the container.

Manual fallback (if the plugin is not loaded or a wake fails):

```bash
make vllm-model MODEL=qwen3.6
make vllm-model MODEL=qwen3.8-opencode
```

## Adding a New Model

1. **Download weights:**
   ```bash
   HF_TOKEN=hf_... huggingface-cli download org/model-name \
     --local-dir /mnt/storage/models/<name>
   ```

2. **Add a service block** to `compose.yaml` (copy an existing one, change
   the model path, container name, port, and served-model-name).

3. **Add a registry entry** to `model-registry.yaml`.

4. **Start and switch:**
   ```bash
   make up STACK=vllm
   make vllm-model MODEL=<name>
   ```

5. **Restart OpenCode** (or `/reload`) so the autoswitch plugin re-reads the
   registry and can wake the new model automatically. Until then, switch it
   manually with `make vllm-model MODEL=<name>`.

## Context Window (KV cache)

Ollama's 131K context is fully recoverable — the earlier 40K ceiling was a
*default KV sizing* artifact, not a hardware limit. With INT4 weights (~17.6 GiB)
and 1.78 GiB of peak activation, vLLM 0.34.0 leaves ~3.8 GiB for KV. A 4-bit KV
dtype fits 131,072 tokens in ~2.4–3.4 GiB.

| Setting | Value | Why |
|---|---|---|
| `--kv-cache-memory-bytes` | `3700000000` | Bypasses the conservative "extensible KV cache" reservation, which otherwise caps a 27B model at ~80K tokens even with 4-bit KV. Ignores `--gpu-memory-utilization`. |
| `--max-model-len` | `131072` | Matches Ollama's `num_ctx`. |
| `--kv-cache-dtype` | `turboquant_k8v4` | FP8 keys + 4-bit values, +1.17% PPL. |
| `--max-num-batched-tokens` | `1024` | Keeps single-request prefill bounded. |
| `--max-num-seqs` | `1` | Single concurrent request (personal stack). |

Do **not** use `--cpu-offload-gb 6`: KV grows to 223K tokens but generation
collapses to ~4.5 tok/s. Do **not** use `--kv-offloading-backend native`: it
shrinks GPU KV to ~1.6 GiB and startup fails with
`ValueError: To serve at least one request with the model's max seq len (131072)`.

### KV profiles

Both models have identical KV geometry (64 layers = 48 linear + 16 full
attention, 4 KV heads, `head_dim 256`), so the same byte budgets apply.

| Model | Profile | Service | `--kv-cache-dtype` | KV bytes | Context | PPL cost | KV tokens |
|---|---|---|---|---|---|---|---|
| 3.8 | default | `vllm-qwen38` | `turboquant_k8v4` | 3.7e9 | 131072 | +1.17% | 132,971 (1.01×) |
| 3.8 | `alt-4bit` | `vllm-qwen38-4bit` | `turboquant_4bit_nc` | 3.5e9 | 131072 | +2.71% | 179,220 (1.37×) |
| 3.6 | `failback` | `vllm-qwen36` | `turboquant_k8v4` | 3.7e9 | 131072 | +1.17% | 132,971 (1.01×) |
| 3.6 | `failback-4bit` | `vllm-qwen36-4bit` | `turboquant_4bit_nc` | 3.5e9 | 131072 | +2.71% | 179,220 (1.37×) |

Each model's two profiles bind the same port (3043 / 3044) and serve the same
model ID, so LiteLLM/OpenCode need no changes. The alt services carry a network
alias matching the primary container name, so LiteLLM container DNS keeps
working. Never run two profiles of the same model together — they share a port
and the GPU. Use `make vllm-model` (it sleeps the active model and starts the
target with the right profile):

```bash
make vllm-model MODEL=qwen3.6          # 3.6, k8v4
make vllm-model MODEL=qwen3.6-4bit     # 3.6, 4-bit KV
```

Or directly:

```bash
docker compose --profile failback-4bit up -d vllm-qwen36-4bit
```

### Measured (2026-11-22, RTX 4090, 200 output tokens, temperature 0)

| Model | Config | Context | Speed | 80K recall | 100K recall |
|---|---|---|---|---|---|
| 3.8 | old (`fp8`, 40960) | 40,960 | 53.9 tok/s | — | — |
| 3.8 | `turboquant_k8v4` | 131,072 | 54.0 tok/s | PASS | PASS |
| 3.8 | `turboquant_4bit_nc` | 131,072 | 52.9 tok/s | PASS | — |
| 3.6 | `turboquant_k8v4` | 131,072 | 51.0 tok/s | PASS | — |
| 3.6 | `turboquant_4bit_nc` | 131,072 | 50.0 tok/s | PASS | — |

Tool calls and thinking-off verified on both profiles. Long-context prefill is
slow (100K-token prompt ≈ 60s first response) — inherent to a 27B model on a
4090, also true of Ollama. The client uses a 122,880-token context limit
(131,072 − 8,192 output reserve) so a full request never exceeds the server.

## Thinking Mode

Qwen 3.5/3.8 chat templates default to **thinking ON**. OpenCode sends
`reasoning_effort: none`, but LiteLLM's `drop_params: true` drops it, so vLLM
never sees it and the model emits visible `<think>...</think>` reasoning on
every turn (a trivial `2+2` returned 25 tokens of reasoning instead of `4`).
This wastes output tokens and, more importantly, inflates the conversation
history that gets fed back on every subsequent request — the main driver of
premature context exhaustion.

Both Qwen services start with:

```
--default-chat-template-kwargs '{"enable_thinking": false}'
```

This is a server-side default; request-level `chat_template_kwargs` still take
precedence. Verified after restart: plain answer is `'4'` in 2 completion
tokens, and XML tool calls still work.

## Tool Calling

OpenCode (and any OpenAI-compatible client that sends `tool_choice: "auto"`)
requires vLLM to be started with **both**:

- `--enable-auto-tool-choice`
- `--tool-call-parser qwen3_xml`

The Qwen 3.8/3.6 chat templates emit XML-style `<tool_call>` blocks, so
`qwen3_xml` is the matching parser (aliased to `Qwen3EngineToolParser` in vLLM
0.34.0). Without these flags vLLM returns:

```
"auto" tool choice requires --enable-auto-tool-choice and --tool-call-parser to be set
```

All four Qwen services carry the same flags. When Nemotron is added, give it a
parser appropriate to its own tool-call format — do not copy the Qwen parser.

## Sleep Mode

vLLM sleep mode is enabled via `--enable-sleep-mode` + `VLLM_SERVER_DEV_MODE=1`.
The `/sleep` and `/wake_up` endpoints are **dev-only** and should only be
exposed on trusted networks.

- **Level 1** (default): weights offloaded to CPU RAM, KV cache discarded.
  Wake time ~2s for 27B models.
- **Level 2**: weights discarded. Wake time ~15s (reload from disk).

## Storage

Model weights: `/mnt/storage/models/`
- `qwen3.8-27b-int4/` — Qwen 3.8 27B INT4
- `qwen3.6-27b-awq-int4/` — Qwen 3.6 27B AWQ INT4

## Consumers

All consumers go through LiteLLM (`:3035`), which points to vLLM:
- OpenCode → LiteLLM → vLLM
- Open WebUI → LiteLLM → vLLM
- AnythingLLM → LiteLLM → vLLM
- Situation → LiteLLM → vLLM
- Dagu → LiteLLM → vLLM

Open Notebook talks **directly** to vLLM (chat) and TEI (embeddings),
not through LiteLLM.
