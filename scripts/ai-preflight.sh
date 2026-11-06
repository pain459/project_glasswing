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
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3.8-opencode:latest}"
OLLAMA_FAILBACK_MODEL="${OLLAMA_FAILBACK_MODEL:-qwen3.6-opencode:latest}"

# LiteLLM is the only path OpenCode uses; Ollama is the backend behind it.
LITELLM_CONTAINER="${LITELLM_CONTAINER:-glasswing-litellm}"
LITELLM_URL="${LITELLM_URL:-http://192.168.68.62:3035}"
LITELLM_MODEL="${LITELLM_MODEL:-qwen3.8-opencode}"
LITELLM_FAILBACK_MODEL="${LITELLM_FAILBACK_MODEL:-qwen3.6}"
LITELLM_MASTER_KEY="${LITELLM_MASTER_KEY:-}"
if [ -z "$LITELLM_MASTER_KEY" ] && [ -f "$ROOT_DIR/stacks/litellm/litellm-config.registry" ]; then
  LITELLM_MASTER_KEY="$(sed -n 's/^LITELLM_MASTER_KEY=//p' \
    "$ROOT_DIR/stacks/litellm/litellm-config.registry" | head -n1)"
fi

OPENCODE_BIN="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"
OPENCODE_CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.json}"
OPENCODE_MODEL="litellm/$LITELLM_MODEL"

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

get_litellm() {
  local timeout=$1 url=$2
  curl -fsS --max-time "$timeout" \
    -H "Authorization: Bearer $LITELLM_MASTER_KEY" "$url"
}

