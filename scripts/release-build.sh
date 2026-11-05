#!/usr/bin/env bash
#
# release-build.sh — Build all Glasswing images for a release.
#
# On a connected host, this script:
#   1. Resolves a deterministic release version from git + build counter
#   2. Builds custom images from Dockerfiles (source, pypi, git-fetch, wrap)
#   3. Pulls external images at pinned versions
#   4. Tags everything with the release version
#   5. Exports every image to a tar file via docker save
#   6. Captures image digests and writes a release manifest
#
# No local registry is needed — images are saved directly to tar files.
#
# Usage:
#   ./scripts/release-build.sh [--custom | --external | --dry-run]
#
# Requires: docker, git
# Run on the host where the repository lives.
#
# The build step requires network access. The deploy step does not.

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

# ── Prerequisites ──────────────────────────────────────────────

check_prereqs() {
  local missing=0
  for cmd in docker git; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      fail "Required command not found: $cmd"
      missing=1
    fi
  done
  [ "$missing" -eq 1 ] && exit 1
}

check_manifest() {
  if [ ! -f "$MANIFEST" ]; then
    fail "Version manifest not found: $MANIFEST"
    exit 1
  fi
}

# ── YAML parsing helpers ──────────────────────────────────────

# Parse the manifest into a flat key-value store per stack.
# Output: STACK|FIELD|VALUE lines
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
      # Remove surrounding quotes
      gsub(/^["'"'"']|["'"'"']$/, "", value)
      print current_stack "|" field "|" value
    }
  ' "$MANIFEST"
}

# Get a field value for a stack from the manifest
get_field() {
  local stack="$1" field="$2"
  parse_manifest | awk -F"|" -v s="$stack" -v f="$field" '$1==s && $2==f {print $3}'
}

# Get all stack names from the manifest
get_manifest_stacks() {
  parse_manifest | awk -F"|" '{print $1}' | sort -u
}

# ── Version resolution ────────────────────────────────────────

resolve_version() {
  local commit_sha date_str build_number version

  # Get the short commit SHA
  commit_sha=$(git -C "$REPO_DIR" rev-parse --short=7 HEAD 2>/dev/null) || {
    fail "Cannot resolve git commit SHA"
    exit 1
  }

  # Get today's date
  date_str=$(date +%Y%m%d)

  # Get/increment build number
  mkdir -p "$RELEASES_DIR"
  if [ -f "$RELEASES_DIR/.build-number" ]; then
    build_number=$(cat "$RELEASES_DIR/.build-number")
    build_number=$((build_number + 1))
  else
    build_number=1
  fi
  echo "$build_number" > "$RELEASES_DIR/.build-number"

  version="${commit_sha}-${date_str}-${build_number}"
  echo "$version"
}

# ── Image tagging helper ──────────────────────────────────────

# Tag an image with the release version. The release tag uses the image name
# from the manifest, so it can be loaded and referenced consistently.
tag_for_release() {
  local image="$1" version="$2" original_tag="$3"

  local source="${image}:${original_tag}"
  local release_tag="${image}:${version}"

  docker tag "$source" "$release_tag" 2>&1 || {
    warn "Failed to tag ${source} as ${release_tag}"
    return 1
  }

  return 0
}

# Save an image to a tar file in the release directory
save_image() {
  local image="$1" version="$2" release_dir="$3"

  local release_tag="${image}:${version}"
  # Sanitize image name for filename: replace / and : with -
  local safe_name="${image//\//-}"
  safe_name="${safe_name//:/-}"
  local tar_file="$release_dir/images/${safe_name}-${version}.tar"

  mkdir -p "$release_dir/images"

  info "Saving ${release_tag} → ${tar_file}"
  docker save "$release_tag" -o "$tar_file" 2>&1 || {
    fail "Failed to save ${release_tag}"
    return 1
  }

  log "Saved ${release_tag} ($(du -h "$tar_file" | cut -f1))"
  return 0
}

# ── Image build & pull ────────────────────────────────────────

