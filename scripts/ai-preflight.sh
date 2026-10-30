#!/usr/bin/env bash
# Pathfinder AI inference preflight.
#
# Usage:
#   ai-preflight.sh --ollama    Ollama only; used by `make up STACK=ollama`
#   ai-preflight.sh --opencode  Ollama plus host-installed OpenCode
#   ai-preflight.sh --all       Same as --opencode (default)
#
# Verifies:
#   - the Ollama container is running
#   - Ollama can see the host GPU
#   - the agreed runtime flags are set in the Ollama container
#   - the coding model was built with the agreed context and output limits
#   - the OpenCode limits, temperature, reasoning and compaction agree with it
#   - host OpenCode can reach Ollama
#   - the effective host OpenCode configuration selects the expected model
#   - a real standalone host OpenCode prompt completes with the default model
#   - a small coding prompt returns a complete answer with thinking disabled
#   - GPU residency is measured and reported
#
# Read-only: it does not create, pull, restart, or delete anything.
set -Eeuo pipefail

case "${1:-}" in
  ""|--all|--opencode) SCOPE="opencode" ;;
  --ollama)            SCOPE="ollama" ;;
  -h|--help)
    printf 'usage: %s [--ollama|--opencode|--all]\n' "$0"
    exit 0
    ;;
  *) printf 'usage: %s [--ollama|--opencode|--all]\n' "$0" >&2; exit 2 ;;
esac

WITH_OPENCODE=0
[ "$SCOPE" = "opencode" ] && WITH_OPENCODE=1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

OLLAMA_CONTAINER="${OLLAMA_CONTAINER:-glasswing-ollama}"
OLLAMA_URL="${OLLAMA_URL:-http://192.168.68.62:11434}"
MODEL="${OLLAMA_MODEL:-qwen3.6-opencode:latest}"
OPENCODE_BIN="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"
OPENCODE_CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.json}"

EXPECTED_CONTEXT=131072
EXPECTED_OUTPUT=32768
EXPECTED_TEMPERATURE=0.3

pass_count=0
fail_count=0

log()  { printf '\n==> %s\n' "$*"; }
pass() { pass_count=$((pass_count + 1)); printf '  [PASS] %s\n' "$*"; }
fail() { fail_count=$((fail_count + 1)); printf '  [FAIL] %s\n' "$*"; }
warn() { printf '  [WARN] %s\n' "$*"; }
info() { printf '  [INFO] %s\n' "$*"; }

container_running() {
  [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = "true" ]
}

get_url() {
  local timeout=$1 url=$2
  curl -fsS --max-time "$timeout" "$url"
}

post_json_url() {
  local timeout=$1 payload=$2 url=$3
  printf '%s' "$payload" | curl -fsS --max-time "$timeout" \
    -H 'Content-Type: application/json' --data-binary @- "$url"
}

printf 'Inference preflight (scope: %s)\n' "$SCOPE"

log "Containers"
if container_running "$OLLAMA_CONTAINER"; then
  pass "$OLLAMA_CONTAINER is running"
else
  fail "$OLLAMA_CONTAINER is not running (make up STACK=ollama)"
fi

log "GPU access"
if gpu="$(docker exec "$OLLAMA_CONTAINER" \
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null)"; then
  pass "Ollama sees the host GPU: $gpu"
else
  fail "Ollama cannot run nvidia-smi; check NVIDIA Container Toolkit and 'gpus: all'"
fi

log "Ollama runtime settings"
ollama_env="$(docker exec "$OLLAMA_CONTAINER" env 2>/dev/null || true)"
check_env() {
  local name=$1 expected=$2 actual
  actual="$(printf '%s\n' "$ollama_env" | sed -n "s/^${name}=//p" | head -n1)"
  if [ "$actual" = "$expected" ]; then
    pass "$name=$actual"
  else
    fail "$name is '${actual:-unset}', expected '$expected'"
  fi
}
check_env OLLAMA_FLASH_ATTENTION 1
check_env OLLAMA_KV_CACHE_TYPE q8_0
check_env OLLAMA_NUM_PARALLEL 1
check_env OLLAMA_MAX_LOADED_MODELS 1
check_env OLLAMA_KEEP_ALIVE 30m

