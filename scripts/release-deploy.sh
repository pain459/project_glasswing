#!/usr/bin/env bash
#
# release-deploy.sh — Deploy a Glasswing release bundle offline.
#
# This script deploys a previously built release bundle on any host
# with zero network dependency. It:
#   1. Loads Docker images from the bundle's tarball
#   2. Verifies image integrity against the manifest
#   3. Deploys all stacks using patched compose files
#
# Usage:
#   ./scripts/release-deploy.sh [--dry-run]
#
# Run from the extracted bundle directory, or specify the bundle path.
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine bundle root
# --release-dir overrides the default (SCRIPT_DIR/..) so the Makefile can
# point at releases/<version>/ without extracting a bundle.
BUNDLE_ROOT="${GLASSWING_RELEASE_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
STACKS_DIR="$BUNDLE_ROOT/stacks"
MANIFEST_FILE="$BUNDLE_ROOT/manifest.yaml"

# ── Color helpers ──────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[!]${NC}  $*"; }
fail()    { echo -e "${RED}[✗]${NC}  $*"; }
info()    { echo -e "${CYAN}[i]${NC}  $*"; }
header()  { echo -e "\n${BOLD}═══ $* ═══${NC}\n"; }

# ── Prerequisites ──────────────────────────────────────────────

check_prereqs() {
  local missing=0
  for cmd in docker; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      fail "Required command not found: $cmd"
      missing=1
    fi
  done
  [ "$missing" -eq 1 ] && exit 1
}

# ── Manifest parsing ──────────────────────────────────────────

# Extract release version from manifest
get_release_version() {
  if [ ! -f "$MANIFEST_FILE" ]; then
    fail "Manifest not found: $MANIFEST_FILE"
    exit 1
  fi
  grep 'version:' "$MANIFEST_FILE" | head -1 | sed 's/.*version: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/'
}

# Get list of stacks from manifest
get_stacks_from_manifest() {
  grep 'stack:' "$MANIFEST_FILE" | sed 's/.*stack: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/' | sort -u
}