# Build a custom image from a Dockerfile
build_custom_image() {
  local stack="$1" version="$2"
  local stack_dir="$STACKS_DIR/$stack"
  local compose_file="$stack_dir/compose.yaml"

  if [ ! -f "$compose_file" ]; then
    warn "$stack — compose file not found, skipping"
    return 1
  fi

  # Find the Dockerfile reference in the compose file
  local dockerfile_context=""
  local dockerfile_path=""

  # Check for build context in compose file
  if grep -q "build:" "$compose_file"; then
    # Extract dockerfile and context from compose
    dockerfile_path=$(grep -A5 "build:" "$compose_file" | grep "dockerfile:" | head -1 | sed 's/.*dockerfile:\s*//' | tr -d ' "')
    dockerfile_context=$(grep -A5 "build:" "$compose_file" | grep "context:" | head -1 | sed 's/.*context:\s*//' | tr -d ' "')

    if [ -z "$dockerfile_context" ]; then
      dockerfile_context="."
    fi

    # Resolve relative paths
    if [[ "$dockerfile_context" != /* ]]; then
      dockerfile_context="$stack_dir/$dockerfile_context"
    fi
    if [[ "$dockerfile_path" != /* ]]; then
      dockerfile_path="$stack_dir/$dockerfile_path"
    fi
  else
    # No build context in compose — check if Dockerfile exists in stack dir
    if [ -f "$stack_dir/Dockerfile" ]; then
      dockerfile_path="$stack_dir/Dockerfile"
      dockerfile_context="$stack_dir"
    else
      warn "$stack — no Dockerfile or build context found"
      return 1
    fi
  fi

  # Get the image name from manifest
  local image
  image=$(get_field "$stack" "image")
  [ -z "$image" ] && { warn "$stack — image not found in manifest"; return 1; }

  local release_tag="${image}:${version}"

  info "$stack — building ${release_tag}"

  DOCKER_BUILDKIT=1 docker build \
    -f "$dockerfile_path" \
    -t "$release_tag" \
    "$dockerfile_context" 2>&1

  if [ $? -ne 0 ]; then
    fail "$stack — build failed"
    return 1
  fi

  log "$stack — built ${release_tag}"
  return 0
}

# Pull an external image and tag it for the release
pull_external_image() {
  local stack="$1" version="$2"
  local image tag

  image=$(get_field "$stack" "image")
  tag=$(get_field "$stack" "tag")

  [ -z "$image" ] || [ -z "$tag" ] && { warn "$stack — image/tag not found in manifest"; return 1; }

  local original="${image}:${tag}"

  # Check if we already have the image
  if docker image inspect "$original" >/dev/null 2>&1; then
    info "$stack — using cached ${original}"
  else
    info "$stack — pulling ${original}"
    docker pull "$original" 2>&1 || {
      fail "$stack — pull failed for ${original}"
      return 1
    }
  fi

  # Tag for release
  tag_for_release "$image" "$version" "$tag" || return 1

  log "$stack — pulled and tagged ${version}"
  return 0
}

# Parse compose file and extract all build blocks with their service name,
# dockerfile, context, and image. Outputs tab-separated lines:
#   SERVICE\tDOCKERFILE\tCONTEXT\tIMAGE
parse_compose_build_blocks() {
  local compose_file="$1"
  awk '
    BEGIN { service=""; dockerfile=""; context=""; image=""; in_build=0 }
    # Detect service name (2-space indent, ends with colon, not a comment)
    /^  [a-zA-Z_-]+:/ && !/^  #/ {
      # Flush previous build block if any
      if (in_build && dockerfile != "") {
        print service "\t" dockerfile "\t" context "\t" image
      }
      gsub(/:.*$/, "", $0)
      gsub(/^  +/, "", $0)
      service = $0
      dockerfile = ""
      context = ""
      image = ""
      in_build = 0
    }
    # Detect build: block
    /build:/ { in_build = 1 }
    # Detect dockerfile within build block
    in_build && /dockerfile:/ {
      sub(/.*dockerfile:[[:space:]]*/, "")
      gsub(/[[:space:]]*$/, "")
      gsub(/"/, "")
      dockerfile = $0
    }
    # Detect context within build block
    in_build && /context:/ {
      sub(/.*context:[[:space:]]*/, "")
      gsub(/[[:space:]]*$/, "")
      gsub(/"/, "")
      context = $0
    }
    # Detect image — capture regardless of in_build state, since image:
    # can appear before or after the build: block in the same service
    /^[[:space:]]+image:/ {
      sub(/.*image:[[:space:]]*/, "")
      gsub(/[[:space:]]*$/, "")
      gsub(/"/, "")
      image = $0
    }
    END {
      if (in_build && dockerfile != "") {
        print service "\t" dockerfile "\t" context "\t" image
      }
    }
  ' "$compose_file"
}

# Build a single service image from a compose build block
build_single_service() {
  local service="$1" dockerfile="$2" context="$3" image="$4" stack="$5" version="$6" stack_dir="$7"

  # Resolve paths: context is relative to the compose file's directory,
  # dockerfile is relative to the context (Docker Compose spec).
  if [ -z "$context" ]; then
    context="."
  fi
  if [[ "$context" != /* ]]; then
    context="$stack_dir/$context"
  fi
  if [[ "$dockerfile" != /* ]]; then
    dockerfile="$context/$dockerfile"
  fi

  # Determine image name: prefer compose image, then manifest, then fallback
  if [ -z "$image" ]; then
    image=$(get_field "$stack" "image")
  fi
  if [ -z "$image" ]; then
    image="glasswing/${stack}-${service}"
  fi

  # Strip any existing tag from the image name (compose may have image:tag)
  image="${image%%:*}"

  local release_tag="${image}:${version}"

  info "$stack/$service — building ${release_tag}"

  DOCKER_BUILDKIT=1 docker build \
    -f "$dockerfile" \
    -t "$release_tag" \
    "$context" 2>&1

  if [ $? -ne 0 ]; then
    fail "$stack/$service — build failed"
    return 1
  fi

  log "$stack/$service — built ${release_tag}"
  return 0
}

# Handle multi-image stacks (sky has 3 images, atlas has 2)
build_multi_image_stack() {
  local stack="$1" version="$2"
  local stack_dir="$STACKS_DIR/$stack"
  local compose_file="$stack_dir/compose.yaml"

  if [ ! -f "$compose_file" ]; then
    warn "$stack — compose file not found"
    return 1
  fi

  # Parse all build blocks from compose file
  local build_blocks
  build_blocks=$(parse_compose_build_blocks "$compose_file")

  if [ -z "$build_blocks" ]; then
    warn "$stack — no build blocks found in compose file"
    return 1
  fi

  local build_count
  build_count=$(echo "$build_blocks" | wc -l)
  info "$stack — found $build_count Dockerfile(s) to build"

  # Build each service
  while IFS=$'\t' read -r service dockerfile context image; do
    [ -z "$service" ] && continue
    build_single_service "$service" "$dockerfile" "$context" "$image" "$stack" "$version" "$stack_dir" || return 1
  done <<< "$build_blocks"

  return 0
}

# ── Digest capture ────────────────────────────────────────────

capture_digest() {
  local image="$1" version="$2"
  local release_tag="${image}:${version}"

  docker inspect --format='{{index .RepoDigests 0}}' "$release_tag" 2>/dev/null | \
    sed 's|.*@||' || echo "unknown"
}

# ── Manifest generation ───────────────────────────────────────

generate_release_manifest() {
  local version="$1"
  local release_dir="$RELEASES_DIR/$version"
  mkdir -p "$release_dir"

  local manifest_file="$release_dir/manifest.yaml"

  cat > "$manifest_file" <<EOF
# Glasswing Release Manifest
#
# Generated by scripts/release-build.sh
# This file records the exact images and digests for this release.

release:
  version: "$version"
  date: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  commit: "$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null)"
  commit_short: "$(git -C "$REPO_DIR" rev-parse --short=7 HEAD 2>/dev/null)"
  build_number: "$(cat "$RELEASES_DIR/.build-number" 2>/dev/null || echo 1)"

images:
EOF

  local total=0

  while IFS= read -r stack; do
    local image tag build_type
    image=$(get_field "$stack" "image")
    tag=$(get_field "$stack" "tag")
    build_type=$(get_field "$stack" "build-type")

    [ -z "$image" ] && continue

    # Get digest from the release-tagged image
    local digest
    digest=$(capture_digest "$image" "$version")

    cat >> "$manifest_file" <<EOF

  - stack: "$stack"
    image: "$image"
    original_tag: "$tag"
    release_tag: "$version"
    build-type: "${build_type:-external}"
    digest: "$digest"
EOF

    total=$((total + 1))
  done < <(get_manifest_stacks)

  echo "" >> "$manifest_file"
  echo "summary:" >> "$manifest_file"
  echo "  total_images: $total" >> "$manifest_file"
  echo "  generated_at: \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" >> "$manifest_file"

  log "Release manifest written to $manifest_file"
}

# ── Main ──────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
Glasswing Release Builder

Usage: ./scripts/release-build.sh [OPTIONS]

Options:
  --custom      Build only custom images (source, pypi, git-fetch, wrap)
  --external    Pull only external images
  --dry-run     Show what would be built without executing
  --help        Show this help

Examples:
  ./scripts/release-build.sh              # Full build (custom + external)
  ./scripts/release-build.sh --custom     # Only build custom images
  ./scripts/release-build.sh --external   # Only pull external images
EOF
}

main() {
  local mode="${1:-all}"  # all, custom, external, dry-run

  check_prereqs
  check_manifest

  header "Glasswing Release Build"

  # Resolve version
  local version
  version=$(resolve_version)
  info "Release version: $version"

  # Create release directory
  local release_dir="$RELEASES_DIR/$version"
  mkdir -p "$release_dir/images"

  # Dry run mode
  if [ "$mode" = "--dry-run" ]; then
    header "Dry Run — No changes will be made"
    while IFS= read -r stack; do
      local image build_type
      image=$(get_field "$stack" "image")
      build_type=$(get_field "$stack" "build-type")
      [ -z "$image" ] && continue
      echo "  $stack ($build_type): $image → ${image}:${version}"
    done < <(get_manifest_stacks)
    exit 0
  fi

  local total=0 success=0 failed=0 fail_list=""

  # Process stacks
  while IFS= read -r stack; do
    local image build_type
    image=$(get_field "$stack" "image")
    build_type=$(get_field "$stack" "build-type")

    [ -z "$image" ] && continue
    total=$((total + 1))

    # Skip based on mode
    case "$mode" in
      --custom)
        [ "$build_type" = "external" ] && continue
        ;;
      --external)
        [ "$build_type" != "external" ] && continue
        ;;
    esac

    # Build or pull based on build-type
    local result=0
    case "$build_type" in
      source|pypi|git-fetch|wrap)
        # Check if stack has multiple Dockerfiles
        local dockerfile_count
        dockerfile_count=$(grep -c "dockerfile:" "$STACKS_DIR/$stack/compose.yaml" 2>/dev/null || echo 0)
        if [ "$dockerfile_count" -gt 1 ]; then
          build_multi_image_stack "$stack" "$version" || result=1
        else
          build_custom_image "$stack" "$version" || result=1
        fi
        ;;
      external)
        pull_external_image "$stack" "$version" || result=1
        ;;
      *)
        warn "$stack — unknown build-type '$build_type', treating as external"
        pull_external_image "$stack" "$version" || result=1
        ;;
    esac

    # If build/pull succeeded, save the image tar
    if [ "$result" -eq 0 ]; then
      # For multi-image stacks, save each image found in the build blocks
      if [ "$build_type" != "external" ] && [ "$dockerfile_count" -gt 1 ] 2>/dev/null; then
        local compose_file="$STACKS_DIR/$stack/compose.yaml"
        if [ -f "$compose_file" ]; then
          local build_blocks
          build_blocks=$(parse_compose_build_blocks "$compose_file")
          while IFS=$'\t' read -r _svc _df _ctx img; do
            [ -z "$img" ] && continue
            img="${img%%:*}"  # strip tag
            save_image "$img" "$version" "$release_dir" || result=1
          done <<< "$build_blocks"
        fi
      else
        save_image "$image" "$version" "$release_dir" || result=1
      fi
    fi

    if [ "$result" -eq 0 ]; then
      success=$((success + 1))
    else
      failed=$((failed + 1))
      fail_list="$fail_list\n  - $stack"
    fi
  done < <(get_manifest_stacks)

  # Generate manifest
  generate_release_manifest "$version"

  # Summary
  header "Build Summary"
  echo "  Version:    $version"
  echo "  Total:      $total"
  echo -e "  Success:    ${GREEN}${success}${NC}"
  if [ "$failed" -gt 0 ]; then
    echo -e "  Failed:     ${RED}${failed}${NC}"
    echo -e "  Failed stacks:$fail_list"
  else
    echo "  Failed:     0"
  fi
  echo ""

  if [ "$failed" -gt 0 ]; then
    warn "Some stacks failed to build. Fix the issues and rerun."
    exit 1
  fi

  log "Release build complete: $version"
  echo ""
  info "Next steps:"
  echo "  ./scripts/release-bundle.sh $version"
  echo "  make release-bundle VERSION=$version"
}

main "$@"
