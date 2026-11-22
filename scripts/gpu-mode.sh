#!/usr/bin/env bash
# GPU arbitration: ComfyUI and vLLM share the RTX 4090.
#
# Usage:
#   scripts/gpu-mode.sh comfyui        # sleep vLLM, free the GPU for ComfyUI
#   scripts/gpu-mode.sh vllm           # evict ComfyUI, wake the default vLLM model
#   scripts/gpu-mode.sh evict-comfyui  # stop ComfyUI only (used by model switching)
#   scripts/gpu-mode.sh status         # show who owns the GPU
#
# Called by:
#   make gpu-comfyui  →  scripts/gpu-mode.sh comfyui
#   make gpu-vllm     →  scripts/gpu-mode.sh vllm
#   make gpu-status   →  scripts/gpu-mode.sh status
#   switch-model.sh   →  scripts/gpu-mode.sh evict-comfyui
#
# Design:
#   - vLLM has /sleep and /wake_up endpoints (VLLM_SERVER_DEV_MODE=1).
#     Sleep Level 1 offloads weights to CPU RAM (~2s wake time).
#   - ComfyUI has no /free endpoint that works mid-prompt. We stop the
#     container to guarantee GPU release.
#   - The queue guard on the vllm path prevents evicting ComfyUI while
#     a prompt is in flight (unless FORCE=1).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VLLM_REGISTRY="${REPO_ROOT}/stacks/vllm/model-registry.yaml"
VLLM_SWITCH="${REPO_ROOT}/stacks/vllm/switch-model.sh"
# Docker publishes these ports on the LAN IP, not on loopback.
HOST_IP="${GLASSWING_HOST_IP:-$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' "$(dirname "${BASH_SOURCE[0]}")/../stacks/infisical/.env" 2>/dev/null | head -n1 | tr -d '"')}"
HOST_IP="${HOST_IP:-192.168.68.62}"
COMFYUI_CONTAINER="glasswing-comfyui"
COMFYUI_HOST="${HOST_IP}:3042"

log()  { echo "[gpu-mode] $*"; }
err()  { echo "[gpu-mode] ERROR: $*" >&2; }
die()  { err "$@"; exit 1; }

# --- Helpers -----------------------------------------------------------------

# Parse the vLLM registry to get container|port pairs.
vllm_models() {
  local current_model=""
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// /}" ]] && continue
    if [[ "$line" =~ ^[[:space:]]{2}([a-zA-Z0-9._-]+):$ ]]; then
      current_model="${BASH_REMATCH[1]}"
      continue
    fi
    if [[ -n "$current_model" && "$line" =~ ^[[:space:]]{4}container:[[:space:]]*(.+)$ ]]; then
      local container="${BASH_REMATCH[1]}"
      local port
      port=$(grep -A5 "^  $current_model:" "$VLLM_REGISTRY" | grep 'port:' | awk '{print $2}' || true)
      echo "$container|$port"
      current_model=""
    fi
  done < <(awk '/^models:/{found=1;next} found' "$VLLM_REGISTRY")
}

# Parse the registry for the model marked `default: true`.
# Output: model|container|port
vllm_defaults() {
  local model="" container="" port="" is_default=""
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]{2}([a-zA-Z0-9._-]+):$ ]]; then
      model="${BASH_REMATCH[1]}"; container=""; port=""; is_default=""
      continue
    fi
    [[ -n "$model" && "$line" =~ ^[[:space:]]{4}container:[[:space:]]*(.+)$ ]] && \
      container="${BASH_REMATCH[1]}"
    [[ -n "$model" && "$line" =~ ^[[:space:]]{4}port:[[:space:]]*([0-9]+) ]] && \
      port="${BASH_REMATCH[1]}"
    [[ -n "$model" && "$line" =~ ^[[:space:]]{4}default:[[:space:]]*true ]] && \
      is_default="true"
    if [[ -n "$container" && -n "$port" && "$is_default" == "true" ]]; then
      echo "$model|$container|$port"
      model=""; container=""; port=""; is_default=""
    fi
  done < <(awk '/^models:/{found=1;next} found' "$VLLM_REGISTRY")
}

# /health stays 200 while asleep (weights offloaded), so use /is_sleeping.
vllm_awake() {
  local port="$1"
  local state
  state=$(curl -sf --max-time 5 "http://${HOST_IP}:$port/is_sleeping" 2>/dev/null || true)
  [[ "$state" == *'"is_sleeping":false'* ]]
}

comfyui_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "${COMFYUI_CONTAINER}"
}

comfyui_healthy() {
  curl -sf "http://${COMFYUI_HOST}/system_stats" >/dev/null 2>&1
}

gpu_free_mb() {
  nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null | head -1
}

# --- comfyui mode: sleep vLLM -------------------------------------------------

