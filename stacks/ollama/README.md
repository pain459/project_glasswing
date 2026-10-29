# Ollama

Local inference on Pathfinder's RTX 4090. Containers on the shared proxy
network (OpenCode, AnythingLLM, Flowise) reach the OpenAI-compatible `/v1`
endpoint at `http://glasswing-ollama:11434/v1`. Host-side tooling and local
clients keep using the direct API on `http://192.168.68.62:11434`, which is
also published as `https://ollama.glasswing.lan` through the reverse proxy.

## Services

| Service | Purpose |
| --- | --- |
| `ollama` | Model server with GPU access on `192.168.68.62:11434` (`glasswing-ollama:11434` internally) |

## Runtime settings

The container environment is part of the inference baseline. The matching
OpenCode settings are documented in
[`../opencode/README.md#inference-baseline`](../opencode/README.md#inference-baseline).

| Variable | Value | Why |
| --- | --- | --- |
| `OLLAMA_FLASH_ATTENTION` | `1` | Required for a quantized KV cache and faster long-context attention |
| `OLLAMA_KV_CACHE_TYPE` | `q8_0` | Halves KV-cache memory so more of the 131k context fits in VRAM |
| `OLLAMA_NUM_PARALLEL` | `1` | One request at a time; two sessions would each allocate a KV cache |
| `OLLAMA_MAX_LOADED_MODELS` | `1` | Never page two models in and out of 24 GB of VRAM |
| `OLLAMA_KEEP_ALIVE` | `30m` | Keeps the coding model warm between prompts |

`gpus: all` only works when the NVIDIA Container Toolkit is installed and the
Docker runtime is configured. A GPU visible to `nvidia-smi` on the host does not
prove the container can use it; the preflight checks the container itself.

## Model

`qwen3.6-opencode:latest` is built from the checked-in
[`models/qwen3.6-opencode.Modelfile`](models/qwen3.6-opencode.Modelfile) as part
of the normal deployment:

```bash
make up STACK=ollama
```

After the container is healthy, `stacks/ollama/post-up.sh`:

1. Pulls `qwen3.6:27b` if it is missing.
2. Builds or refreshes `qwen3.6-opencode:latest` from the Modelfile.
3. Runs the Ollama preflight.

The model is only rebuilt when its effective `num_ctx`, `num_predict` or
`temperature` differ from the Modelfile. To force a rebuild without redeploying:

```bash
FORCE=1 make ollama-model
```

`make ollama-model` is the lower-level equivalent when the container is already
running. To build against a different base without editing the file:

```bash
make ollama-model OLLAMA_BASE_MODEL=qwen3.6:27b
```

The effective parameters are visible with:

```bash
docker exec glasswing-ollama ollama show qwen3.6-opencode:latest --modelfile
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

A 27B model at a 131k context is close to the limit of 24 GB, so partial CPU
offload is expected. `q8_0` KV cache plus flash attention is what keeps the
majority on the GPU. If residency drops, check for a second loaded model, a
second concurrent request, or a model rebuilt without `num_ctx`.

## Validation

`make up STACK=ollama` runs the Ollama preflight automatically. To rerun it
without redeploying:

```bash
./scripts/ai-preflight.sh --ollama
```

The script is read-only. It verifies container GPU access, the runtime flags
above, the model's effective parameters, a non-truncated coding response with
thinking disabled, and the resulting GPU residency. The full Ollama and OpenCode
path is checked by `make up STACK=opencode` (or `make ai-preflight`).

## Data

| Host path | Container path | Purpose |
| --- | --- | --- |
| `/mnt/storage/ollama` | `/root/.ollama` | Models, manifests, and blobs |

Models are large and reproducible; they are excluded from the Restic backup.
