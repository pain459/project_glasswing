#!/usr/bin/env bash
# GPU arbitration: ComfyUI and Ollama share the RTX 4090.
#
# Usage:
#   scripts/gpu-mode.sh comfyui   # evict Ollama, free the GPU for ComfyUI
#   scripts/gpu-mode.sh ollama    # evict ComfyUI, free the GPU for Ollama
#   scripts/gpu-mode.sh status    # show who owns the GPU
#
# Called by:
#   make gpu-comfyui  →  scripts/gpu-mode.sh comfyui
#   make gpu-ollama   →  scripts/gpu-mode.sh ollama
#   make gpu-status   →  scripts/gpu-mode.sh status
#
# Design:
#   - ComfyUI has no /free endpoint that works mid-prompt. We stop the
#     container to guarantee GPU release.
#   - Ollama has /api/ps (list loaded models) and /free (unload). We use
#     both: graceful unload first, then stop the container.
#   - The queue guard on the ollama path prevents evicting ComfyUI while
#     a prompt is in flight (unless FORCE=1).

set -euo pipefail

OLLAMA_HOST="${GLASSWING_HOST_IP:-127.0.0.1}:11434"
OLLAMA_CONTAINER="glasswing-ollama"
COMFYUI_CONTAINER="glasswing-comfyui"
COMFYUI_HOST="${GLASSWING_HOST_IP:-127.0.0.1}:3042"

log()  { echo "[gpu-mode] $*"; }
err()  { echo "[gpu-mode] ERROR: $*" >&2; }
die()  { err "$@"; exit 1; }

# --- Helpers -----------------------------------------------------------------

ollama_running() {
    docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "${OLLAMA_CONTAINER}"
}

comfyui_running() {
    docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "${COMFYUI_CONTAINER}"
}

ollama_healthy() {
    curl -sf "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1
}

comfyui_healthy() {
    curl -sf "http://${COMFYUI_HOST}/system_stats" >/dev/null 2>&1
}

gpu_free_mb() {
    # Returns free GPU memory in MiB.
    nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null | head -1
}

# --- comfyui mode: evict Ollama ----------------------------------------------

mode_comfyui() {
    if ! ollama_running; then
        log "Ollama is not running. GPU is free for ComfyUI."
        return 0
    fi

    log "Ollama is running. Evicting..."

    # 1. Gracefully unload all models (keep_alive:0).
    if ollama_healthy; then
        log "Unloading Ollama models (keep_alive:0)..."
        # List loaded models and unload each.
        local models
        models=$(curl -sf "http://${OLLAMA_HOST}/api/ps" 2>/dev/null | \
                 python3 -c "import sys,json; [print(m['name']) for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || true)
        for model in $models; do
            log "  Unloading ${model}..."
            curl -sf -X POST "http://${OLLAMA_HOST}/api/generate" \
                -H 'Content-Type: application/json' \
                -d "{\"model\":\"${model}\",\"keep_alive\":0,\"prompt\":\"\"}" >/dev/null 2>&1 || true
        done
        # Also try /free as a belt-and-suspenders.
        curl -sf -X POST "http://${OLLAMA_HOST}/api/generate" \
            -H 'Content-Type: application/json' \
            -d '{"keep_alive":0,"prompt":""}' >/dev/null 2>&1 || true
    else
        log "Ollama is not healthy. Skipping graceful unload."
    fi

    # 2. Wait for /api/ps to be empty (up to 30s).
    log "Waiting for Ollama to release GPU memory..."
    for i in $(seq 1 30); do
        local loaded
        loaded=$(curl -sf "http://${OLLAMA_HOST}/api/ps" 2>/dev/null | \
                 python3 -c "import sys,json; print(len(json.load(sys.stdin).get('models',[])))" 2>/dev/null || echo "0")
        if [ "${loaded}" = "0" ]; then
            log "  Ollama has released all models."
            break
        fi
        if [ "$i" -eq 30 ]; then
            log "  WARNING: Ollama did not release models in 30s. Forcing container stop."
        fi
        sleep 1
    done

    # 3. Stop the Ollama container.
    log "Stopping ${OLLAMA_CONTAINER}..."
    docker stop "${OLLAMA_CONTAINER}" >/dev/null 2>&1 || true

    # 4. Verify GPU is free.
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

# --- ollama mode: evict ComfyUI ----------------------------------------------

mode_ollama() {
    if ! comfyui_running; then
        log "ComfyUI is not running. GPU is free for Ollama."
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
    log "GPU is free (${free_mb:-unknown} MiB available). Ready for Ollama."
}

# --- status ------------------------------------------------------------------

mode_status() {
    echo "=== GPU Status ==="
    nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free --format=csv,noheader 2>/dev/null || \
        echo "  (nvidia-smi not available)"
    echo ""

    echo "=== Container Status ==="
    if ollama_running; then
        echo "  Ollama:    RUNNING"
        if ollama_healthy; then
            local models
            models=$(curl -sf "http://${OLLAMA_HOST}/api/ps" 2>/dev/null | \
                     python3 -c "import sys,json; [print(f'    - {m[\"name\"]} ({m[\"size_vram\"]//1024//1024} MiB)') for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || echo "    (no loaded models)")
            echo "${models}"
        else
            echo "  Ollama:    RUNNING (not healthy)"
        fi
    else
        echo "  Ollama:    stopped"
    fi

    if comfyui_running; then
        echo "  ComfyUI:   RUNNING"
        if comfyui_healthy; then
            echo "  ComfyUI:   healthy"
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
    ollama)
        mode_ollama
        ;;
    status)
        mode_status
        ;;
    *)
        echo "Usage: $0 {comfyui|ollama|status}" >&2
        exit 1
        ;;
esac
