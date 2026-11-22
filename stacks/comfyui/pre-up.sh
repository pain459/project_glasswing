#!/usr/bin/env bash
# ComfyUI pre-up:
#   1. Ensure the bind-mount tree exists and is writable by the container user.
#   2. Sleep the resident vLLM model to free VRAM for ComfyUI.
#
# The ownership guard matters: Docker auto-creates a missing bind-mount source
# as root, and ComfyUI then dies with a PermissionError the first time
# ComfyUI-Manager touches user/__manager.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
GPU_MODE="${REPO_ROOT}/scripts/gpu-mode.sh"

STORAGE="${COMFYUI_STORAGE:-/mnt/storage/comfyui}"
PUID="${GLASSWING_PUID:-1000}"
PGID="${GLASSWING_PGID:-1000}"

# Model subdirectories as defined by ComfyUI v0.46.0 (folder_paths).
MODEL_DIRS="audio_encoders background_removal checkpoints classifiers clip_vision
configs controlnet datasets detection diffusers diffusion_models embeddings
frame_interpolation geometry_estimation gligen hypernetworks latent_upscale_models
loras model_patches optical_flow photomaker style_models text_encoders
upscale_models vae vae_approx"

echo "[comfyui:pre-up] Preparing ${STORAGE}..."
mkdir -p "${STORAGE}"/{custom_nodes,input,output,temp,user,.local} 2>/dev/null || true
for d in ${MODEL_DIRS}; do
    mkdir -p "${STORAGE}/models/${d}" 2>/dev/null || true
done

if [ ! -w "${STORAGE}" ]; then
    echo "[comfyui:pre-up] ERROR: ${STORAGE} is not writable by uid $(id -u)." >&2
    if [ "$(stat -c %u "${STORAGE}")" = "0" ]; then
        echo "[comfyui:pre-up] The tree is root-owned (Docker created it, or it was" >&2
        echo "                made by a root container). Fix it once with either:" >&2
        echo "                  sudo chown -R ${PUID}:${PGID} ${STORAGE}" >&2
        echo "                  docker run --rm --user 0:0 -v ${STORAGE}:/data \\" >&2
        echo "                    --entrypoint chown glasswing/comfyui:local -R ${PUID}:${PGID} /data" >&2
    fi
    exit 1
fi

echo "[comfyui:pre-up] Sleeping vLLM to free the GPU..."
bash "${GPU_MODE}" comfyui
echo "[comfyui:pre-up] GPU is free for ComfyUI."
