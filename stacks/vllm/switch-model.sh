#!/usr/bin/env bash
# vLLM model switcher — wake one model, sleep the others.
#
# Usage:
#   ./switch-model.sh list              # list available models
#   ./switch-model.sh current           # show which model is awake
#   ./switch-model.sh <model-name>      # switch to a model
#
# Model names come from model-registry.yaml.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$SCRIPT_DIR/model-registry.yaml"

# ── Parse the registry (simple YAML, no yq dependency) ──────────────────
# Extract: model_name, container_name, port
parse_registry() {
  local current_model=""
  while IFS= read -r line; do
    # Skip comments and blank lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// /}" ]] && continue

    # Model name (2-space indent under models:)
    if [[ "$line" =~ ^[[:space:]]{2}([a-zA-Z0-9._-]+):$ ]]; then
      current_model="${BASH_REMATCH[1]}"
      continue
    fi

    # Container name
    if [[ -n "$current_model" && "$line" =~ ^[[:space:]]{4}container:[[:space:]]*(.+)$ ]]; then
      local container="${BASH_REMATCH[1]}"
      # Port
      local port=""
      port=$(grep -A5 "^  $current_model:" "$REGISTRY" | grep 'port:' | awk '{print $2}' || true)
      echo "$current_model|$container|$port"
      current_model=""
    fi
  done < <(awk '/^models:/{found=1;next} found' "$REGISTRY")
}

# ── Commands ─────────────────────────────────────────────────────────────

cmd_list() {
  echo "Available vLLM models:"
  echo ""
  printf "  %-25s %-30s %-6s %s\n" "MODEL" "CONTAINER" "PORT" "DESCRIPTION"
  printf "  %-25s %-30s %-6s %s\n" "-----" "---------" "----" "-----------"
  while IFS='|' read -r model container port; do
    local desc
    desc=$(grep -A5 "^  $model:" "$REGISTRY" | grep 'description:' | sed 's/.*"\(.*\)".*/\1/' || echo "")
    local status="asleep"
    if docker inspect "$container" --format='{{.State.Status}}' 2>/dev/null | grep -q running; then
      # Check if it's awake (not sleeping) by hitting /health
      if curl -sf "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
        status="AWAKE"
      fi
    fi
    printf "  %-25s %-30s %-6s %s\n" "$model" "$container" "$port" "$desc"
    printf "  %-25s %-30s %-6s %s\n" "" "" "" "[$status]"
  done < <(parse_registry)
}

cmd_current() {
  local found=""
  while IFS='|' read -r model container port; do
    if curl -sf "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
      found="$model"
      echo "Current model: $model (container: $container, port: $port)"
      return 0
    fi
  done < <(parse_registry)

  if [[ -z "$found" ]]; then
    echo "No vLLM model is currently awake."
    return 1
  fi
}

cmd_switch() {
  local target="${1:?Usage: switch-model.sh <model-name>}"

  # Find the target in the registry
  local target_container="" target_port=""
  while IFS='|' read -r model container port; do
    if [[ "$model" == "$target" ]]; then
      target_container="$container"
      target_port="$port"
      break
    fi
  done < <(parse_registry)

  if [[ -z "$target_container" ]]; then
    echo "ERROR: model '$target' not found in registry." >&2
    echo "Available models:" >&2
    cmd_list >&2
    return 1
  fi

  echo "Switching to $target ($target_container)..."

  # Step 1: Sleep all awake vLLM containers (except the target)
  while IFS='|' read -r model container port; do
    if [[ "$model" == "$target" ]]; then
      continue
    fi
    if docker inspect "$container" --format='{{.State.Status}}' 2>/dev/null | grep -q running; then
      if curl -sf "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
        echo "  Sleeping $model ($container)..."
        curl -sf -X POST "http://127.0.0.1:$port/sleep" >/dev/null 2>&1 || true
      fi
    fi
  done < <(parse_registry)

  # Step 2: Make sure the target container is running
  local container_state
  container_state=$(docker inspect "$target_container" --format='{{.State.Status}}' 2>/dev/null || echo "not_found")

  if [[ "$container_state" == "not_found" || "$container_state" == "created" ]]; then
    echo "  Starting $target_container..."
    docker start "$target_container" 2>/dev/null || {
      echo "  Container not found. Starting via compose..."
      cd "$SCRIPT_DIR"
      docker compose up -d "$target_container"
    }
  elif [[ "$container_state" == "exited" ]]; then
    echo "  Starting $target_container..."
    docker start "$target_container"
  fi

  # Step 3: Wait for health
  echo "  Waiting for $target to be healthy..."
  local retries=30
  for i in $(seq 1 $retries); do
    if curl -sf "http://127.0.0.1:$target_port/health" >/dev/null 2>&1; then
      echo "  $target is awake and healthy."
      return 0
    fi
    sleep 2
  done

  echo "ERROR: $target did not become healthy within $((retries * 2))s." >&2
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