post_litellm() {
  local timeout=$1 payload=$2 url=$3
  printf '%s' "$payload" | curl -fsS --max-time "$timeout" \
    -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
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
check_env OLLAMA_KV_CACHE_TYPE q4_0
check_env OLLAMA_NUM_PARALLEL 1
check_env OLLAMA_MAX_LOADED_MODELS 2
check_env OLLAMA_KEEP_ALIVE 30m

log "Model parameters ($OLLAMA_MODEL)"
if modelfile="$(docker exec "$OLLAMA_CONTAINER" ollama show "$OLLAMA_MODEL" --modelfile 2>/dev/null)"; then
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
  fail "Model $OLLAMA_MODEL is not present (run: make ollama-model)"
fi

log "Failback model ($OLLAMA_FAILBACK_MODEL)"
# The failback must carry the same budget as the primary. It is built on demand
# (make ollama-failback), so a missing model is a warning, not a deploy failure.
if failback_modelfile="$(docker exec "$OLLAMA_CONTAINER" \
    ollama show "$OLLAMA_FAILBACK_MODEL" --modelfile 2>/dev/null)"; then
  failback_param() {
    printf '%s\n' "$failback_modelfile" | tr -d '\r' \
      | awk -v n="$1" '$1=="PARAMETER" && $2==n {print $3; exit}'
  }
  failback_ctx="$(failback_param num_ctx)"
  failback_output="$(failback_param num_predict)"
  failback_temp="$(failback_param temperature)"
  if [ "$failback_ctx" = "$EXPECTED_CONTEXT" ] \
      && [ "$failback_output" = "$EXPECTED_OUTPUT" ] \
      && [ "$failback_temp" = "$EXPECTED_TEMPERATURE" ]; then
    pass "$OLLAMA_FAILBACK_MODEL matches the primary budget (ctx $failback_ctx, output $failback_output, temp $failback_temp)"
  else
    warn "failback params are ctx='${failback_ctx:-unset}' output='${failback_output:-unset}' temp='${failback_temp:-unset}', expected $EXPECTED_CONTEXT/$EXPECTED_OUTPUT/$EXPECTED_TEMPERATURE (run: make ollama-failback)"
  fi
else
  warn "$OLLAMA_FAILBACK_MODEL is not built; run: make ollama-failback"
fi

if [ "$WITH_OPENCODE" = "1" ]; then
  log "LiteLLM gateway"
  if container_running "$LITELLM_CONTAINER"; then
    pass "$LITELLM_CONTAINER is running"
  else
    fail "$LITELLM_CONTAINER is not running (make up STACK=litellm)"
  fi

  if [ -z "$LITELLM_MASTER_KEY" ]; then
    fail "LITELLM_MASTER_KEY is unavailable; export it or populate stacks/litellm/litellm-config.registry"
  elif models_json="$(get_litellm 10 "$LITELLM_URL/v1/models" 2>/dev/null)" \
      && printf '%s' "$models_json" | jq -e --arg m "$LITELLM_MODEL" \
        '[.data[]?.id] | index($m) != null' >/dev/null 2>&1; then
    pass "gateway exposes $LITELLM_MODEL"
  else
    fail "gateway does not expose '$LITELLM_MODEL' at $LITELLM_URL/v1/models"
  fi

  if failback_models="$(get_litellm 10 "$LITELLM_URL/v1/models" 2>/dev/null)" \
      && printf '%s' "$failback_models" | jq -e --arg m "$LITELLM_FAILBACK_MODEL" \
        '[.data[]?.id] | index($m) != null' >/dev/null 2>&1; then
    pass "gateway exposes failback $LITELLM_FAILBACK_MODEL"
  else
    fail "gateway does not expose failback '$LITELLM_FAILBACK_MODEL' at $LITELLM_URL/v1/models"
  fi

  log "Host OpenCode configuration"
  if [ -x "$OPENCODE_BIN" ]; then
    pass "host OpenCode binary is executable: $OPENCODE_BIN"
  else
    fail "host OpenCode binary is missing or not executable: $OPENCODE_BIN"
  fi

  if config_json="$(grep -v '^[[:space:]]*//' "$OPENCODE_CONFIG" 2>/dev/null)" \
      && printf '%s' "$config_json" | jq -e . >/dev/null 2>&1; then
    cfg() { printf '%s' "$config_json" | jq -r --arg m "$LITELLM_MODEL" "$1"; }

    cfg_model="$(cfg '.model')"
    if [ "$cfg_model" = "$OPENCODE_MODEL" ]; then
      pass "default model is $cfg_model"
    else
      fail "default model is '${cfg_model:-unset}', expected '$OPENCODE_MODEL'"
    fi

    cfg_pkg="$(cfg '.providers.litellm.package // empty')"
    if [ "$cfg_pkg" = "@opencode/ai/providers/openai-compatible" ]; then
      pass "provider package is $cfg_pkg"
    else
      fail "provider package is '${cfg_pkg:-unset}', expected '@opencode/ai/providers/openai-compatible'"
    fi

    cfg_base="$(cfg '.providers.litellm.settings.baseURL // empty')"
    if [ "$cfg_base" = "$LITELLM_URL/v1" ]; then
      pass "provider baseURL is $cfg_base"
    else
      fail "provider baseURL is '${cfg_base:-unset}', expected '$LITELLM_URL/v1'"
    fi

    cfg_key="$(cfg '.providers.litellm.settings.apiKey // empty')"
    if [ -n "$cfg_key" ]; then
      pass "provider API key is set"
    else
      fail "provider API key is unset; set LITELLM_MASTER_KEY in $OPENCODE_CONFIG"
    fi

    cfg_context="$(cfg '.providers.litellm.models[$m].limit.context // empty')"
    cfg_output="$(cfg '.providers.litellm.models[$m].limit.output // empty')"
    cfg_temp="$(cfg '.providers.litellm.models[$m].body.temperature // empty')"
    cfg_reasoning="$(cfg '.providers.litellm.models[$m].body.reasoning_effort // empty')"

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
      && [ "$effective_model" = "$OPENCODE_MODEL" ]; then
    pass "effective default model is $effective_model"
  else
    fail "effective default model is '${effective_model:-unavailable}', expected '$OPENCODE_MODEL'"
  fi

  log "Host OpenCode -> LiteLLM connectivity"
  if get_litellm 10 "$LITELLM_URL/v1/models" >/dev/null 2>&1; then
    pass "host OpenCode endpoint is reachable at $LITELLM_URL"
  else
    fail "host cannot reach $LITELLM_URL"
  fi
fi

# Sends the same request OpenCode sends: the OpenAI-compatible endpoint, the
# configured output budget, temperature and disabled reasoning.
chat_test() {
  local think=$1 budget=$2 payload
  payload="$(jq -cn \
    --arg model "$OLLAMA_MODEL" \
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
  log "LiteLLM gateway round trip"
  gateway_payload="$(jq -cn \
    --arg model "$LITELLM_MODEL" \
    --argjson temperature "$EXPECTED_TEMPERATURE" \
    '{
      model: $model,
      messages: [{
        role: "user",
        content: "Write a Python function that returns the reverse of a string. Reply with the code only."
      }],
      stream: false,
      max_tokens: 512,
      temperature: $temperature,
      reasoning_effort: "none"
    }')"

  # Watermark of the newest spend row before the request, so the check below can
  # assert that THIS request was recorded rather than trusting wall-clock time.
  spend_watermark="$(get_litellm 10 "$LITELLM_URL/spend/logs" 2>/dev/null \
    | jq -r --arg m "$LITELLM_MODEL" \
      '[.[]? | select(.model_group == $m) | .created_at] | max // "1970-01-01T00:00:00Z"' 2>/dev/null \
    || echo "1970-01-01T00:00:00Z")"

  if gw_response="$(post_litellm 600 "$gateway_payload" "$LITELLM_URL/v1/chat/completions" 2>/dev/null)"; then
    gw_done="$(printf '%s' "$gw_response" | jq -r '.choices[0].finish_reason // "missing"')"
    gw_total="$(printf '%s' "$gw_response" | jq -r '.usage.total_tokens // 0')"
    gw_content="$(printf '%s' "$gw_response" | jq -r '.choices[0].message.content // ""')"
    if [ "$gw_done" = "stop" ] && [ -n "$gw_content" ] \
        && printf '%s' "$gw_total" | grep -Eq '^[0-9]+$' && [ "$gw_total" -gt 0 ]; then
      pass "gateway returned a complete answer ($gw_total tokens)"
    else
      fail "gateway response incomplete (finish_reason=$gw_done, tokens=$gw_total)"
    fi

    # LiteLLM flushes spend rows in batches, so the row for this request may land
    # several seconds after the response. Compare against the watermark captured
    # before the request instead of against wall-clock time.
    recorded_spend=""
    for _ in $(seq 1 12); do
      latest_spend="$(get_litellm 10 "$LITELLM_URL/spend/logs" 2>/dev/null \
        | jq -r --arg m "$LITELLM_MODEL" \
          '[.[]? | select(.model_group == $m) | .created_at] | max // empty' 2>/dev/null || true)"
      if [ -n "$latest_spend" ] && [ "$latest_spend" \> "$spend_watermark" ]; then
        recorded_spend="$latest_spend"
        break
      fi
      sleep 5
    done
    if [ -n "$recorded_spend" ]; then
      pass "spend log recorded this request ($recorded_spend)"
    else
      fail "no new spend log for '$LITELLM_MODEL' after 60s (latest: ${latest_spend:-none})"
    fi
  else
    fail "gateway chat completion request failed"
  fi
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
  gpu_pct="$(printf '%s' "$ps_json" | jq -r --arg m "$OLLAMA_MODEL" '
    [.models[] | select(.name == $m) | (.size_vram / .size * 1000 | floor / 10)] | first // empty')"
  if [ -z "$gpu_pct" ]; then
    fail "$OLLAMA_MODEL is not loaded, so residency cannot be verified"
  elif [ "$gpu_pct" = "100" ]; then
    pass "coding model is fully resident on the GPU"
  else
    fail "coding model is only ${gpu_pct}% on the GPU; partial offload roughly halves throughput. Free VRAM for another process, lower num_ctx, or use a more aggressive OLLAMA_KV_CACHE_TYPE"
  fi
else
  warn "no model is loaded yet; run the preflight again while a session is warm"
fi

log "Embedding co-residency"
EMBED_MODEL="${OLLAMA_EMBED_MODEL:-nomic-embed-text:latest}"
embed_payload="$(jq -cn --arg m "$EMBED_MODEL" '{model: $m, input: "preflight co-residency check"}')"
if embed_response="$(post_json_url 180 "$embed_payload" "$OLLAMA_URL/api/embed" 2>/dev/null)" \
    && printf '%s' "$embed_response" | jq -e '.embeddings[0] | length > 0' >/dev/null 2>&1; then
  embed_dims="$(printf '%s' "$embed_response" | jq -r '.embeddings[0] | length')"
  pass "$EMBED_MODEL returned a ${embed_dims}-dimension embedding"

  # Open Notebook writes notes while a coding session is warm. With
  # OLLAMA_MAX_LOADED_MODELS=1 the embed request evicts the 19 GB coding model,
  # forcing a cold reload on the next prompt.
  if co_ps="$(get_url 10 "$OLLAMA_URL/api/ps" 2>/dev/null)" \
      && printf '%s' "$co_ps" | jq -e --arg q "$OLLAMA_MODEL" --arg e "$EMBED_MODEL" \
        '([.models[].name] | index($q) != null) and ([.models[].name] | index($e) != null)' \
        >/dev/null 2>&1; then
    co_state="$(printf '%s' "$co_ps" | jq -r --arg q "$OLLAMA_MODEL" --arg e "$EMBED_MODEL" \
      '[.models[] | select(.name == $q or .name == $e)
        | "\(.name) \(if .size > 0 then (.size_vram / .size * 1000 | floor / 10) else 0 end)%"] | join(", ")')"
    pass "coding and embedding models are resident together ($co_state)"
  else
    fail "the embedding request evicted the coding model; OLLAMA_MAX_LOADED_MODELS must allow both"
  fi
