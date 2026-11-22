#!/usr/bin/env bash
# ComfyUI post-up: verify the server is healthy and that it really sees the GPU.
set -euo pipefail

HOST_IP="${GLASSWING_HOST_IP:-127.0.0.1}"
CONTAINER="glasswing-comfyui"

# ComfyUI is internal-only now; host :3042 belongs to the always-on gate.
# Probe through the container so this check also works while ComfyUI is stopped.
echo "[comfyui:post-up] Verifying ComfyUI inside ${CONTAINER}..."

for i in $(seq 1 36); do
    if docker exec "${CONTAINER}" wget -q -O /dev/null http://127.0.0.1:8188/system_stats 2>/dev/null; then
        echo "[comfyui:post-up] ComfyUI is healthy."
        break
    fi
    if [ "$i" -eq 36 ]; then
        echo "[comfyui:post-up] ERROR: ComfyUI did not become healthy in 180s." >&2
        docker logs --tail 60 "${CONTAINER}" 2>&1 || true
        exit 1
    fi
    sleep 5
done

STATS_FILE="$(mktemp)"
trap 'rm -f "${STATS_FILE}"' EXIT
docker exec "${CONTAINER}" wget -q -O - http://127.0.0.1:8188/system_stats > "${STATS_FILE}"

# This is the only meaningful GPU check: BuildKit builds have no GPU, so the
# Dockerfile can only assert torch/CUDA versions, not device availability.
python3 - "${STATS_FILE}" <<'PY' || {
import json
import sys

with open(sys.argv[1], encoding="utf-8") as fh:
    data = json.load(fh)

system = data.get("system") or {}
if isinstance(system, list):
    system = system[0] if system else {}

print("  python  " + str(system.get("python_version", "?")).split()[0])
print("  torch   " + str(system.get("pytorch_version", "?")))
print("  comfy   " + str(system.get("comfyui_version", "?")))

devices = data.get("devices") or []
if not devices:
    sys.exit("/system_stats reports no compute devices")

for dev in devices:
    name = str(dev.get("name", "?"))
    total = int(dev.get("vram_total") or 0) // (1024 * 1024)
    free = int(dev.get("vram_free") or 0) // (1024 * 1024)
    print(f"  gpu     {name} ({free} / {total} MiB free)")

if not any("nvidia" in str(d.get("name", "")).lower()
           or "geforce" in str(d.get("name", "")).lower()
           or "rtx" in str(d.get("name", "")).lower()
           for d in devices):
    sys.exit("no NVIDIA device in /system_stats: " + repr([d.get("name") for d in devices]))
PY
    echo "[comfyui:post-up] ERROR: /system_stats did not report a usable NVIDIA GPU." >&2
    head -c 1200 "${STATS_FILE}" >&2
    echo >&2
    exit 1
}

echo ""
echo "[comfyui:post-up] ComfyUI is ready via the gate at http://${HOST_IP}:3042"
echo "[comfyui:post-up] Switch back to vLLM with: make gpu-vllm"
