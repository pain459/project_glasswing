#!/usr/bin/env bash
#
# release-manifest.sh — Central release management for Glasswing stacks.
#
# Reads stacks/VERSIONS.yaml as the single source of truth for image versions.
# Supports bumping individual stacks, applying changes to compose files,
# checking update availability, and rolling back the last release.
#
# Usage:
#   ./scripts/release-manifest.sh status                    # Show version table
#   ./scripts/release-manifest.sh status --updates          # Include registry check
#   ./scripts/release-manifest.sh bump <stack> <new-tag>    # Bump one stack
#   ./scripts/release-manifest.sh bump-all-mutable          # Bump all mutable stacks
#   ./scripts/release-manifest.sh apply                     # Apply manifest to compose files
#   ./scripts/release-manifest.sh rollback                  # Revert last release commit
#   ./scripts/release-manifest.sh sync                      # Sync manifest from compose files
#   ./scripts/release-manifest.sh diff                      # Drift report
#   ./scripts/release-manifest.sh history                   # Recent release commits
#
# Requires: docker, git
# Optional: yq (for advanced YAML manipulation; script falls back to sed/awk)
# Run on the host where the repository lives.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$REPO_DIR/stacks/VERSIONS.yaml"
STACKS_DIR="$REPO_DIR/stacks"

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

check_manifest() {
  if [ ! -f "$MANIFEST" ]; then
    fail "Version manifest not found: $MANIFEST"
    exit 1
  fi
}

# ── YAML parsing helpers (no yq dependency) ────────────────────
#
# The manifest has a predictable structure:
#   stacks:
#     <name>:
#       image: ...
#       tag: ...
#       mutable: true|false
#       updated: YYYY-MM-DD
#       notes: ... (optional)
#
# We parse it with awk for portability.

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
# Usage: get_field <stack> <field>
get_field() {
  local stack="$1" field="$2"
  parse_manifest | awk -F"|" -v s="$stack" -v f="$field" '$1==s && $2==f {print $3}'
}

# Get all stack names from the manifest
get_manifest_stacks() {
  parse_manifest | awk -F"|" '{print $1}' | sort -u
}

# Update a field in the manifest (sed-based, in-place)
# Usage: set_field <stack> <field> <new_value>
set_field() {
  local stack="$1" field="$2" new_value="$3"

  # We need to find the right block. Strategy:
  # 1. Find the line number of "  stack:" in the manifest
  # 2. From there, find "    field:" and replace its value
  local stack_line
  stack_line=$(grep -n "^  ${stack}:" "$MANIFEST" | head -1 | cut -d: -f1)
  [ -z "$stack_line" ] && { fail "Stack '$stack' not found in manifest"; return 1; }

  # Find the field line within the next 20 lines (a stack block is small)
  local field_line
  field_line=$(sed -n "${stack_line},$((stack_line + 20))p" "$MANIFEST" \
    | grep -n "^    ${field}:" | head -1 | cut -d: -f1)
  [ -z "$field_line" ] && { fail "Field '$field' not found for stack '$stack'"; return 1; }

  # Absolute line number
  local abs_line=$((stack_line + field_line - 1))

  # Replace the value on that line — preserve quoting style
  # Check if the existing value is quoted
  local existing_line
  existing_line=$(sed -n "${abs_line}p" "$MANIFEST")
  if echo "$existing_line" | grep -q "${field}: \""; then
    # Already quoted — replace inside quotes
    sed -i "${abs_line}s|${field}: \".*\"|${field}: \"${new_value}\"|" "$MANIFEST"
  else
    # Unquoted — keep unquoted
    sed -i "${abs_line}s|${field}: .*|${field}: ${new_value}|" "$MANIFEST"
  fi
}

# ── Utility: check if tag is mutable ──────────────────────────

is_mutable_tag() {
  local tag="$1"
  case "$tag" in
    latest|public|lts|stable|nightly|dev|beta|alpha) return 0 ;;
    [0-9]) return 0 ;;
    *-latest) return 0 ;;
  esac
  return 1
}

# ── Command: status ───────────────────────────────────────────

