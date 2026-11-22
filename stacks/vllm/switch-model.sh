#!/usr/bin/env bash
# vLLM model switcher — wake one model, sleep the others.
#
# Usage:
#   ./switch-model.sh list              # list available models
#   ./switch-model.sh current           # show which model is awake
#   ./switch-model.sh <model-name>      # switch to a model
#
# Model names, Compose services and profiles come from model-registry.yaml.
# Profiles that share a port are alternative configs of the same model ID, so
# the old container is stopped (to release the port) rather than slept.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/model-registry.yaml"
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"

# Docker publishes these ports on the LAN IP, not loopback.
HOST_IP="${GLASSWING_HOST_IP:-$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' "$SCRIPT_DIR/../infisical/.env" 2>/dev/null | head -n1 | tr -d '"')}"
HOST_IP="${HOST_IP:-192.168.68.62}"
export GLASSWING_HOST_IP="$HOST_IP"
export GLASSWING_NETWORK="${GLASSWING_NETWORK:-glasswing}"
BASE="http://${HOST_IP}"

compose() {
  local profile="$1"
  shift
  if [[ -n "$profile" ]]; then
    docker compose -f "$COMPOSE_FILE" --profile "$profile" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

# ── Parse the registry (simple YAML, no yq dependency) ──────────────────
# Emits: model|container|service|profile|port|description
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

    # Model name (2-space indent under models:)
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
      profile="${BASH_REMATCH[1]}"
      profile="${profile//\"/}"
    elif [[ "$line" =~ ^[[:space:]]{4}port:[[:space:]]*(.+)$ ]]; then
      port="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^[[:space:]]{4}description:[[:space:]]*\"(.*)\"[[:space:]]*$ ]]; then
      desc="${BASH_REMATCH[1]}"
    fi
  done < <(awk '/^models:/{found=1;next} found' "$REGISTRY")
  flush
}

# ── State helpers ────────────────────────────────────────────────────────

container_running() {
  docker inspect "$1" --format='{{.State.Status}}' 2>/dev/null | grep -q '^running$'
}

# /health stays 200 while asleep, so /is_sleeping is authoritative.
is_sleeping() {
  local state
  state=$(curl -sf --max-time 5 "$BASE:$1/is_sleeping" 2>/dev/null || true)
  [[ "$state" == *'"is_sleeping":true'* ]]
}

endpoint_live() {
  curl -sf --max-time 5 "$BASE:$1/health" >/dev/null 2>&1
}

model_awake() {
  endpoint_live "$1" && ! is_sleeping "$1"
}

# ── Commands ─────────────────────────────────────────────────────────────

cmd_list() {
  echo "Available vLLM models:"
  echo ""
  printf "  %-20s %-26s %-16s %-6s %s\n" "MODEL" "CONTAINER" "PROFILE" "PORT" "STATUS"
  printf "  %-20s %-26s %-16s %-6s %s\n" "-----" "---------" "-------" "----" "------"
  while IFS='|' read -r model container service profile port desc; do
    local status="stopped"
    if container_running "$container"; then
      if model_awake "$port"; then status="AWAKE"; else status="asleep"; fi
    fi
    printf "  %-20s %-26s %-16s %-6s %s\n" \
      "$model" "$container" "${profile:-default}" "$port" "$status"
    printf "  %-20s %-26s %-16s %-6s %s\n" "" "" "" "" "$desc"
  done < <(parse_registry)
}

cmd_current() {
  while IFS='|' read -r model container service profile port desc; do
    if container_running "$container" && model_awake "$port"; then
      echo "Current model: $model (container: $container, port: $port, profile: ${profile:-default})"
      return 0
    fi
  done < <(parse_registry)

  echo "No vLLM model is currently awake."
  return 1
}

cmd_switch() {
  local target="${1:?Usage: switch-model.sh <model-name>}"

  local t_container="" t_service="" t_profile="" t_port=""
  while IFS='|' read -r model container service profile port desc; do
    if [[ "$model" == "$target" ]]; then
      t_container="$container"
      t_service="$service"
      t_profile="$profile"
      t_port="$port"
      break
    fi
  done < <(parse_registry)

  if [[ -z "$t_container" ]]; then
    echo "ERROR: model '$target' not found in registry." >&2
    echo "Available models:" >&2
    cmd_list >&2
    return 1
  fi

  echo "Switching to $target ($t_container)..."

  # Step 1: relinquish the GPU. Sleep models on other ports for a fast wake,
  # but STOP anything sharing the target's port so Compose can bind it.
  while IFS='|' read -r model container service profile port desc; do
    [[ "$container" == "$t_container" ]] && continue
    container_running "$container" || continue

    if [[ "$port" == "$t_port" ]]; then
      echo "  Stopping $model ($container) — shares port $t_port..."
      docker stop "$container" >/dev/null
    elif model_awake "$port"; then
      echo "  Sleeping $model ($container)..."
      curl -sf -X POST --max-time 10 "$BASE:$port/sleep" >/dev/null 2>&1 || \
        echo "  WARNING: /sleep failed for $container" >&2
    fi
  done < <(parse_registry)

  # Step 2: wake or start the target.
  local state
  state=$(docker inspect "$t_container" --format='{{.State.Status}}' 2>/dev/null || echo "not_found")
  if [[ "$state" == "running" ]]; then
    if is_sleeping "$t_port"; then
      echo "  Waking $t_container..."
      curl -sf -X POST --max-time 10 "$BASE:$t_port/wake_up" >/dev/null 2>&1 || {
        echo "ERROR: /wake_up failed for $t_container." >&2
        return 1
      }
    fi
  else
    echo "  Starting $t_service via compose (profile: ${t_profile:-default})..."
    compose "$t_profile" up -d --wait --wait-timeout 180 "$t_service"
  fi

  # Step 3: confirm it is actually serving (not merely asleep).
  echo "  Waiting for $target to be healthy..."
  for _ in $(seq 1 90); do
    if model_awake "$t_port"; then
      echo "  $target is awake and healthy."
      return 0
    fi
    sleep 2
  done

  echo "ERROR: $target did not become healthy within 180s." >&2
  return 1
}

# ── Dispatch ─────────────────────────────────────────────────────────────

case "${1:-}" in
  list)
    cmd_list
    ;;
  current)
    cmd_current
    ;;
  "")
    echo "Usage: $0 {list|current|<model-name>}" >&2
    exit 1
    ;;
  *)
    cmd_switch "$1"
    ;;
esac