log "Model parameters ($MODEL)"
if modelfile="$(docker exec "$OLLAMA_CONTAINER" ollama show "$MODEL" --modelfile 2>/dev/null)"; then
  check_param() {
    local name=$1 expected=$2 actual
    actual="$(printf '%s\n' "$modelfile" | tr -d '\r' \
      | awk -v n="$name" '$1=="PARAMETER" && $2==n {print $3; exit}')"
    if [ "$actual" = "$expected" ]; then
      pass "$name $actual"
    else
      fail "$name is '${actual:-unset}', expected '$expected' (run: make ollama-model)"
    fi
  }
  check_param num_ctx "$EXPECTED_CONTEXT"
  check_param num_predict "$EXPECTED_OUTPUT"
  check_param temperature "$EXPECTED_TEMPERATURE"
else
  fail "Model $MODEL is not present (run: make ollama-model)"
fi

if [ "$WITH_OPENCODE" = "1" ]; then
  log "Host OpenCode configuration"
  if [ -x "$OPENCODE_BIN" ]; then
    pass "host OpenCode binary is executable: $OPENCODE_BIN"
  else
    fail "host OpenCode binary is missing or not executable: $OPENCODE_BIN"
  fi

  if config_json="$(grep -v '^[[:space:]]*//' "$OPENCODE_CONFIG" 2>/dev/null)" \
      && printf '%s' "$config_json" | jq -e . >/dev/null 2>&1; then
    cfg() { printf '%s' "$config_json" | jq -r --arg m "$MODEL" "$1"; }

    cfg_model="$(cfg '.model')"
    if [ "$cfg_model" = "ollama/$MODEL" ]; then
      pass "default model is $cfg_model"
    else
      fail "default model is '${cfg_model:-unset}', expected 'ollama/$MODEL'"
    fi

    cfg_context="$(cfg '.providers.ollama.models[$m].limit.context // empty')"
    cfg_output="$(cfg '.providers.ollama.models[$m].limit.output // empty')"
    cfg_temp="$(cfg '.providers.ollama.models[$m].body.temperature // empty')"
    cfg_reasoning="$(cfg '.providers.ollama.models[$m].body.reasoning_effort // empty')"

    [ "$cfg_context" = "$EXPECTED_CONTEXT" ] \
      && pass "limit.context $cfg_context" \
      || fail "limit.context is '${cfg_context:-unset}', expected '$EXPECTED_CONTEXT'"
    [ "$cfg_output" = "$EXPECTED_OUTPUT" ] \
      && pass "limit.output $cfg_output" \
      || fail "limit.output is '${cfg_output:-unset}', expected '$EXPECTED_OUTPUT'"
    [ "$cfg_temp" = "$EXPECTED_TEMPERATURE" ] \
      && pass "request temperature $cfg_temp" \
      || fail "request temperature is '${cfg_temp:-unset}', expected '$EXPECTED_TEMPERATURE'"

    case "$cfg_reasoning" in
      none|false) pass "reasoning_effort $cfg_reasoning" ;;
      *) fail "reasoning_effort is '${cfg_reasoning:-unset}', expected 'none'" ;;
    esac

    cfg_auto="$(cfg '.compaction.auto')"
    cfg_keep="$(cfg '.compaction.keep.tokens // empty')"
    cfg_buffer="$(cfg '.compaction.buffer // empty')"
    if [ "$cfg_auto" = "true" ] && [ "$cfg_buffer" = "20000" ]; then
      pass "compaction auto, keep ${cfg_keep:-unset}, buffer $cfg_buffer"
    else
      fail "compaction is auto='${cfg_auto:-unset}' buffer='${cfg_buffer:-unset}', expected auto=true buffer=20000"
    fi
  else
    fail "cannot parse $OPENCODE_CONFIG"
  fi

  if [ -x "$OPENCODE_BIN" ] \
      && effective_config="$($OPENCODE_BIN debug config 2>/dev/null)" \
      && effective_model="$(printf '%s' "$effective_config" | jq -r \
        '[.[].info.model | select(.providerID != null)][0] | "\(.providerID)/\(.model)"' 2>/dev/null)" \
      && [ "$effective_model" = "ollama/$MODEL" ]; then
    pass "effective default model is $effective_model"
  else
    fail "effective default model is '${effective_model:-unavailable}', expected 'ollama/$MODEL'"
  fi

  log "Host OpenCode -> Ollama connectivity"
  if curl -fsS --max-time 10 "$OLLAMA_URL/v1/models" >/dev/null 2>&1; then
    pass "host OpenCode endpoint is reachable at $OLLAMA_URL"
  else
    fail "host cannot reach $OLLAMA_URL"
  fi
fi

