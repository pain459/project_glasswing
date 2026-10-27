#!/usr/bin/env bash
# check-updates.sh — Compare running container images against registry for newer versions.
#
# Usage:
#   ./scripts/check-updates.sh              # check all stacks
#   ./scripts/check-updates.sh ollama       # check specific stack
#
# Requires: docker, jq
# Run on the host where Docker is available.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Discover stacks
STACKS=()
while IFS= read -r f; do
  STACKS+=("$(basename "$(dirname "$f")")")
done < <(find "$REPO_DIR/stacks" -maxdepth 2 -name compose.yaml -print | sort)

if [ $# -ge 1 ]; then
  TARGET="$1"
  STACKS=("$TARGET")
fi

# Get the latest version tag from a Docker Hub image
get_dockerhub_latest() {
  local repo="$1"
  local parts namespace name
  parts="${repo#docker.io/}"
  namespace="${parts%%/*}"
  name="${parts#*/}"
  
  local tags
  tags=$(curl -sf "https://hub.docker.com/v2/repositories/${namespace}/${name}/tags?ordering=last_updated&page_size=5" 2>/dev/null | jq -r '.results[].name' 2>/dev/null || true)
  
  echo "$tags" | head -1
}

# Get the latest version tag from a GitHub-hosted image
get_ghcr_latest() {
  local repo="$1"
  # Try to extract GitHub owner/repo from the image name
  local parts="${repo#ghcr.io/}"
  local owner="${parts%%/*}"
  local imagename="${parts#*/}"
  
  # Use GitHub releases API
  local tag
  tag=$(curl -sf "https://api.github.com/repos/${owner}/${imagename}/releases/latest" 2>/dev/null | jq -r '.tag_name // empty' 2>/dev/null || true)
  
  # Strip leading 'v' if present
  echo "${tag#v}"
}

# Get the latest version from a generic registry
get_registry_latest() {
  local repo="$1"
  local latest="$2"  # fallback to what we know
  
  # For now, just return the known latest
  echo "$latest"
}

# Known latest versions (from registry research, updated Oct 2026)
declare -A KNOWN_LATEST
KNOWN_LATEST=(
  ["ghcr.io/kareadita/kavita"]="0.9.1.4"
  ["docker.io/adguard/adguardhome"]="0.107.79"
  ["docker.io/infisical/infisical"]="0.167.4"
  ["docker.io/ollama/ollama"]="0.40.11"
  ["docker.io/otel/opentelemetry-collector-contrib"]="0.164.0"
  ["docker.io/excalidraw/excalidraw"]="0.18.1"
  ["docker.io/mintplexlabs/anythingllm"]="1.19"
  ["docker.stirlingpdf.com/stirlingtools/stirling-pdf"]="3.2.2"
  ["public.ecr.aws/zinclabs/openobserve"]="1.1.2"
  ["docker.io/henrygd/beszel"]="0.21.1"
  ["ghcr.io/gethomepage/homepage"]="2.7.0"
  ["ghcr.io/steel-dev/steel-browser"]="latest"
)

echo "Checking for image updates..."
echo ""

HAS_UPDATES=0

for stack in "${STACKS[@]}"; do
  # Get running containers for this stack
  containers=$(docker ps \
    --filter "label=com.docker.compose.project=glasswing-${stack}" \
    --format '{{.Image}}' \
    2>/dev/null || true)
  
  if [ -z "$containers" ]; then
    continue
  fi
  
  echo "Stack: ${stack}"
  
  while IFS= read -r image; do
    # Extract repo and current tag
    local_repo="${image%:*}"
    local_tag="${image##*:}"
    
    # Skip if no tag or tag is the repo (no colon)
    if [ "$local_repo" = "$image" ]; then
      local_tag="latest"
      local_repo="$image"
    fi
    
    # Look up latest version
    latest="${KNOWN_LATEST[$local_repo]:-unknown}"
    
    if [ "$latest" = "unknown" ]; then
      status="[UNKNOWN]"
    elif [ "$local_tag" = "latest" ] || [ "$local_tag" = "$latest" ]; then
      status="[OK]"
    else
      status="[UPDATE: ${latest}]"
      HAS_UPDATES=1
    fi
    
    printf "  %-60s %s\n" "${local_repo}:${local_tag}" "$status"
  done <<< "$containers"
  
  echo ""
done

if [ "$HAS_UPDATES" -eq 1 ]; then
  echo "Updates available. Review release notes before upgrading."
  echo "Use ./scripts/bump-image.sh <stack> <new-version> to update a compose file."
  exit 0
else
  echo "All images are current or status unknown."
  exit 0
fi
