#!/usr/bin/env bash
# Ensure the coding model matches the checked-in Modelfile.
#
# Called by `make ollama-model` and by the Ollama stack post-up hook, so a
# normal `make up STACK=ollama` builds the model without a second command.
#
# The base model is pulled automatically when it is missing. The derived model
# is only rebuilt when its effective parameters differ from the Modelfile;
# set FORCE=1 to rebuild anyway.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

OLLAMA_CONTAINER="${OLLAMA_CONTAINER:-glasswing-ollama}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3.6-opencode:latest}"
OLLAMA_BASE_MODEL="${OLLAMA_BASE_MODEL:-qwen3.6:27b}"
OLLAMA_MODELFILE="${OLLAMA_MODELFILE:-stacks/ollama/models/qwen3.6-opencode.Modelfile}"
FORCE="${FORCE:-0}"

log() { printf '[INFO] %s\n' "$*"; }
die() { printf '[FAIL] %s\n' "$*" >&2; exit 1; }

[ -f "$OLLAMA_MODELFILE" ] || die "Missing Modelfile: $OLLAMA_MODELFILE"
[ "$(docker inspect -f '{{.State.Running}}' "$OLLAMA_CONTAINER" 2>/dev/null || true)" = "true" ] \
  || die "$OLLAMA_CONTAINER is not running; run: make up STACK=ollama"

if ! docker exec "$OLLAMA_CONTAINER" ollama show "$OLLAMA_BASE_MODEL" >/dev/null 2>&1; then
  log "Base model $OLLAMA_BASE_MODEL is missing; pulling it"
  docker exec "$OLLAMA_CONTAINER" ollama pull "$OLLAMA_BASE_MODEL"
fi

current_modelfile=""
if docker exec "$OLLAMA_CONTAINER" ollama show "$OLLAMA_MODEL" >/dev/null 2>&1; then
  current_modelfile="$(docker exec "$OLLAMA_CONTAINER" \
    ollama show "$OLLAMA_MODEL" --modelfile 2>/dev/null || true)"
fi

current_param() {
  printf '%s\n' "$current_modelfile" | tr -d '\r' \
    | awk -v n="$1" '$1=="PARAMETER" && $2==n {print $3; exit}'
}

file_param() {
  awk -v n="$1" '$1=="PARAMETER" && $2==n {print $3; exit}' "$OLLAMA_MODELFILE"
}

needs_build=1
if [ "$FORCE" != "1" ] && [ -n "$current_modelfile" ]; then
  needs_build=0
  for name in num_ctx num_predict temperature; do
    want="$(file_param "$name")"
    have="$(current_param "$name")"
    [ -n "$want" ] || die "Modelfile is missing PARAMETER $name"
    if [ "$want" != "$have" ]; then
      log "$name is '${have:-unset}', expected '$want'; rebuilding"
      needs_build=1
      break
    fi
  done
fi

if [ "$needs_build" = "0" ]; then
  log "$OLLAMA_MODEL already matches $OLLAMA_MODELFILE"
  exit 0
fi

log "Building $OLLAMA_MODEL from $OLLAMA_BASE_MODEL"
sed "s|^FROM .*|FROM $OLLAMA_BASE_MODEL|" "$OLLAMA_MODELFILE" \
  | docker exec -i "$OLLAMA_CONTAINER" sh -c \
      'cat > /tmp/Modelfile && ollama create "$1" -f /tmp/Modelfile; rc=$?; rm -f /tmp/Modelfile; exit $rc' \
      sh "$OLLAMA_MODEL"
log "Built $OLLAMA_MODEL"
