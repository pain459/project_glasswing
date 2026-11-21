# ComfyUI — Local Image Generation

Self-built ComfyUI on the RTX 4090. No official Docker image exists; this is
the self-built path (pinned base + pinned ComfyUI tag + non-root user).

## Quick Start

```bash
# Switch to image mode (evicts Ollama, starts ComfyUI)
make gpu-comfyui

# Switch back to LLM mode (evicts ComfyUI, starts Ollama)
make gpu-ollama

# Check who owns the GPU
make gpu-status
```

## Access

- **Web UI:** http://192.168.68.62:3042
- **API:** `http://192.168.68.62:3042/prompt` (POST, API-format JSON)
- **Health:** `http://192.168.68.62:3042/system_stats`

## GPU Arbitration

ComfyUI and Ollama share the RTX 4090 (24 GB). They cannot run simultaneously.

| Command | Action |
|---|---|
| `make gpu-comfyui` | Evict Ollama → start ComfyUI |
| `make gpu-ollama` | Evict ComfyUI → start Ollama |
| `make gpu-status` | Show who owns the GPU |

**Queue guard:** `make gpu-ollama` refuses to evict ComfyUI if a prompt is in
flight (check `/queue`). Override with `FORCE=1 make gpu-ollama`.

**Reboot behavior:** A stopped `unless-stopped` container stays stopped across
reboot. After a reboot, run `make gpu-ollama` (or `make gpu-comfyui`) to start
whichever you need.

## Storage

All data lives under `/mnt/storage/comfyui/` (owned by uid/gid 1000):

| Path | Purpose |
|---|---|
| `models/` | SDXL, LoRAs, VAEs (downloaded via Manager or CLI) |
| `custom_nodes/` | ComfyUI-Manager installs |
| `input/` | Uploaded images |
| `output/` | Generated images |
| `temp/` | Scratch |
| `user/` | UI-saved workflows (`user/default/workflows/*.json`) |
| `.local/` | pip user-site (node deps) |

## Models

ComfyUI-Manager (pinned 4.2.2) is enabled. To download a model:

1. Open the web UI → Manager → Model Manager
2. Or via API: `POST /prompt` with a `CheckpointLoaderSimple` node

**Smoke test model:** `stabilityai/sdxl-turbo` (non-gated, 4-step generation).

## Workflow Import

- **UI-saved workflows:** `/mnt/storage/comfyui/user/default/workflows/*.json`
- **Programmatic:** `POST /prompt` with API-format JSON
- **History:** `GET /history`
- **View image:** `GET /view?filename=...`
- **Upload:** `POST /upload/image`

## Configuration

| Variable | Source | Purpose |
|---|---|---|
| `COMFYUI_EXTRA_ARGS` | Infisical `/comfyui` | Extra CLI args (e.g. `--enable-cors-header`) |
| `GLASSWING_HOST_IP` | `stacks/infisical/.env` | Host IP for port binding |

## Image

- **Base:** `pytorch/pytorch:2.14.1-cuda13.0-cudnn9-runtime` (pinned by digest)
- **ComfyUI:** `v0.46.0` (pinned tag)
- **Manager:** `comfyui_manager==4.2.2` (pinned)
- **User:** `comfy` (uid/gid 1000, non-root)
- **Build:** `make rebuild STACK=comfyui`

## Fallback

If the self-built image annoys, swap to pixeloven:

```yaml
image: ghcr.io/pixeloven/comfyui/core:cuda-latest
# Mount root is /app, not /app/ComfyUI
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `torch.cuda.is_available() is False` | CUDA runtime missing | Rebuild with `make rebuild STACK=comfyui` |
| `comfy_kitchen list[int]` crash | torch < 2.7 | Rebuild (asserts torch >= 2.7) |
| OOM on first load | GPU not fully released | Wait 10s, retry. Check `make gpu-status` |
| Port 3042 in use | Another service | Change port in `compose.yaml` |
| Manager not working | `--enable-manager` missing | Add to `COMFYUI_EXTRA_ARGS` |
