#!/usr/bin/env bash
#
# release-bundle.sh — Produce an offline-deployable release bundle.
#
# Takes a release version (previously built with release-build.sh) and:
#   1. Combines all individual image tars into a single images.tar
#   2. Generates SHA256 checksums
#   3. Copies compose files patched for local deployment
#   4. Creates the final release archive
#
# Usage:
#   ./scripts/release-bundle.sh <version>
#
# Requires: docker
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$REPO_DIR/stacks/VERSIONS.yaml"
STACKS_DIR="$REPO_DIR/stacks"
RELEASES_DIR="$REPO_DIR/releases"

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

# ── YAML parsing helpers ──────────────────────────────────────

parse_manifest() {
  awk '
    /^  [a-zA-Z]/ && !/^  #/ {
      gsub(/:$/, "", $0)
      current_stack = $1
    }
    current_stack != "" && /^    [a-zA-Z]/ {
      field = $1
      sub(/:$/, "", field)
      value = $0
      sub(/^[^:]+: */, "", value)
      gsub(/^["'"'"']|["'"'"']$/, "", value)
      print current_stack "|" field "|" value
    }
  ' "$MANIFEST"
}

get_field() {
  local stack="$1" field="$2"
  parse_manifest | awk -F"|" -v s="$stack" -v f="$field" '$1==s && $2==f {print $3}'
}

get_manifest_stacks() {
  parse_manifest | awk -F"|" '{print $1}' | sort -u
}

# ── Bundle creation ───────────────────────────────────────────