# Sends the same request OpenCode sends: the OpenAI-compatible endpoint, the
# configured output budget, temperature and disabled reasoning.
chat_test() {
  local think=$1 budget=$2 payload
  payload="$(jq -cn \
    --arg model "$MODEL" \
    --argjson think "$think" \
    --argjson budget "$budget" \
    --argjson temperature "$EXPECTED_TEMPERATURE" \
    '{
      model: $model,
      messages: [{
        role: "user",
        content: "Write a Python function that returns the reverse of a string. Reply with the code only."
      }],
      stream: false,
      max_tokens: $budget,
      temperature: $temperature,
      reasoning_effort: (if $think then "medium" else "none" end)
    }')"
  post_json_url 600 "$payload" "$OLLAMA_URL/v1/chat/completions" 2>/dev/null
}

log "Non-truncated coding response (thinking disabled)"
if response="$(chat_test false 512)"; then
  done_reason="$(printf '%s' "$response" | jq -r '.choices[0].finish_reason // "missing"')"
  completion="$(printf '%s' "$response" | jq -r '.usage.completion_tokens // 0')"
  content="$(printf '%s' "$response" | jq -r '.choices[0].message.content // ""')"
  reasoning="$(printf '%s' "$response" | jq -r '.choices[0].message.reasoning // .choices[0].message.reasoning_content // ""')"

  if [ "$done_reason" = "stop" ]; then
    pass "finish_reason=stop"
  else
    fail "finish_reason=$done_reason (generation budget exhausted or model error)"
  fi
  if [ -n "$content" ]; then
    pass "non-empty answer ($completion completion tokens)"
  else
    fail "empty answer"
  fi
  if [ -z "$reasoning" ]; then
    pass "no thinking trace"
  else
    warn "model returned a thinking trace despite reasoning_effort=none"
  fi
else
  fail "chat completion request failed"
fi

if [ "$WITH_OPENCODE" = "1" ]; then
  log "Native OpenCode default-model prompt"
  if [ -x "$OPENCODE_BIN" ] \
      && opencode_response="$(timeout 600 "$OPENCODE_BIN" --standalone run --auto --format json \
        'Reply with exactly HOST_OPENCODE_OK and nothing else.' 2>/dev/null)" \
      && printf '%s\n' "$opencode_response" | jq -Rr 'fromjson? | select(.type == "text") | .part.text' \
        | grep -Fxq 'HOST_OPENCODE_OK'; then
    pass "host OpenCode completed a standalone prompt with its default model"
  else
    fail "host OpenCode standalone default-model prompt failed"
  fi
fi

log "Thinking-on comparison (informational)"
if response="$(chat_test true 512)"; then
  done_reason="$(printf '%s' "$response" | jq -r '.choices[0].finish_reason // "missing"')"
  completion="$(printf '%s' "$response" | jq -r '.usage.completion_tokens // 0')"
  reasoning_len="$(printf '%s' "$response" \
    | jq -r '(.choices[0].message.reasoning // .choices[0].message.reasoning_content // "") | length')"
  info "thinking on: finish_reason=$done_reason, completion_tokens=$completion, reasoning_chars=$reasoning_len"
  info "this is the budget consumption the coding profile avoids"
else
  warn "thinking-on comparison request failed"
fi

log "GPU residency"
ps_json="$(get_url 10 "$OLLAMA_URL/api/ps" 2>/dev/null || true)"
if [ -n "$ps_json" ] && printf '%s' "$ps_json" | jq -e '.models | length > 0' >/dev/null 2>&1; then
  printf '%s' "$ps_json" | jq -r '
    .models[] | "  \(.name): \(.size_vram / 1000000000 * 10 | floor / 10) GB VRAM / \(.size / 1000000000 * 10 | floor / 10) GB total, context \(.context_length), \(if .size > 0 then (.size_vram / .size * 1000 | floor / 10) else 0 end)% GPU"'
  gpu_pct="$(printf '%s' "$ps_json" | jq -r --arg m "$MODEL" '
    [.models[] | select(.name == $m) | (.size_vram / .size * 1000 | floor / 10)] | first // empty')"
  if [ -z "$gpu_pct" ]; then
    warn "$MODEL is not loaded; another model is resident"
  elif [ "$gpu_pct" = "100" ]; then
    pass "coding model is fully resident on the GPU"
  else
    warn "coding model is ${gpu_pct}% on the GPU; compare with the previous ~91% baseline"
  fi
else
  warn "no model is loaded yet; run the preflight again while a session is warm"
fi

log "Summary"
printf '  %d passed, %d failed\n' "$pass_count" "$fail_count"
if [ "$fail_count" -ne 0 ]; then
  printf '  Preflight failed.\n' >&2
  exit 1
fi
printf '  Preflight passed.\n'