cmd_status() {
  check_manifest

  local show_updates=false
  [ "${1:-}" = "--updates" ] && show_updates=true

  header "Glasswing Version Manifest"

  # Print header
  printf "${BOLD}%-22s %-12s %-15s %-7s %-10s ${NC}\n" \
    "STACK" "BUILD-TYPE" "TAG" "MUTABLE" "UPDATED"

  printf "%-22s %-12s %-15s %-7s %-10s\n" \
    "──────────────────────" "────────────" "───────────────" "───────" "──────────"

  local total=0 mutable_count=0

  while IFS= read -r stack; do
    local image tag mutable_flag updated build_type
    image=$(get_field "$stack" "image")
    tag=$(get_field "$stack" "tag")
    mutable_flag=$(get_field "$stack" "mutable")
    updated=$(get_field "$stack" "updated")
    build_type=$(get_field "$stack" "build-type")

    local mut_display
    if [ "$mutable_flag" = "true" ]; then
      mut_display="${GREEN}yes${NC}"
      mutable_count=$((mutable_count + 1))
    else
      mut_display="no"
    fi

    printf "%-22s %-12s %-15s %-7s %-10s\n" \
      "$stack" "${build_type:-external}" "$tag" "$mut_display" "$updated"

    total=$((total + 1))
  done < <(get_manifest_stacks)

  echo ""
  # Count build types
  local source_count=0 pypi_count=0 git_fetch_count=0 wrap_count=0 external_count=0
  while IFS= read -r stack; do
    local bt
    bt=$(get_field "$stack" "build-type")
    case "$bt" in
      source) source_count=$((source_count + 1)) ;;
      pypi) pypi_count=$((pypi_count + 1)) ;;
      git-fetch) git_fetch_count=$((git_fetch_count + 1)) ;;
      wrap) wrap_count=$((wrap_count + 1)) ;;
      *) external_count=$((external_count + 1)) ;;
    esac
  done < <(get_manifest_stacks)
  info "Total stacks: $total | Mutable: $mutable_count | Pinned: $((total - mutable_count))"
  info "Build types: source=$source_count pypi=$pypi_count git-fetch=$git_fetch_count wrap=$wrap_count external=$external_count"
  echo ""

  if [ "$show_updates" = true ]; then
    info "Checking registry for newer images..."
    echo ""
    cd "$REPO_DIR"
    bash "$SCRIPT_DIR/check-updates.sh" || true
  fi
}

# ── Command: bump ─────────────────────────────────────────────

