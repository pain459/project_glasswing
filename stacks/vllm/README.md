# vLLM — LLM Inference (replaces Ollama)

vLLM serves Qwen 3.8 27B (primary) and Qwen 3.6 27B (failback) on the RTX 4090.
Replaces Ollama for all chat completions. Embeddings are handled by TEI (see `stacks/tei/`).

## Architecture

**Option C: one container per model, one awake at a time.**

| Model | Container | Port | Role |
|-------|-----------|------|------|
| Qwen 3.8 27B | `glasswing-vllm-qwen38` | 3043 | Primary (default) |
| Qwen 3.6 27B | `glasswing-vllm-qwen36` | 3044 | Failback |

Sleeping containers keep weights in CPU RAM (~16GB each). Switching between
models takes ~2s (Level 1 sleep/wake) vs ~55s (process restart).

## Commands

```bash
# Start vLLM (primary model)
make up STACK=vllm

# Validate
make post-up STACK=vllm

# List available models
make vllm-model list

# Show current model
make vllm-model current

# Switch to failback
make vllm-model MODEL=qwen3.6

# Switch back to primary
make vllm-model MODEL=qwen3.8-opencode

# GPU mode switching
make gpu-comfyui    # sleep vLLM, start ComfyUI
make gpu-vllm       # stop ComfyUI, wake vLLM
make gpu-status     # show who owns the GPU
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

## GPU Memory

- `--gpu-memory-utilization 0.99` — the INT4 27B weights use ~17.6 GiB; this is
  the minimum setting that leaves enough KV cache to serve a full request
- `--kv-cache-dtype fp8` — halves KV cache memory
- `--max-model-len 32768` — 32K context window (128K does not fit alongside the
  model weights on a 24GB card; vLLM refuses to start above ~43K)
- `--max-num-seqs 1` — single concurrent request (this is a personal stack)

## Sleep Mode

vLLM sleep mode is enabled via `--enable-sleep-mode` + `VLLM_SERVER_DEV_MODE=1`.
The `/sleep` and `/wake_up` endpoints are **dev-only** and should only be
exposed on trusted networks.

- **Level 1** (default): weights offloaded to CPU RAM, KV cache discarded.
  Wake time ~2s for 27B models.
- **Level 2**: weights discarded. Wake time ~15s (reload from disk).

## Storage

Model weights: `/mnt/storage/models/`
- `qwen3.8-27b/` — Qwen 3.8 27B (Safetensors)
- `qwen3.6-27b/` — Qwen 3.6 27B (Safetensors)

## Consumers

All consumers go through LiteLLM (`:3035`), which points to vLLM:
- OpenCode → LiteLLM → vLLM
- Open WebUI → LiteLLM → vLLM
- AnythingLLM → LiteLLM → vLLM
- Situation → LiteLLM → vLLM
- Dagu → LiteLLM → vLLM

Open Notebook talks **directly** to vLLM (chat) and TEI (embeddings),
not through LiteLLM.
