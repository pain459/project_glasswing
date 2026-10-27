#!/usr/bin/env bash
# verify-stacks.sh — Restart each stack one by one and verify it comes up healthy.
#
# Run from the project root on the host where docker is available.
# Usage: ./scripts/verify-stacks.sh [--dry-run]

set -Eeuo pipefail

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Order matters: infrastructure first, then dependencies, then services.
STACKS=(
  otel-collector
  vector
  openobserve
  ollama
  open-notebook
  steel
  opencode
  anythingllm
  flowise
  langfuse
  homepage
  stirling-pdf
  forgejo
  plex
  beszel
  glances
  adguard
  kavita
  uptime-kuma
  cyberchef
  excalidraw
  it-tools
  portainer
  jupyterlab
  dbgate
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { printf "${GREEN}[OK]${NC}   %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
fail() { printf "${RED}[FAIL]${NC} %s\n" "$*"; }

for stack in "${STACKS[@]}"; do
  echo ""
  echo "========================================"
  echo " Restarting: $stack"
  echo "========================================"

  if $DRY_RUN; then
    warn "Dry run — would restart $stack"
    continue
  fi

  # Down
  echo "[INFO] Stopping $stack..."
  if ! make down STACK="$stack" 2>&1; then
    warn "Down failed for $stack (may not have been running)"
  fi

  # Up
  echo "[INFO] Starting $stack..."
  if ! make up STACK="$stack" 2>&1; then
    fail "Up failed for $stack"
    echo ""
    echo "Stopping verification. Fix $stack and re-run."
    exit 1
  fi

  # Quick health check: wait a moment then check container status
  sleep 3
  STATUS=$(docker inspect --format '{{.State.Status}}' "glasswing-${stack}" 2>/dev/null || echo "unknown")
  if [[ "$STATUS" == "running" ]]; then
    log "$stack is running (container: glasswing-${stack})"
  else
    # For multi-service stacks, check by project label
    RUNNING=$(docker ps --filter "label=com.docker.compose.project=glasswing-${stack}" --filter "status=running" -q | wc -l)
    if [[ "$RUNNING" -gt 0 ]]; then
      log "$stack has $RUNNING running container(s)"
    else
      fail "$stack has no running containers"
      exit 1
    fi
  fi
done

echo ""
echo "========================================"
log "All ${#STACKS[@]} stacks restarted successfully"
echo "========================================"