# Get image for a stack from manifest
get_manifest_image() {
  local stack="$1"
  awk -v s="$stack" '
    /^  - stack:/ { current = $NF; gsub(/"/, "", current) }
    current == s && /^    image:/ { print $NF; gsub(/"/, "", $NF); print $NF; exit }
  ' "$MANIFEST_FILE"
}

# ── Image loading ─────────────────────────────────────────────

load_images() {
  header "Loading Docker images"

  local images_dir="$BUNDLE_ROOT/images"
  local images_tar="$images_dir/images.tar"

  if [ ! -d "$images_dir" ] || [ -z "$(ls -A "$images_dir" 2>/dev/null)" ]; then
    fail "No images directory found: $images_dir"
    exit 1
  fi

  # Case 1: Combined images.tar (from release-bundle)
  if [ -f "$images_tar" ]; then
    # Verify checksum if available
    if [ -f "$images_dir/images.tar.sha256" ]; then
      info "Verifying image tarball checksum..."
      (cd "$images_dir" && sha256sum -c images.tar.sha256) 2>&1 || {
        fail "Checksum verification failed — images may be corrupted"
        exit 1
      }
      log "Checksum verified"
    fi

    local tar_size
    tar_size=$(du -sh "$images_tar" | cut -f1)
    info "Loading images from images.tar ($tar_size)..."

    docker load -i "$images_tar" 2>&1 || {
      fail "Failed to load images"
      exit 1
    }
    log "Images loaded successfully"

  # Case 2: Individual image tars (from release-build, no bundle yet)
  else
    local tar_files
    tar_files=$(find "$images_dir" -name '*.tar' -not -name 'images.tar' | sort)
    local tar_count
    tar_count=$(echo "$tar_files" | wc -l)
    info "Loading $tar_count individual image tars..."

    local loaded=0 failed=0
    while IFS= read -r tar_file; do
      local base
      base=$(basename "$tar_file")
      if docker load -i "$tar_file" >/dev/null 2>&1; then
        loaded=$((loaded + 1))
      else
        fail "Failed to load: $base"
        failed=$((failed + 1))
      fi
    done <<< "$tar_files"

    if [ "$failed" -gt 0 ]; then
      fail "$failed image(s) failed to load"
      exit 1
    fi
    log "Loaded $loaded image(s) successfully"
  fi

  # Count loaded images tagged with this release version
  local version image_count
  version=$(get_release_version)
  image_count=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -c ":${version}$" || true)
  info "$image_count images loaded for release $version"
}

# ── Stack deployment ──────────────────────────────────────────

deploy_stack() {
  local stack="$1"
  local stack_dir="$STACKS_DIR/$stack"
  local compose_file="$stack_dir/compose.yaml"

  if [ ! -f "$compose_file" ]; then
    warn "$stack — compose file not found in bundle"
    return 1
  fi

  # Check compose config
  if ! docker compose -f "$compose_file" config -q 2>/dev/null; then
    warn "$stack — compose config invalid, skipping"
    return 1
  fi

  info "$stack — deploying"

  # Pull is a no-op since images are local; use --ignore-pull-failures
  docker compose -f "$compose_file" up -d --wait --wait-timeout 180 2>&1

  if [ $? -eq 0 ]; then
    log "$stack — deployed"
    return 0
  else
    fail "$stack — deployment failed"
    return 1
  fi
}

# ── Health check ──────────────────────────────────────────────

check_health() {
  header "Health Check"

  local healthy=0 unhealthy=0

  while IFS= read -r stack; do
    local containers
    containers=$(docker ps --filter "label=com.docker.compose.project=glasswing-$stack" \
      --format '{{.Names}} {{.Status}}' 2>/dev/null)

    if [ -n "$containers" ]; then
      # Check if any container is unhealthy
      local has_unhealthy=false
      while IFS= read -r container_info; do
        if echo "$container_info" | grep -qi "unhealthy\|exited\|restarting"; then
          has_unhealthy=true
        fi
      done <<< "$containers"

      if [ "$has_unhealthy" = true ]; then
        warn "$stack — some containers not healthy"
        unhealthy=$((unhealthy + 1))
      else
        log "$stack — healthy"
        healthy=$((healthy + 1))
      fi
    else
      info "$stack — no containers found (may not be deployed)"
    fi
  done < <(get_stacks_from_manifest)

  echo ""
  info "Healthy: $healthy | Unhealthy: $unhealthy"
}

# ── Main ──────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
Glasswing Release Deployer

Usage: ./scripts/release-deploy.sh [OPTIONS]

Options:
  --dry-run              Show what would be deployed without executing
  --release-dir <path>   Path to the release directory (default: auto-detected)
  --help                 Show this help

Run from the extracted bundle directory, or set GLASSWING_RELEASE_DIR.
EOF
}

main() {
  local mode=""
  local release_dir=""

  # Parse arguments
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run)
        mode="--dry-run"
        ;;
      --release-dir)
        release_dir="$2"
        shift
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        # Support positional argument as release dir for Makefile convenience
        release_dir="$1"
        ;;
    esac
    shift
  done

  # Allow release dir to be passed as positional arg or via --release-dir
  if [ -n "$release_dir" ]; then
    BUNDLE_ROOT="$release_dir"
    STACKS_DIR="$BUNDLE_ROOT/stacks"
    MANIFEST_FILE="$BUNDLE_ROOT/manifest.yaml"
  fi

  check_prereqs

  # Verify we're in a bundle directory
  if [ ! -f "$MANIFEST_FILE" ]; then
    fail "Not a valid bundle directory (manifest.yaml not found at $MANIFEST_FILE)"
    fail "Extract the release bundle first: tar xzf glasswing-*.tar.gz"
    exit 1
  fi

  local version
  version=$(get_release_version)

  header "Glasswing Release Deploy — $version"

  # Dry run mode
  if [ "$mode" = "--dry-run" ]; then
    header "Dry Run — No changes will be made"
    info "Version: $version"
    info "Stacks to deploy:"
    while IFS= read -r stack; do
      echo "  - $stack"
    done < <(get_stacks_from_manifest)
    exit 0
  fi

  # Step 1: Load images
  load_images

  # Step 2: Deploy stacks
  header "Deploying stacks"

  local total=0 success=0 failed=0 fail_list=""

  # Deploy infisical first (secrets management)
  info "Deploying Infisical (secret source)..."
  if deploy_stack "infisical"; then
    success=$((success + 1))
  else
    failed=$((failed + 1))
    fail_list="$fail_list\n  - infisical"
  fi
  total=$((total + 1))

  # Deploy ollama second (inference backend)
  info "Deploying Ollama (inference backend)..."
  if deploy_stack "ollama"; then
    success=$((success + 1))
  else
    failed=$((failed + 1))
    fail_list="$fail_list\n  - ollama"
  fi
  total=$((total + 1))

  # Deploy remaining stacks
  while IFS= read -r stack; do
    # Skip already deployed
    [ "$stack" = "infisical" ] || [ "$stack" = "ollama" ] && continue

    total=$((total + 1))
    if deploy_stack "$stack"; then
      success=$((success + 1))
    else
      failed=$((failed + 1))
      fail_list="$fail_list\n  - $stack"
    fi
  done < <(get_stacks_from_manifest)

  # Step 3: Health check
  check_health

  # Summary
  header "Deployment Summary"
  echo "  Version:  $version"
  echo "  Total:    $total"
  echo -e "  Success:  ${GREEN}${success}${NC}"
  if [ "$failed" -gt 0 ]; then
    echo -e "  Failed:   ${RED}${failed}${NC}"
    echo -e "  Failed stacks:$fail_list"
  else
    echo "  Failed:   0"
  fi
  echo ""

  if [ "$failed" -gt 0 ]; then
    warn "Some stacks failed to deploy. Check logs:"
    echo "  docker compose -f stacks/<stack>/compose.yaml logs"
    exit 1
  fi

  log "Release $version deployed successfully"
}

main "$@"
