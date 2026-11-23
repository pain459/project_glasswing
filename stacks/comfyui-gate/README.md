# ComfyUI Gate — always-on :3042 dispatcher

This is the front door for ComfyUI. It runs permanently, so the Homepage tile
and any bookmark to `http://192.168.68.62:3042` work without a prep command.
ComfyUI itself listens only on the internal Docker network (`glasswing-comfyui:8188`).

## Behavior

| Request | Action |
|---|---|
| `GET /health` | Gate health only; **never** wakes ComfyUI (used by Homepage monitor) |
| `GET /`, `GET /index.html` | Wakes ComfyUI, then proxies the UI |
| `POST /prompt`, uploads, interrupt, … | Wakes ComfyUI, then proxies |
| WebSocket `/ws` | Wakes ComfyUI if needed, then proxies progress updates |
| `GET /queue`, `/history`, `/view`, … | Passive: forwarded only if ComfyUI is already up, else HTTP 503 |

Wake sequence:

1. Parse `stacks/vllm/model-registry.yaml` for every vLLM container and port.
2. `GET /is_sleeping`, then `POST /sleep` on each awake model (~2s, weights stay in host RAM).
3. Containers that are `restarting`, unresponsive, or fail to confirm a clean sleep are **stopped** through the Docker API, because they may still hold VRAM.
4. Start the stopped `glasswing-comfyui` container via the Docker socket.
5. Poll `http://glasswing-comfyui:8188/system_stats` until healthy (up to 90s).
6. Stream the original request/response; WebSockets are bridged in both directions.

**Expected cold start:** 10–20s on first use after coding. Idle ComfyUI consumes no
GPU compute, but it does hold VRAM, so the handoff must happen before a prompt
loads a checkpoint.

## Reverse handoff

Coding reclaims the GPU automatically: `.opencode/plugins/vllm-autoswitch.ts`
calls `make vllm-model`, which now runs `scripts/gpu-mode.sh evict-comfyui`
(queue-guarded) before waking vLLM. A queued ComfyUI prompt blocks the switch
with a clear error; `FORCE=1` overrides it.

## Operations

```bash
make up STACK=comfyui-gate        # start/rebuild the gate
curl http://192.168.68.62:3042/health
```

The gate needs the rw Docker socket to start ComfyUI. It is a privileged
service, comparable to Portainer. No auth is added here; it remains LAN-bound
via `GLASSWING_HOST_IP`.