mode_comfyui() {
  local any_awake=false

  # Check if any vLLM model is awake
  while IFS='|' read -r container port; do
    if vllm_awake "$port"; then
      any_awake=true
      break
    fi
  done < <(vllm_models)

  if ! $any_awake; then
    log "No vLLM model is awake. GPU is free for ComfyUI."
    return 0
  fi

  log "vLLM is awake. Sleeping all models..."

  # Sleep each awake vLLM container
  while IFS='|' read -r container port; do
    if vllm_awake "$port"; then
      log "  Sleeping $container (port $port)..."
      if curl -sf -X POST "http://${HOST_IP}:$port/sleep" >/dev/null 2>&1; then
        log "  $container is asleep."
      else
        log "  WARNING: /sleep failed for $container. Stopping container."
        docker stop "$container" >/dev/null 2>&1 || true
      fi
    fi
  done < <(vllm_models)

  # Verify GPU is free.
  local free_mb
  free_mb=$(gpu_free_mb)
  if [ -n "${free_mb}" ] && [ "${free_mb}" -lt 20000 ]; then
    log "WARNING: GPU still has ${free_mb} MiB free (expected >20000 MiB)."
    log "  The GPU may still be releasing memory. ComfyUI may OOM on first load."
  else
    log "GPU is free (${free_mb:-unknown} MiB available)."
  fi

  log "Done. GPU is ready for ComfyUI."
}

# --- vllm mode: evict ComfyUI -------------------------------------------------

# Stop ComfyUI only. No vLLM wake here: switch-model.sh calls this before
# starting/waking whichever model the caller actually asked for.
evict_comfyui() {
  if ! comfyui_running; then
    log "ComfyUI is not running. GPU is free for vLLM."
    return 0
  fi

  # Queue guard: refuse to evict ComfyUI if a prompt is in flight.
  if comfyui_healthy; then
    local queue_len
    queue_len=$(curl -sf "http://${COMFYUI_HOST}/queue" 2>/dev/null | \
                python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('queue_running',[])) + len(d.get('queue_pending',[])))" 2>/dev/null || echo "0")
    if [ "${queue_len}" -gt 0 ] && [ "${FORCE:-0}" != "1" ]; then
      die "ComfyUI has ${queue_len} prompt(s) in the queue. Refusing to evict. Use FORCE=1 to override."
    fi
    if [ "${queue_len}" -gt 0 ]; then
      log "WARNING: ComfyUI has ${queue_len} prompt(s) in the queue. Forcing eviction (FORCE=1)."
    fi
  fi

  log "Stopping ${COMFYUI_CONTAINER}..."
  docker stop "${COMFYUI_CONTAINER}" >/dev/null 2>&1 || true

  local free_mb
  free_mb=$(gpu_free_mb)
  log "GPU is free (${free_mb:-unknown} MiB available). Ready for vLLM."
}

# Wake only the registry's default model. Waking every asleep model would make
# the Qwen 3.8 and 3.6 containers fight over the same 24 GiB card.
wake_vllm_default() {
  local found=false
  while IFS='|' read -r model container port; do
    found=true
    local state
    state=$(docker inspect "$container" --format='{{.State.Status}}' 2>/dev/null || echo "not_found")
    if [[ "$state" == "running" ]]; then
      if vllm_awake "$port"; then
        log "  $container is already awake."
      else
        log "  Waking $container (port $port)..."
        if curl -sf -X POST "http://${HOST_IP}:$port/wake_up" >/dev/null 2>&1; then
          log "  $container is awake."
        else
          log "  WARNING: /wake_up failed for $container."
        fi
      fi
    else
      log "  $container is $state. Starting it via switch-model.sh..."
      "$VLLM_SWITCH" "$model" || log "  WARNING: could not start $model."
    fi
  done < <(vllm_defaults)
  if ! $found; then
    err "No default model found in $VLLM_REGISTRY."
  fi
}

mode_vllm() {
  evict_comfyui
  wake_vllm_default
}

# --- status ------------------------------------------------------------------

mode_status() {
  echo "=== GPU Status ==="
  nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free --format=csv,noheader 2>/dev/null || \
    echo "  (nvidia-smi not available)"
  echo ""

  echo "=== vLLM Status ==="
  local any_awake=false
  while IFS='|' read -r container port; do
    local state="stopped"
    if docker inspect "$container" --format='{{.State.Status}}' 2>/dev/null | grep -q running; then
      if vllm_awake "$port"; then
        state="AWAKE"
        any_awake=true
      else
        state="asleep"
      fi
    fi
    echo "  $container (port $port): $state"
  done < <(vllm_models)
  if ! $any_awake; then
    echo "  (no vLLM model is awake)"
  fi

  echo ""
  echo "=== ComfyUI Status ==="
  if comfyui_running; then
    if comfyui_healthy; then
      echo "  ComfyUI:   RUNNING (healthy)"
    else
      echo "  ComfyUI:   RUNNING (not healthy)"
    fi
  else
    echo "  ComfyUI:   stopped"
  fi

  echo ""
  local free_mb
  free_mb=$(gpu_free_mb)
  if [ -n "${free_mb}" ]; then
    echo "  GPU free:  ${free_mb} MiB"
  fi
}

# --- Main --------------------------------------------------------------------

case "${1:-}" in
    comfyui)
        mode_comfyui
        ;;
    vllm)
        mode_vllm
        ;;
    evict-comfyui)
        evict_comfyui
        ;;
    status)
        mode_status
        ;;
    *)
        echo "Usage: $0 {comfyui|vllm|evict-comfyui|status}" >&2
        exit 1
        ;;
esac