else
  warn "$EMBED_MODEL is unavailable; skipping the co-residency check (make ollama-model pulls it)"
fi

log "VRAM headroom"
# Residency is decided at load and the KV cache is preallocated for the whole
# context, so VRAM does not grow with conversation length (measured: +48 MiB
# across a 66k-token prompt). What headroom buys is a stable load-time fit when
# another process briefly holds GPU memory.
MIN_FREE_MIB="${MIN_FREE_MIB:-512}"
if free_mib="$(docker exec "$OLLAMA_CONTAINER" \
    nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null | head -n1 | tr -d ' ')"; then
  if [ -n "$free_mib" ] && [ "$free_mib" -ge "$MIN_FREE_MIB" ]; then
    pass "${free_mib} MiB free on the GPU (minimum ${MIN_FREE_MIB} MiB)"
  else
    fail "only ${free_mib:-unknown} MiB free on the GPU; need at least ${MIN_FREE_MIB} MiB of load-time slack"
  fi
else
  warn "cannot read GPU free memory from inside the container"
fi

log "Summary"
printf '  %d passed, %d failed\n' "$pass_count" "$fail_count"
if [ "$fail_count" -ne 0 ]; then
  printf '  Preflight failed.\n' >&2
  exit 1
fi
printf '  Preflight passed.\n'
