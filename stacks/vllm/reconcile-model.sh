#!/usr/bin/env bash
# reconcile-model.sh — enforce "exactly one vLLM model running".
#
# The model that runs is the one OpenCode is configured to use
# (`.model` in ~/.config/opencode/opencode.json, provider prefix stripped).
# Every other registered model container is STOPPED, not slept: a slept model
# can still hold weights in VRAM, which is what starved the 27B into a
# torch.OutOfMemoryError and killed live OpenCode sessions.
#
# Usage:
#   ./reconcile-model.sh                 # enforce the OpenCode preference
#   ./reconcile-model.sh <model>         # enforce an explicit model
#   ./reconcile-model.sh --dry-run       # report, change nothing
#   ./reconcile-model.sh --status        # show running vs awake, change nothing
#
# Exit codes: 0 = invariant holds, 1 = could not establish it, 2 = usage.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/model-registry.yaml"
SWITCH="$SCRIPT_DIR/switch-model.sh"
OPENCODE_CONFIG="${OPENCODE_CONFIG:-$HOME/.config/opencode/opencode.json}"

HOST_IP="${GLASSWING_HOST_IP:-$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' "$SCRIPT_DIR/../infisical/.env" 2>/dev/null | head -n1 | tr -d '"')}"
HOST_IP="${HOST_IP:-192.168.68.62}"
BASE="http://${HOST_IP}"

DRY_RUN=0
STATUS_ONLY=0
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --status)  STATUS_ONLY=1 ;;
    -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "ERROR: unknown option $arg" >&2; exit 2 ;;
    *)  TARGET="$arg" ;;
  esac
done

[[ -f "$REGISTRY" ]] || { echo "ERROR: registry not found: $REGISTRY" >&2; exit 1; }
[[ -x "$SWITCH" ]]   || { echo "ERROR: switcher not found: $SWITCH" >&2; exit 1; }

# ── Parse the registry (same shape switch-model.sh uses) ────────────────
parse_registry() {
  local current_model="" container="" service="" profile="" port="" desc=""
  flush() {
    if [[ -n "$current_model" ]]; then
      printf '%s|%s|%s|%s|%s|%s\n' \
        "$current_model" "$container" "$service" "$profile" "$port" "$desc"
    fi
    return 0
  }
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// /}" ]] && continue
    if [[ "$line" =~ ^[[:space:]]{2}([a-zA-Z0-9._-]+):[[:space:]]*$ ]]; then
      flush
      current_model="${BASH_REMATCH[1]}"
      container=""; service=""; profile=""; port=""; desc=""
      continue
    fi
    [[ -z "$current_model" ]] && continue
    if [[ "$line" =~ ^[[:space:]]{4}container:[[:space:]]*(.+)$ ]]; then
      container="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^[[:space:]]{4}service:[[:space:]]*(.+)$ ]]; then
      service="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^[[:space:]]{4}profile:[[:space:]]*(.+)$ ]]; then
      profile="${BASH_REMATCH[1]//\"/}"
    elif [[ "$line" =~ ^[[:space:]]{4}port:[[:space:]]*(.+)$ ]]; then
      port="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^[[:space:]]{4}description:[[:space:]]*\"(.*)\"[[:space:]]*$ ]]; then
      desc="${BASH_REMATCH[1]}"
    fi
  done < <(awk '/^models:/{found=1;next} found' "$REGISTRY")
  flush
}

container_running() {
  [[ "$(docker inspect "$1" --format='{{.State.Status}}' 2>/dev/null || true)" == "running" ]]
}

model_awake() {
  local port="$1"
  curl -sf --max-time 5 "$BASE:$port/is_sleeping" 2>/dev/null | grep -q '"is_sleeping":false'
}

# ── Resolve the preferred model ─────────────────────────────────────────
if [[ -z "$TARGET" ]]; then
  [[ -r "$OPENCODE_CONFIG" ]] || {
    echo "ERROR: cannot read $OPENCODE_CONFIG (set OPENCODE_CONFIG or pass a model)." >&2
    exit 1
  }
  pref="$(jq -r '.model // empty' "$OPENCODE_CONFIG" 2>/dev/null)"
  [[ -n "$pref" ]] || { echo "ERROR: no .model in $OPENCODE_CONFIG" >&2; exit 1; }
  TARGET="${pref#*/}"          # litellm/qwen3.8-opencode -> qwen3.8-opencode
  echo "OpenCode preference: $pref  ->  $TARGET"
fi

# ── Validate against the registry ───────────────────────────────────────
t_container="" t_service="" t_profile="" t_port=""
while IFS='|' read -r model container service profile port desc; do
  if [[ "$model" == "$TARGET" ]]; then
    t_container="$container"; t_service="$service"; t_profile="$profile"; t_port="$port"
    break
  fi
done < <(parse_registry)

if [[ -z "$t_container" ]]; then
  echo "ERROR: '$TARGET' is not in $REGISTRY. Known models:" >&2
  while IFS='|' read -r model _; do echo "  - $model" >&2; done < <(parse_registry)
  exit 1
fi

# ── Status-only mode ────────────────────────────────────────────────────
if (( STATUS_ONLY )); then
  running=0
  while IFS='|' read -r model container service profile port desc; do
    awake=""
    if container_running "$container"; then
      state="running"
      if model_awake "$port"; then awake=" [awake]"; else awake=" [not awake]"; fi
      running=$((running + 1))
    else
      state="stopped"
    fi
    printf '  %-18s %-28s %-8s%s\n' "$model" "$container" "$state" "$awake"
  done < <(parse_registry)
  echo "Running vLLM containers: $running (want 1: $t_container)"
  (( running == 1 )) && container_running "$t_container" && exit 0
  exit 1
fi

# ── Enforce: stop every non-preferred model ─────────────────────────────
echo "Enforcing single model: $TARGET"
while IFS='|' read -r model container service profile port desc; do
  [[ "$model" == "$TARGET" ]] && continue
  if container_running "$container"; then
    if (( DRY_RUN )); then
      echo "  would stop $model ($container)"
    else
      echo "  stopping $model ($container)"
      docker stop "$container" >/dev/null 2>&1 || echo "  WARNING: could not stop $container" >&2
    fi
  fi
done < <(parse_registry)

if (( DRY_RUN )); then
  echo "Dry run: no changes made."
  exit 0
fi

# ── Ensure the preferred model is awake ─────────────────────────────────
if model_awake "$t_port" && container_running "$t_container"; then
  echo "  $TARGET already awake."
else
  "$SWITCH" "$TARGET"
fi

# ── Verify the invariant ────────────────────────────────────────────────
echo "Verifying..."
running=()
while IFS='|' read -r model container service profile port desc; do
  container_running "$container" && running+=("$container")
done < <(parse_registry)

if (( ${#running[@]} != 1 )); then
  echo "ERROR: expected exactly 1 running vLLM container, found ${#running[@]}: ${running[*]:-none}" >&2
  exit 1
fi
if [[ "${running[0]}" != "$t_container" ]]; then
  echo "ERROR: wrong model running: ${running[0]} (wanted $t_container)" >&2
  exit 1
fi
if ! model_awake "$t_port"; then
  echo "ERROR: $t_container is running but not awake on port $t_port." >&2
  exit 1
fi

echo "OK: only $TARGET is running ($t_container, port $t_port) and it is awake."