cmd_bump() {
  check_manifest

  if [ $# -lt 2 ]; then
    fail "Usage: $0 bump <stack> <new-tag>"
    fail "Example: $0 bump ollama 0.40.12"
    exit 1
  fi

  local stack="$1"
  local new_tag="$2"
  local compose_file="$STACKS_DIR/${stack}/compose.yaml"

  # Verify stack exists in manifest
  local current_tag
  current_tag=$(get_field "$stack" "tag")
  if [ -z "$current_tag" ]; then
    fail "Stack '$stack' not found in manifest. Run 'sync' to discover it."
    exit 1
  fi

  # Verify compose file exists
  if [ ! -f "$compose_file" ]; then
    fail "Compose file not found: $compose_file"
    exit 1
  fi

  # Get the image from manifest
  local image
  image=$(get_field "$stack" "image")

  info "Bumping $stack: ${image}:${current_tag} → ${image}:${new_tag}"

  # 1. Update the manifest
  set_field "$stack" "tag" "$new_tag"
  set_field "$stack" "updated" "$(date +%Y-%m-%d)"

  # 2. Update the compose file
  local compose_backup="${compose_file}.release-bak"
  cp "$compose_file" "$compose_backup"
  sed -i "s|${image}:${current_tag}|${image}:${new_tag}|g" "$compose_file"

  # 3. Show diff
  echo ""
  echo "--- Manifest change ---"
  echo "  stacks/VERSIONS.yaml: tag ${current_tag} → ${new_tag}"
  echo ""
  echo "--- Compose diff ---"
  diff -u "$compose_backup" "$compose_file" || true
  rm -f "$compose_backup"

  echo ""
  log "Bump prepared. Next steps:"
  echo "  git add stacks/VERSIONS.yaml stacks/${stack}/compose.yaml"
  echo "  git commit -m \"bump: ${stack} ${current_tag} → ${new_tag}\""
  echo "  make up STACK=${stack}"
}

# ── Command: bump-all-mutable ─────────────────────────────────

cmd_bump_all_mutable() {
  check_manifest

  header "Bumping all mutable stacks"

  local bumped=0
  local today
  today=$(date +%Y-%m-%d)

  while IFS= read -r stack; do
    local mutable_flag
    mutable_flag=$(get_field "$stack" "mutable")

    if [ "$mutable_flag" = "true" ]; then
      local image tag
      image=$(get_field "$stack" "image")
      tag=$(get_field "$stack" "tag")

      # For mutable stacks with 'latest' tag, just update the date
      if [ "$tag" = "latest" ]; then
        info "$stack — already on mutable tag '$tag', updating date"
        set_field "$stack" "updated" "$today"
        bumped=$((bumped + 1))
      else
        # Try to pull and check for newer image
        info "$stack — checking for newer image..."
        if docker pull "$image:$tag" >/dev/null 2>&1; then
          set_field "$stack" "updated" "$today"
          bumped=$((bumped + 1))
        else
          warn "$stack — pull failed, skipping"
        fi
      fi
    fi
  done < <(get_manifest_stacks)

  echo ""
  log "$bumped mutable stack(s) checked/updated"
  echo ""
  info "To deploy: make restart-all"
}

# ── Command: apply ────────────────────────────────────────────

cmd_apply() {
  check_manifest

  header "Applying version manifest to compose files"

  local changed=0
  local errors=0

  while IFS= read -r stack; do
    local image tag
    image=$(get_field "$stack" "image")
    tag=$(get_field "$stack" "tag")

    local compose_file="$STACKS_DIR/${stack}/compose.yaml"
    if [ ! -f "$compose_file" ]; then
      warn "$stack — compose file not found, skipping"
      errors=$((errors + 1))
      continue
    fi

    # Check if compose file already has the right tag
    if grep -q "${image}:${tag}" "$compose_file" 2>/dev/null; then
      continue
    fi

    # Find the current tag in compose file
    local current_compose_tag
    current_compose_tag=$(grep "image:.*${image}:" "$compose_file" | head -1 | \
      sed "s|.*${image}:\(.*\)|\1|" | tr -d ' "')

    if [ -n "$current_compose_tag" ] && [ "$current_compose_tag" != "$tag" ]; then
      info "$stack — updating compose: ${current_compose_tag} → ${tag}"
      cp "$compose_file" "${compose_file}.release-bak"
      sed -i "s|${image}:${current_compose_tag}|${image}:${tag}|g" "$compose_file"
      changed=$((changed + 1))
    else
      warn "$stack — tag not found in compose file, manual review needed"
      errors=$((errors + 1))
    fi
  done < <(get_manifest_stacks)

  # Clean up backups
  find "$STACKS_DIR" -name "*.release-bak" -delete 2>/dev/null

  echo ""
  if [ "$changed" -gt 0 ]; then
    log "$changed compose file(s) updated"
    echo ""
    info "Review changes:"
    echo "  git diff stacks/"
    echo ""
    info "Commit and deploy:"
    echo "  git add stacks/"
    echo "  git commit -m \"release: sync compose files to VERSIONS.yaml\""
    echo "  make restart-all"
  else
    log "All compose files are in sync with the manifest"
  fi

  if [ "$errors" -gt 0 ]; then
    warn "$errors stack(s) need manual review"
  fi
}

# ── Command: rollback ─────────────────────────────────────────

cmd_rollback() {
  check_manifest

  cd "$REPO_DIR"

  # Check if there's a commit to revert
  if ! git log -1 --oneline >/dev/null 2>&1; then
    fail "No git history to rollback"
    exit 1
  fi

  # Find the last release-related commit
  local last_release
  last_release=$(git log --oneline -n 20 --grep="bump\|release" --format="%H" | head -1)

  if [ -z "$last_release" ]; then
    # Fallback: revert the last commit that touched VERSIONS.yaml or compose files
    last_release=$(git log --oneline -n 20 -- "stacks/VERSIONS.yaml" "stacks/*/compose.yaml" --format="%H" | head -1)
  fi

  if [ -z "$last_release" ]; then
    fail "No recent release commit found to rollback"
    exit 1
  fi

  local commit_msg
  commit_msg=$(git log -1 --format="%h %s" "$last_release")

  info "Last release commit: $commit_msg"
  echo ""

  # Ask for confirmation (unless --force)
  if [ "${1:-}" != "--force" ]; then
    echo -n "Revert this commit? [y/N] "
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      info "Rollback cancelled"
      return 0
    fi
  fi

  # Revert the commit
  info "Reverting commit $last_release..."
  if git revert --no-edit "$last_release" 2>/dev/null; then
    log "Commit reverted successfully"
    echo ""
    info "Redeploy affected stacks:"
    echo "  make restart-all"
  else
    fail "Revert failed (may have conflicts). Resolve manually:"
    echo "  git revert --no-edit $last_release"
    exit 1
  fi
}

# ── Command: sync ─────────────────────────────────────────────

# Sync the manifest from current compose files. Useful after manually
# editing a compose file to keep the manifest in sync.

cmd_sync() {
  check_manifest

  header "Syncing manifest from compose files"

  local updated=0

  # Backend image patterns to skip when picking the primary image for a stack
  local backend_patterns="postgres|redis|valkey|clickhouse|minio|alpine|nginx|surrealdb"

  for compose_file in "$STACKS_DIR"/*/compose.yaml; do
    [ -f "$compose_file" ] || continue
    local stack
    stack=$(basename "$(dirname "$compose_file")")

    # Get the manifest's registered image for this stack
    local manifest_image
    manifest_image=$(get_field "$stack" "image")

    if [ -n "$manifest_image" ]; then
      # Stack is in manifest — find the tag for THAT specific image in compose
      local compose_tag
      compose_tag=$(grep "image:.*${manifest_image}:" "$compose_file" 2>/dev/null | \
        head -1 | sed "s|.*${manifest_image}:\(.*\)|\1|" | tr -d ' "')

      if [ -z "$compose_tag" ]; then
        # Image not found in compose, try to find the primary non-backend image
        local primary_image
        primary_image=$(grep '^\s*image:' "$compose_file" | \
          sed 's/.*image:\s*//' | tr -d ' ' | \
          grep -v -E "(${backend_patterns})" | \
          head -1)
        [ -z "$primary_image" ] && continue
        compose_tag="${primary_image##*:}"
      fi

      local existing
      existing=$(get_field "$stack" "tag")
      if [ -n "$existing" ] && [ "$existing" != "$compose_tag" ]; then
        set_field "$stack" "tag" "$compose_tag"
        updated=$((updated + 1))
      fi
    else
      # Stack not in manifest yet — warn
      local primary_image
      primary_image=$(grep '^\s*image:' "$compose_file" | \
        sed 's/.*image:\s*//' | tr -d ' ' | \
        grep -v -E "(${backend_patterns})" | \
        head -1)
      [ -z "$primary_image" ] && continue
      warn "$stack — not in manifest (image: $primary_image)"
    fi
  done

  if [ "$updated" -gt 0 ]; then
    log "$updated stack(s) synced"
  else
    log "Manifest is in sync with compose files"
  fi
}

# ── Command: history ──────────────────────────────────────────

cmd_history() {
  cd "$REPO_DIR"

  header "Release History (last 20 commits)"

  git log --oneline -n 20 -- "stacks/VERSIONS.yaml" "stacks/*/compose.yaml" 2>/dev/null | \
    while IFS= read -r line; do
      local hash msg
      hash=$(echo "$line" | awk '{print $1}')
      msg=$(echo "$line" | cut -d' ' -f2-)
      local date
      date=$(git log -1 --format="%ad" --date=short "$hash" 2>/dev/null)
      printf "  ${CYAN}%s${NC}  %s  ${YELLOW}%s${NC}\n" "$hash" "$date" "$msg"
    done
}

# ── Command: diff ─────────────────────────────────────────────

# Show what would change if we applied the manifest now

cmd_diff() {
  check_manifest

  header "Manifest vs. Compose Files — Drift Report"

  local drift=0

  while IFS= read -r stack; do
    local image tag
    image=$(get_field "$stack" "image")
    tag=$(get_field "$stack" "tag")

    local compose_file="$STACKS_DIR/${stack}/compose.yaml"
    [ -f "$compose_file" ] || continue

    # Check if the manifest tag appears in the compose file
    if ! grep -q "${image}:${tag}" "$compose_file" 2>/dev/null; then
      local compose_tag
      compose_tag=$(grep "image:.*${image}:" "$compose_file" | head -1 | \
        sed "s|.*${image}:\(.*\)|\1|" | tr -d ' "')
      warn "$stack — manifest says ${tag}, compose has ${compose_tag:-?}"
      drift=$((drift + 1))
    fi
  done < <(get_manifest_stacks)

  echo ""
  if [ "$drift" -gt 0 ]; then
    fail "$drift stack(s) have version drift between manifest and compose files"
    echo "  Run: $0 apply"
  else
    log "No drift — manifest and compose files are in sync"
  fi
}

# ── Command: release-list ─────────────────────────────────────

cmd_release_list() {
  local releases_dir="$REPO_DIR/releases"

  if [ ! -d "$releases_dir" ]; then
    info "No releases directory found"
    return 0
  fi

  header "Glasswing Releases"

  local count=0
  for dir in "$releases_dir"/*/; do
    [ -d "$dir" ] || continue
    local version
    version=$(basename "$dir")
    # Skip hidden directories
    [[ "$version" == .* ]] && continue

    local archive="$dir/glasswing-${version}.tar.gz"
    local manifest="$dir/manifest.yaml"
    local size="-"

    if [ -f "$archive" ]; then
      size=$(du -sh "$archive" | cut -f1)
    fi

    local commit="-"
    if [ -f "$manifest" ]; then
      commit=$(grep 'commit_short:' "$manifest" | head -1 | sed 's/.*commit_short: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/')
    fi

    printf "  ${CYAN}%-20s${NC}  %-10s  %s\n" "$version" "$size" "$commit"
    count=$((count + 1))
  done

  echo ""
  info "Total releases: $count"
}

# ── Command: release-info ─────────────────────────────────────

cmd_release_info() {
  if [ $# -lt 1 ]; then
    fail "Usage: $0 release-info <version>"
    exit 1
  fi

  local version="$1"
  local manifest="$REPO_DIR/releases/$version/manifest.yaml"

  if [ ! -f "$manifest" ]; then
    fail "Release manifest not found: $manifest"
    exit 1
  fi

  header "Release Info: $version"
  cat "$manifest"
}

# ── Main ──────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
Glasswing Release Manifest Manager

Commands:
  status [--updates]     Show version table for all stacks
  bump <stack> <tag>     Bump one stack's version in manifest + compose
  bump-all-mutable       Check/update all mutable-tag stacks
  apply                  Apply manifest versions to compose files
  rollback [--force]     Revert the last release commit
  sync                   Sync manifest from current compose files
  diff                   Show drift between manifest and compose files
  history                Show recent release-related commits
  release-list           List all release bundles
  release-info <ver>     Show release manifest details

Release Pipeline:
  make release-build     Build all images and save to tar files
  make release-bundle    Produce offline bundle (requires VERSION)
  make release-deploy    Deploy a release bundle (requires VERSION)

Examples:
  ./scripts/release-manifest.sh status
  ./scripts/release-manifest.sh bump ollama 0.40.12
  ./scripts/release-manifest.sh apply
  ./scripts/release-manifest.sh release-list
EOF
}

case "${1:-}" in
  status)             shift; cmd_status "$@" ;;
  bump)               shift; cmd_bump "$@" ;;
  bump-all-mutable)   cmd_bump_all_mutable ;;
  apply)              cmd_apply ;;
  rollback)           shift; cmd_rollback "$@" ;;
  sync)               cmd_sync ;;
  diff)               cmd_diff ;;
  history)            cmd_history ;;
  release-list)       cmd_release_list ;;
  release-info)       shift; cmd_release_info "$@" ;;
  help|--help|-h)     usage ;;
  "")                 usage ;;
  *)                  fail "Unknown command: $1"; usage; exit 1 ;;
esac
