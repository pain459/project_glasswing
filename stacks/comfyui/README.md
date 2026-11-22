# ComfyUI — Local Image Generation

Self-built ComfyUI on the RTX 4090. No official Docker image exists; this is
the self-built path (pinned base + pinned ComfyUI tag + non-root user).

## Quick Start

Just open the app: **http://192.168.68.62:3042**. The always-on gate
(`stacks/comfyui-gate`) sleeps vLLM, starts ComfyUI, and proxies the UI. First
load takes ~10–20s; that is expected.

When you switch back to coding, an OpenCode request evicts ComfyUI and wakes
vLLM automatically. No manual command is needed in either direction.

```bash
# Check who owns the GPU
make gpu-status

# Optional explicit switches
make gpu-comfyui   # sleep vLLM, start ComfyUI
make gpu-vllm      # evict ComfyUI, wake the default vLLM model
```

## Access

- **Web UI:** http://192.168.68.62:3042
- **API:** `http://192.168.68.62:3042/prompt` (POST, API-format JSON)
- **Gate health:** `http://192.168.68.62:3042/health` (never wakes ComfyUI)
- **ComfyUI health (internal only):** `http://glasswing-comfyui:8188/system_stats`

ComfyUI no longer publishes a host port. `stacks/comfyui-gate` owns :3042.

## GPU Arbitration

ComfyUI and the vLLM models share the RTX 4090 (24 GB). They cannot both hold
VRAM at once. An idle ComfyUI uses no GPU compute, but a generation loads a
checkpoint, so the handoff happens before a prompt is submitted.

| Trigger | Action |
|---|---|
| Open `http://192.168.68.62:3042` or `POST /prompt` | Gate sleeps vLLM → starts ComfyUI → waits healthy |
| OpenCode coding request via `.opencode/plugins/vllm-autoswitch.ts` | `switch-model.sh` stops ComfyUI → wakes vLLM |
| `make gpu-vllm` | Same, explicit |
| `make gpu-status` | Show who owns the GPU |

**Queue guard:** eviction refuses to stop ComfyUI while `/queue` reports prompts
in flight. Override with `FORCE=1`. This protects an in-progress generation.

**Reboot behavior:** the gate starts with the normal stack boot. ComfyUI stays
stopped until the gate first sees a UI/API request.

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
