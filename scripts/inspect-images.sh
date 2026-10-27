#!/usr/bin/env bash
# inspect-images.sh — Show what image each Glasswing stack container is actually running.
#
# Usage:
#   ./scripts/inspect-images.sh            # all stacks
#   ./scripts/inspect-images.sh ollama     # specific stack
#
# Output format: stack  image:tag  created
#
# Run on the host where Docker is available.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Discover stacks from compose files
STACKS=()
while IFS= read -r f; do
  STACKS+=("$(basename "$(dirname "$f")")")
done < <(find "$REPO_DIR/stacks" -maxdepth 2 -name compose.yaml -print | sort)

if [ $# -ge 1 ]; then
  TARGET="$1"
  STACKS=("$TARGET")
fi

printf "%-20s %-70s %s\n" "STACK" "IMAGE" "CREATED"
printf "%-20s %-70s %s\n" "-----" "-----" "-------"

for stack in "${STACKS[@]}"; do
  # Query Docker for containers belonging to this stack
  while IFS=$'\t' read -r image created; do
    printf "%-20s %-70s %s\n" "$stack" "$image" "$created"
  done < <(
    docker ps \
      --filter "label=com.docker.compose.project=glasswing-${stack}" \
      --format '{{.Image}}\t{{.RunningFor}}' \
      2>/dev/null || true
  )
done
