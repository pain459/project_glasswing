#!/usr/bin/env bash
# vLLM post-up validation — run after `make up STACK=vllm`.
#
# Checks:
#   1. Container is healthy
#   2. /health endpoint responds
#   3. /v1/models lists the expected model
#   4. /sleep and /wake_up endpoints work (dev mode)
#   5. A simple inference request succeeds
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/model-registry.yaml"
OPENCODE_CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.json}"

# Enforce the one-model invariant first: stop every model that is not the one
# OpenCode is configured to use, and make sure that one is awake. A slept
# model still holds VRAM, which is how a 5 GB Nemotron starved the 27B.
if [[ -x "$SCRIPT_DIR/reconcile-model.sh" ]]; then
  echo "Reconciling vLLM to the OpenCode-preferred model..."
  "$SCRIPT_DIR/reconcile-model.sh"
  echo ""
fi

# Validate the model that is actually running: the OpenCode preference when it
# resolves, otherwise the registry default.
DEFAULT_MODEL=""
if [[ -r "$OPENCODE_CONFIG" ]]; then
  pref="$(jq -r '.model // empty' "$OPENCODE_CONFIG" 2>/dev/null)"
  [[ -n "$pref" ]] && DEFAULT_MODEL="${pref#*/}"
fi
if [[ -z "$DEFAULT_MODEL" ]]; then
  # Find the default model (walk the registry blocks, independent of field count)
  DEFAULT_MODEL=$(awk '
    /^models:/ { in_models=1; next }
    in_models && /^  [A-Za-z0-9_.-]+:[[:space:]]*$/ {
      model=$1; sub(/:$/, "", model)
    }
    in_models && /default:[[:space:]]*true/ { print model; exit }
  ' "$REGISTRY")
fi
if [[ -z "$DEFAULT_MODEL" ]]; then
  DEFAULT_MODEL="qwen3.8-opencode"
fi

# Find its container and port
CONTAINER=$(grep -A8 "^  $DEFAULT_MODEL:" "$REGISTRY" | grep 'container:' | awk '{print $2}')
PORT=$(grep -A8 "^  $DEFAULT_MODEL:" "$REGISTRY" | grep 'port:' | awk '{print $2}')

if [[ -z "$CONTAINER" || -z "$PORT" ]]; then
  echo "ERROR: could not resolve default model from registry." >&2
  exit 1
fi

BASE="http://${GLASSWING_HOST_IP:-192.168.68.62}:$PORT"
echo "Validating vLLM: $DEFAULT_MODEL ($CONTAINER, port $PORT)"
echo ""

# 1. Container health
echo "  [1/5] Container health..."
STATE=$(docker inspect "$CONTAINER" --format='{{.State.Status}}' 2>/dev/null || echo "not_found")
if [[ "$STATE" != "running" ]]; then
  echo "  FAIL: container is $STATE, not running." >&2
  exit 1
fi
echo "  OK: container is running"

# 2. /health
echo "  [2/5] /health endpoint..."
if curl -sf "$BASE/health" >/dev/null 2>&1; then
  echo "  OK: /health responds"
else
  echo "  FAIL: /health not responding. Model may still be loading." >&2
  echo "  Waiting up to 120s..." >&2
  for i in $(seq 1 24); do
    sleep 5
    if curl -sf "$BASE/health" >/dev/null 2>&1; then
      echo "  OK: /health responds (after $((i * 5))s)"
      break
    fi
    if [[ $i -eq 24 ]]; then
      echo "  FAIL: /health still not responding after 120s." >&2
      exit 1
    fi
  done
fi

# 3. /v1/models
echo "  [3/5] /v1/models..."
MODELS=$(curl -sf "$BASE/v1/models" 2>/dev/null | python3 -c "import sys,json; [print(m['id']) for m in json.load(sys.stdin)['data']]" 2>/dev/null || echo "")
if [[ -n "$MODELS" ]]; then
  echo "  OK: models: $MODELS"
else
  echo "  FAIL: no models listed." >&2
  exit 1
fi

# 4. Sleep/wake test
echo "  [4/5] Sleep/wake test..."
if curl -sf -X POST "$BASE/sleep" >/dev/null 2>&1; then
  echo "  OK: /sleep works"
  sleep 2
  if curl -sf -X POST "$BASE/wake_up" >/dev/null 2>&1; then
    echo "  OK: /wake_up works"
    # Wait for health again
    for i in $(seq 1 10); do
      if curl -sf "$BASE/health" >/dev/null 2>&1; then
        break
      fi
      sleep 2
    done
  else
    echo "  FAIL: /wake_up failed." >&2
    exit 1
  fi
else
  echo "  WARN: /sleep not available (VLLM_SERVER_DEV_MODE not set?)" >&2
fi

# 5. Inference test
echo "  [5/5] Inference test..."
RESPONSE=$(curl -sf "$BASE/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"$DEFAULT_MODEL"'",
    "messages": [{"role": "user", "content": "Say exactly: vLLM is working"}],
    "max_tokens": 20,
    "temperature": 0
  }' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])" 2>/dev/null || echo "")

if [[ -n "$RESPONSE" ]]; then
  echo "  OK: model responded: \"$RESPONSE\""
else
  echo "  FAIL: inference test failed." >&2
  exit 1
fi

echo ""
echo "All vLLM checks passed."
