# Ollama

Local inference on Pathfinder's RTX 4090. OpenCode reaches it through the
LiteLLM gateway, which forwards OpenAI-compatible `/v1` requests to
`http://192.168.68.62:11434/v1` and records token usage per request.

## Services

| Service | Purpose |
| --- | --- |
| `ollama` | Model server with GPU access on `192.168.68.62:11434` |

## Runtime settings

The container environment is part of the inference baseline. Matching native
OpenCode settings live in `/home/ravik/.config/opencode/opencode.json` and are
validated by `make ai-preflight`.

| Variable | Value | Why |
| --- | --- | --- |
| `OLLAMA_FLASH_ATTENTION` | `1` | Required for a quantized KV cache and faster long-context attention |
| `OLLAMA_KV_CACHE_TYPE` | `q4_0` | Halves the KV cache again versus `q8_0`, which fits the whole 131k context on the GPU |
| `OLLAMA_NUM_PARALLEL` | `1` | One request at a time; two sessions would each allocate a KV cache |
| `OLLAMA_MAX_LOADED_MODELS` | `2` | Lets the embedding model stay resident beside the coding model instead of evicting it |
| `OLLAMA_KEEP_ALIVE` | `30m` | Keeps the coding model warm between prompts |

`gpus: all` only works when the NVIDIA Container Toolkit is installed and the
Docker runtime is configured. A GPU visible to `nvidia-smi` on the host does not
prove the container can use it; the preflight checks the container itself.

## Model

`qwen3.8-opencode:latest` is built from the checked-in
[`models/qwen3.8-opencode.Modelfile`](models/qwen3.8-opencode.Modelfile) as part
of the normal deployment:

```bash
make up STACK=ollama
```

After the container is healthy, `stacks/ollama/post-up.sh`:

1. Pulls `qwen3.8:27b` and `nomic-embed-text:latest` if they are missing.
2. Builds or refreshes `qwen3.8-opencode:latest` from the Modelfile.
3. Runs the Ollama preflight.

The model is only rebuilt when its effective `num_ctx`, `num_predict` or
`temperature` differ from the Modelfile. To force a rebuild without redeploying:

```bash
FORCE=1 make ollama-model
```

`make ollama-model` is the lower-level equivalent when the container is already
running. To build against a different base without editing the file:

```bash
make ollama-model OLLAMA_BASE_MODEL=qwen3.8:27b
```

The effective parameters are visible with:

```bash
docker exec glasswing-ollama ollama show qwen3.8-opencode:latest --modelfile
```

## GPU residency

Ollama decides which layers fit in VRAM every time it loads a model. Measure it
instead of assuming:

```bash
docker exec glasswing-ollama nvidia-smi
docker exec glasswing-ollama ollama ps
```

`ollama ps` reports a `PROCESSOR` column such as `100% GPU` or `91%/9%
CPU/GPU`. The same numbers are available from the API, which is what the
preflight uses:

```bash
curl -s http://192.168.68.62:11434/api/ps \
  | jq '.models[] | {name, size, size_vram}'
```

A 27B model at a 131k context is at the limit of 24 GB. Partial CPU offload is not a
small loss: layers run in order, so every CPU-resident layer stalls the GPU. Measured
on Pathfinder with `qwen3.8-opencode` (Q4_K_M, 200 output tokens, temperature 0):

| Config | Context | Residency | Generation |
| --- | --- | --- | --- |
| `q8_0` KV | 131072 | 88.3% | ~57 tok/s |
| `q8_0` KV | 106496 | 100% | ~106 tok/s |
| `q4_0` KV | 131072 | 100% | ~110 tok/s |

`q4_0` is what keeps the full 131k context on the card. The trade-off is KV-cache
precision, which is most visible on long-context recall. If quality regresses, drop
`num_ctx` to 106496 and set `OLLAMA_KV_CACHE_TYPE=q8_0` instead.

If residency drops, check for a second loaded model, a second concurrent request, or a
model rebuilt without `num_ctx`.

## Embedding co-residency

Open Notebook embeds notes through this same server (see `nomic-embed-text:latest`).
With `OLLAMA_MAX_LOADED_MODELS=1` an embed request evicts the 19 GB coding model, so the
next prompt pays a cold reload. `OLLAMA_MAX_LOADED_MODELS=2` keeps both resident:

```bash
curl -s http://192.168.68.62:11434/api/ps \
  | jq -r '.models[] | "\(.name) \(.size_vram / .size * 1000 | floor / 10)%"'
```

Both should report 100%, and the coding model must still hold the full 131k context.
The embedder costs ~772 MiB of VRAM, which the `q4_0` configuration leaves free.

## Validation

`make up STACK=ollama` runs the Ollama preflight automatically. To rerun it
without redeploying:

```bash
./scripts/ai-preflight.sh --ollama
```

The script makes no configuration changes. It verifies container GPU access, the runtime
flags above, the model's effective parameters, a non-truncated coding response with
thinking disabled, the resulting GPU residency, and that an embedding request leaves the
coding model resident and fully on the GPU. `make ai-preflight` also checks the
host-installed OpenCode configuration and runs a real standalone default-model prompt.

## Data

| Host path | Container path | Purpose |
| --- | --- | --- |
| `/mnt/storage/ollama` | `/root/.ollama` | Models, manifests, and blobs |

Models are large and reproducible; they are excluded from the Restic backup.