create_bundle() {
  local version="$1"
  local release_dir="$RELEASES_DIR/$version"
  local images_dir="$release_dir/images"

  # Verify release manifest exists
  if [ ! -f "$release_dir/manifest.yaml" ]; then
    fail "Release manifest not found: $release_dir/manifest.yaml"
    fail "Run release-build.sh first to create the release."
    exit 1
  fi

  # Verify image tars exist
  if [ ! -d "$images_dir" ] || [ -z "$(ls -A "$images_dir"/*.tar 2>/dev/null)" ]; then
    fail "Image tars not found in $images_dir"
    fail "Run release-build.sh first to create the release."
    exit 1
  fi

  header "Creating release bundle for $version"

  # Create bundle working directory
  local bundle_dir="$release_dir/bundle"
  mkdir -p "$bundle_dir/images"
  mkdir -p "$bundle_dir/stacks"
  mkdir -p "$bundle_dir/scripts"

  # ── Step 1: Combine image tars into single archive ──────────
  header "Combining image tars"

  local tar_count
  tar_count=$(ls -1 "$images_dir"/*.tar 2>/dev/null | wc -l)
  info "Found $tar_count image tar files"

  # Import each tar into Docker, then save all release-tagged images into one tar
  # This deduplicates shared layers across images
  local image_list=()
  for tar_file in "$images_dir"/*.tar; do
    info "Loading $(basename "$tar_file")..."
    docker load -i "$tar_file" 2>&1 || {
      fail "Failed to load $tar_file"
      exit 1
    }
  done

  # Collect all release-tagged images
  while IFS= read -r stack; do
    local image
    image=$(get_field "$stack" "image")
    [ -z "$image" ] && continue
    image_list+=("${image}:${version}")
  done < <(get_manifest_stacks)

  # Also collect images from multi-image stacks (atlas has 2, sky has 3)
  # These are already in the image_list via the manifest entries, but we need
  # to also grab the additional images that were built (atlas-web, sky-*, etc.)
  # The manifest captures the primary image per stack; additional images from
  # compose build blocks are saved as separate tars. Collect them by scanning
  # what docker has tagged with the release version.
  local all_release_images
  all_release_images=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep ":${version}$" | sort -u)
  for img in $all_release_images; do
    # Check if already in list
    local already=0
    for existing in "${image_list[@]}"; do
      if [ "$img" = "$existing" ]; then
        already=1
        break
      fi
    done
    if [ "$already" -eq 0 ]; then
      image_list+=("$img")
    fi
  done

  info "Saving ${#image_list[@]} unique images to combined tarball..."

  docker save "${image_list[@]}" -o "$bundle_dir/images/images.tar" 2>&1 || {
    fail "Failed to save combined images"
    exit 1
  }

  local tar_size
  tar_size=$(du -sh "$bundle_dir/images/images.tar" | cut -f1)
  log "Combined images saved: $tar_size"

  # Generate checksum
  sha256sum "$bundle_dir/images/images.tar" > "$bundle_dir/images/images.tar.sha256"
  log "Checksum generated"

  # ── Step 2: Patch compose files for local deployment ────────
  header "Preparing compose files for offline deployment"

  while IFS= read -r stack; do
    local compose_file="$STACKS_DIR/$stack/compose.yaml"
    local patched_dir="$bundle_dir/stacks/$stack"
    mkdir -p "$patched_dir"

    if [ ! -f "$compose_file" ]; then
      warn "$stack — compose file not found"
      continue
    fi

    # Copy compose file and patch image references
    cp "$compose_file" "$patched_dir/compose.yaml"

    # Replace external registry references with versioned local reference
    local image tag
    image=$(get_field "$stack" "image")
    tag=$(get_field "$stack" "tag")

    if [ -n "$image" ] && [ -n "$tag" ]; then
      # Replace the original image reference with versioned local reference
      sed -i "s|${image}:${tag}|${image}:${version}|g" "$patched_dir/compose.yaml"
      info "$stack — patched to use ${image}:${version}"
    fi

    # Copy compose override if it exists
    if [ -f "$STACKS_DIR/$stack/compose.override.yaml" ]; then
      cp "$STACKS_DIR/$stack/compose.override.yaml" "$patched_dir/compose.override.yaml"
    fi

    # Copy secrets list if it exists
    if [ -f "$STACKS_DIR/$stack/secrets.list" ]; then
      cp "$STACKS_DIR/$stack/secrets.list" "$patched_dir/secrets.list"
    fi

    # Copy pre-up/post-up hooks if they exist
    for hook in pre-up.sh post-up.sh; do
      if [ -f "$STACKS_DIR/$stack/$hook" ]; then
        cp "$STACKS_DIR/$stack/$hook" "$patched_dir/$hook"
      fi
    done

  done < <(get_manifest_stacks)

  # Copy base.yaml
  if [ -f "$STACKS_DIR/base.yaml" ]; then
    cp "$STACKS_DIR/base.yaml" "$bundle_dir/stacks/base.yaml"
  fi

  # ── Step 3: Copy deployment script ──────────────────────────
  cp "$SCRIPT_DIR/release-deploy.sh" "$bundle_dir/scripts/release-deploy.sh"
  chmod +x "$bundle_dir/scripts/release-deploy.sh"

  # ── Step 4: Generate bundle README ──────────────────────────
  cat > "$bundle_dir/README.md" <<EOF
# Glasswing Release Bundle

**Version:** $version
**Built:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Commit:** $(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")

## Deploy

\`\`\`bash
./scripts/release-deploy.sh
\`\`\`

This will:
1. Load all Docker images into the local daemon
2. Verify image integrity against the manifest
3. Deploy all stacks using patched compose files

## Contents

- \`images/images.tar\` — All Docker images ($tar_size)
- \`images/images.tar.sha256\` — SHA256 checksum
- \`stacks/\` — Patched compose files for each stack
- \`scripts/release-deploy.sh\` — Deployment script
- \`manifest.yaml\` — Release manifest with digests
EOF

  # Copy the manifest into the bundle
  cp "$release_dir/manifest.yaml" "$bundle_dir/manifest.yaml"

  # ── Step 5: Create final archive ────────────────────────────
  header "Creating final archive"

  local archive_name="glasswing-${version}.tar.gz"
  local archive_path="$release_dir/$archive_name"

  (cd "$bundle_dir" && tar czf "$archive_path" .) 2>&1 || {
    fail "Failed to create archive"
    exit 1
  }

  local archive_size
  archive_size=$(du -sh "$archive_path" | cut -f1)

  # Generate checksum for the archive too
  sha256sum "$archive_path" > "${archive_path}.sha256"

  # Cleanup bundle working directory
  rm -rf "$bundle_dir"

  log "Release bundle created: $archive_name ($archive_size)"
  echo ""
  info "Bundle location: $archive_path"
  info "Checksum: ${archive_path}.sha256"
  echo ""
  info "To deploy on another host:"
  echo "  1. Transfer $archive_name and its checksum"
  echo "  2. sha256sum -c ${archive_name}.sha256"
  echo "  3. tar xzf $archive_name"
  echo "  4. ./scripts/release-deploy.sh"
}

# ── Main ──────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
Glasswing Release Bundle Creator

Usage: ./scripts/release-bundle.sh <version>

Arguments:
  version     Release version string (e.g., 9c021aa-20261105-1)

Examples:
  ./scripts/release-bundle.sh 9c021aa-20261105-1
EOF
}

main() {
  if [ $# -lt 1 ]; then
    fail "Version argument required"
    usage
    exit 1
  fi

  local version="$1"

  # Verify manifest exists
  if [ ! -f "$MANIFEST" ]; then
    fail "Version manifest not found: $MANIFEST"
    exit 1
  fi

  create_bundle "$version"
}

main "$@"