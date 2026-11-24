#!/usr/bin/env bash
# Pre-up guard for the vLLM stack.
#
# `make up STACK=vllm` starts whatever Compose has enabled and used to skip the
# one-awake-model rule entirely: a resident model (for example the lightweight
# Nemotron on :3045) kept its VRAM, the incoming 27B could not allocate, and
# `restart: unless-stopped` turned that into an endless crash loop.
#
# This hook runs before Compose on every `make up`/`make rebuild` of this stack
# and restores the invariant:
#   1. evict ComfyUI (with its queue guard) so the GPU is actually free;
#   2. ask gpu-mode.sh to sleep every model that is not about to start, stop
#      ones that cannot settle, and free any port an incoming service needs.
#
# Manual model switches should still use `make vllm-model MODEL=<name>`; this
# hook only makes the plain `make up` path safe.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
COMPOSE_OVERRIDE="$SCRIPT_DIR/compose.override.yaml"
GPU_MODE="$REPO_ROOT/scripts/gpu-mode.sh"

# Docker publishes these ports on the LAN IP, not on loopback.
HOST_IP="${GLASSWING_HOST_IP:-$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' "$REPO_ROOT/stacks/infisical/.env" 2>/dev/null | head -n1 | tr -d '"')}"
HOST_IP="${HOST_IP:-192.168.68.62}"
export GLASSWING_HOST_IP="$HOST_IP"
export GLASSWING_NETWORK="${GLASSWING_NETWORK:-glasswing}"

info() { echo "[vllm-pre-up] $*"; }
fail() { echo "[vllm-pre-up] ERROR: $*" >&2; exit 1; }

[[ -x "$GPU_MODE" ]] || fail "missing $GPU_MODE"

compose_files=(-f "$COMPOSE_FILE")
[[ -f "$COMPOSE_OVERRIDE" ]] && compose_files+=(-f "$COMPOSE_OVERRIDE")

# The services `up` will actually create: Compose resolves profile gating here,
# so a profile-gated model (failback, alt-4bit, lightweight) is not treated as
# incoming unless it was explicitly enabled.
services=$(docker compose "${compose_files[@]}" config --services 2>/dev/null) || \
  fail "cannot resolve the vLLM Compose service list; refusing to start blind."

read -r -a incoming <<<"$(echo "$services" | tr '\n' ' ')"
if (( ${#incoming[@]} == 0 )); then
  info "Compose resolved no services; nothing to guard."
  exit 0
fi

info "Incoming service(s): ${incoming[*]}"

# ComfyUI holds VRAM until its container stops; evict_comfyui refuses while a
# prompt is queued unless FORCE=1, which is the behaviour we want here.
"$GPU_MODE" evict-comfyui

"$GPU_MODE" prepare-vllm "${incoming[@]}"

info "GPU is ready for: ${incoming[*]}"
