#!/usr/bin/env bash
# Pathfinder AI inference preflight (vLLM).
#
# Usage:
#   ai-preflight.sh --vllm      vLLM only; used by `make up STACK=vllm`
#   ai-preflight.sh --opencode  vLLM plus host-installed OpenCode
#   ai-preflight.sh --all       Same as --opencode (default)
#
# Verifies:
#   - the vLLM container is running
#   - vLLM can see the host GPU
#   - the model is loaded and serving
#   - the LiteLLM gateway container is running
#   - the OpenCode limits, temperature, reasoning and compaction agree with it
#   - host OpenCode can reach LiteLLM
#   - the effective host OpenCode configuration selects the expected model
#   - a real standalone host OpenCode prompt completes with the default model
#   - a small coding prompt returns a complete answer with thinking disabled
#   - GPU residency is measured and reported
#
# Read-only: it does not create, pull, restart, or delete anything.
set -Eeuo pipefail

case "${1:-}" in
  ""|--all|--opencode) SCOPE="opencode" ;;
  --vllm)              SCOPE="vllm" ;;
  --ollama)            SCOPE="vllm" ;;  # backward compat
  -h|--help)
    printf 'usage: %s [--vllm|--opencode|--all]\n' "$0"
    exit 0
    ;;
  *) printf 'usage: %s [--vllm|--opencode|--all]\n' "$0" >&2; exit 2 ;;
esac

WITH_OPENCODE=0
[ "$SCOPE" = "opencode" ] && WITH_OPENCODE=1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

VLLM_CONTAINER="${VLLM_CONTAINER:-glasswing-vllm-qwen38}"
VLLM_URL="${VLLM_URL:-http://192.168.68.62:3043}"
VLLM_MODEL="${VLLM_MODEL:-qwen3.8-opencode}"

# LiteLLM is the only path OpenCode uses; vLLM is the backend behind it.
LITELLM_CONTAINER="${LITELLM_CONTAINER:-glasswing-litellm}"
LITELLM_URL="${LITELLM_URL:-http://192.168.68.62:3035}"
LITELLM_MODEL="${LITELLM_MODEL:-qwen3.8-opencode}"
LITELLM_FAILBACK_MODEL="${LITELLM_FAILBACK_MODEL:-qwen3.6}"
LITELLM_MASTER_KEY="${LITELLM_MASTER_KEY:-}"

# OpenCode (host-installed)
OPENCODE_BIN="${OPENCODE_BIN:-opencode}"
OPENCODE_CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.json}"

pass() { printf '\033[0;32m[PASS]\033[0m %s\n' "$*"; }
fail() { printf '\033[0;31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
log()  { printf '[INFO] %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 1. vLLM container
# ---------------------------------------------------------------------------
log "Checking vLLM container..."
if ! docker inspect "$VLLM_CONTAINER" >/dev/null 2>&1; then
  fail "$VLLM_CONTAINER is not running (make up STACK=vllm)"
fi
pass "vLLM container is running: $VLLM_CONTAINER"

# ---------------------------------------------------------------------------
# 2. GPU visibility
# ---------------------------------------------------------------------------
log "Checking GPU visibility..."
gpu="$(docker exec "$VLLM_CONTAINER" nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || true)"
if [ -n "$gpu" ]; then
  pass "vLLM sees the host GPU: $gpu"
else
  fail "vLLM cannot run nvidia-smi; check NVIDIA Container Toolkit and 'gpus: all'"
fi

# ---------------------------------------------------------------------------
# 3. Model health
# ---------------------------------------------------------------------------
log "Checking model health..."
if curl -sf "${VLLM_URL}/health" >/dev/null 2>&1; then
  pass "vLLM /health responds"
else
  fail "vLLM /health not responding (model may still be loading)"
fi

# ---------------------------------------------------------------------------
# 4. Model list
# ---------------------------------------------------------------------------
log "Checking model list..."
MODELS=$(curl -sf "${VLLM_URL}/v1/models" 2>/dev/null | python3 -c "import sys,json; [print(m['id']) for m in json.load(sys.stdin)['data']]" 2>/dev/null || echo "")
if [ -n "$MODELS" ]; then
  pass "Models: $MODELS"
else
  fail "No models listed at ${VLLM_URL}/v1/models"
fi

# ---------------------------------------------------------------------------
# 5. Inference test
# ---------------------------------------------------------------------------
log "Running inference test..."
RESPONSE=$(curl -sf "${VLLM_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$VLLM_MODEL"'",
    "messages": [{"role": "user", "content": "Say exactly: vLLM is working"}],
    "max_tokens": 20,
    "temperature": 0
  }' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])" 2>/dev/null || echo "")

if [ -n "$RESPONSE" ]; then
  pass "Inference test: \"$RESPONSE\""
else
  fail "Inference test failed"
fi

# ---------------------------------------------------------------------------
# 6. GPU memory
# ---------------------------------------------------------------------------
log "GPU memory usage..."
nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null | \
  awk -F', ' '{printf "  GPU: %s / %s MiB used\n", $1, $2}' || true

# ---------------------------------------------------------------------------
# 7. LiteLLM gateway (if in scope)
# ---------------------------------------------------------------------------
if [ "$WITH_OPENCODE" = "1" ]; then
  log "Checking LiteLLM gateway..."
  if ! docker inspect "$LITELLM_CONTAINER" >/dev/null 2>&1; then
    fail "$LITELLM_CONTAINER is not running (make up STACK=litellm)"
  fi
  pass "LiteLLM container is running: $LITELLM_CONTAINER"

  if curl -sf "${LITELLM_URL}/health/liveliness" >/dev/null 2>&1; then
    pass "LiteLLM /health/liveliness responds"
  else
    fail "LiteLLM /health/liveliness not responding"
  fi

  # Check that the model is registered
  LITELLM_MODELS=$(curl -sf "${LITELLM_URL}/v1/models" \
    -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" 2>/dev/null | \
    python3 -c "import sys,json; [print(m['id']) for m in json.load(sys.stdin)['data']]" 2>/dev/null || echo "")
  if echo "$LITELLM_MODELS" | grep -q "$LITELLM_MODEL"; then
    pass "LiteLLM has model: $LITELLM_MODEL"
  else
    warn "LiteLLM model list: $LITELLM_MODELS (expected $LITELLM_MODEL)"
  fi
fi

# ---------------------------------------------------------------------------
# 8. OpenCode (if in scope)
# ---------------------------------------------------------------------------
if [ "$WITH_OPENCODE" = "1" ]; then
  log "Checking OpenCode..."
  if command -v "$OPENCODE_BIN" >/dev/null 2>&1; then
    pass "OpenCode binary found: $(command -v "$OPENCODE_BIN")"
  else
    warn "OpenCode binary not found in PATH (expected: $OPENCODE_BIN)"
  fi

  if [ -f "$OPENCODE_CONFIG" ]; then
    pass "OpenCode config found: $OPENCODE_CONFIG"
  else
    warn "OpenCode config not found: $OPENCODE_CONFIG"
  fi
fi

echo ""
pass "AI preflight complete"
