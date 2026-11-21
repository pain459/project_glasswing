#!/usr/bin/env bash
# Ollama pre-up: evict ComfyUI from the GPU before Ollama starts.
#
# This is the GPU arbitration gate. It:
#   1. Checks if ComfyUI has a prompt in flight (queue guard)
#   2. Stops the ComfyUI container
#   3. Verifies the GPU is free
#
# If ComfyUI is already stopped, this is a no-op.
#
# Called by `make gpu-ollama` (not by `make up STACK=ollama` directly).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
GPU_MODE="${REPO_ROOT}/scripts/gpu-mode.sh"

echo "[ollama:pre-up] Evicting ComfyUI from GPU..."
bash "${GPU_MODE}" ollama
echo "[ollama:pre-up] GPU is free for Ollama."
