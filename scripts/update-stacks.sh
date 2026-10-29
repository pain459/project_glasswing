#!/usr/bin/env bash
#
# update-stacks.sh — Safely update Docker images across Glasswing stacks.
#
# Two modes of operation:
#
#   1. MUTABLE tags (:latest, :public, :lts, etc.) — pull new image,
#      restart the stack, verify health, roll back if broken.
#
#   2. PINNED tags (:2.24.0, :v2.7.0, etc.) — check if a newer version
#      exists in the registry and report it. No automatic update since
#      the compose.yaml would need to be edited and committed.
#
# Called by the staged-image-update Dagu DAG. For mutable-tag stacks:
#   1. Pull the latest image
#   2. Restart the stack via docker compose
#   3. Wait for healthcheck to pass (up to HEALTH_TIMEOUT seconds)
#   4. Monitor for MONITOR_DURATION seconds to catch delayed failures
#   5. Roll back immediately if anything fails
#
# Critical infrastructure (Infisical, OTel, Vector, Postgres, Dagu
# itself) are excluded entirely — update those manually.
#
# Usage:
#   ./scripts/update-stacks.sh              # Full run
#   ./scripts/update-stacks.sh --dry-run    # Report only, no changes
#   ./scripts/update-stacks.sh STACK_NAME   # Single stack

set -uo pipefail

# ── Bootstrap: ensure docker CLI is available ──────────────────
# The Dagu container (ubuntu:24.04) doesn't ship with docker CLI.
# When running on the host it's a no-op.
if ! command -v docker &>/dev/null; then
    echo "[bootstrap] Installing docker CLI..."
    apt-get update -qq >/dev/null 2>&1
    apt-get install -y -qq docker-compose-v2 >/dev/null 2>&1 || {
        # Fallback: install docker-ce-cli directly
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
            | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg 2>/dev/null || true
        echo "deb [signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
              https://download.docker.com/linux/ubuntu \
              $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
            > /etc/apt/sources.list.d/docker.list
        apt-get update -qq >/dev/null 2>&1
        apt-get install -y -qq docker-ce-cli >/dev/null 2>&1
    }
    echo "[bootstrap] docker CLI ready"
fi

# ── Configuration ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STACKS_DIR="$PROJECT_DIR/stacks"

# Stacks to always skip — update these manually
SKIP_STACKS="dagu infisical otel-collector vector postgres proxy"

# Healthcheck wait timeout (seconds)
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

# Monitoring period after healthcheck passes (seconds)
MONITOR_DURATION="${MONITOR_DURATION:-180}"

# ── Helpers ────────────────────────────────────────────────────

log()    { echo "[$(date -u '+%H:%M:%S')] $*"; }
log_ok() { echo "[$(date -u '+%H:%M:%S')] ✅  $*"; }
log_err(){ echo "[$(date -u '+%H:%M:%S')] ❌  $*"; }
log_skip(){ echo "[$(date -u '+%H:%M:%S')] ⏭️   $*"; }
log_info(){ echo "[$(date -u '+%H:%M:%S')] ℹ️   $*"; }

# Get the primary container for a stack
get_primary_container() {
    docker ps --filter "label=com.docker.compose.project=glasswing-${1}" \
              --format '{{.Names}}' 2>/dev/null | head -1 || true
}

# Wait for a container to become healthy (or just running if no healthcheck)
wait_for_healthy() {
    local container="$1"
    local timeout="$2"
    local elapsed=0

    while [ "$elapsed" -lt "$timeout" ]; do
        local status
        status=$(docker inspect "$container" \
                 --format '{{.State.Health.Status}}' 2>/dev/null || echo "none")

        if [ "$status" = "healthy" ]; then
            return 0
        fi

        # No healthcheck defined — just check if container is running
        if [ "$status" = "none" ]; then
            local running
            running=$(docker inspect "$container" \
                      --format '{{.State.Running}}' 2>/dev/null || echo "false")
            if [ "$running" = "true" ]; then
                return 0
            fi
        fi

        sleep 5
        elapsed=$((elapsed + 5))
    done

    return 1
}

# Monitor a container for delayed failures
monitor_container() {
    local container="$1"
    local duration="$2"
    local elapsed=0

    while [ "$elapsed" -lt "$duration" ]; do
        local status
        status=$(docker inspect "$container" \
                 --format '{{.State.Status}}' 2>/dev/null || echo "unknown")

        # Container stopped or crashed
        if [ "$status" != "running" ]; then
            return 1
        fi

        # Check health status if available
        local hstatus
        hstatus=$(docker inspect "$container" \
                  --format '{{.State.Health.Status}}' 2>/dev/null || echo "none")
        if [ "$hstatus" = "unhealthy" ]; then
            return 1
        fi

        sleep 30
        elapsed=$((elapsed + 30))
    done

    return 0
}

# Restart a stack using docker compose (with Infisical secrets if needed)
restart_stack() {
    local stack="$1"
    local compose_file="$STACKS_DIR/${stack}/compose.yaml"
    local secrets_file="$STACKS_DIR/${stack}/secrets.list"

    [ -f "$compose_file" ] || { log_err "No compose file for $stack"; return 1; }

    local cmd="docker compose -f \"$compose_file\" up -d --pull always"

    if [ -s "$secrets_file" ]; then
        local infisical_path="/${stack}"
        # Special case: otel-collector and vector use /openobserve
        [[ "$stack" =~ ^(otel-collector|vector)$ ]] && infisical_path="/openobserve"
        cmd="./scripts/with-infisical.sh \"$infisical_path\" \"$secrets_file\" -- $cmd"
    fi

    cd "$PROJECT_DIR"
    local output
    output=$(eval "$cmd" 2>&1) || return 1
    echo "$output" | tail -5
    return 0
}

# Rollback a stack by recreating containers from current compose config.
# Uses --pull never to force Docker to use the cached old image.
rollback_stack() {
    local stack="$1"
    local compose_file="$STACKS_DIR/${stack}/compose.yaml"
    local secrets_file="$STACKS_DIR/${stack}/secrets.list"

    [ -f "$compose_file" ] || return 1

    local cmd="docker compose -f \"$compose_file\" up -d --force-recreate --pull never"

    if [ -s "$secrets_file" ]; then
        local infisical_path="/${stack}"
        [[ "$stack" =~ ^(otel-collector|vector)$ ]] && infisical_path="/openobserve"
        cmd="./scripts/with-infisical.sh \"$infisical_path\" \"$secrets_file\" -- $cmd"
    fi

    cd "$PROJECT_DIR"
    local output
    output=$(eval "$cmd" 2>&1) || return 1
    echo "$output" | tail -3
    return 0
}

# Check if a tag is mutable (latest, public, lts, or a major-only version)
is_mutable_tag() {
    local image="$1"
    local tag="${image##*:}"

    # Handle images without explicit tag (implicit :latest)
    [[ "$image" != *":"* ]] && return 0

    case "$tag" in
        latest|public|lts|stable|nightly|dev|beta|alpha) return 0 ;;
        # Major-only versions like :2, :4, :7, :17 are mutable
        [0-9]) return 0 ;;
        # Tags ending in -latest are mutable
        *-latest) return 0 ;;
    esac

    return 1
}

# ── Main ───────────────────────────────────────────────────────

DRY_RUN=false
TARGET_STACK=""

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        *) TARGET_STACK="$arg" ;;
    esac
done

log "=========================================="
log " Glasswing Staged Image Update"
log " Dry run: $DRY_RUN"
log " Health timeout: ${HEALTH_TIMEOUT}s"
log " Monitor duration: ${MONITOR_DURATION}s"
log " Skipped stacks: $SKIP_STACKS"
log "=========================================="
log ""

# Discover stacks
if [ -n "$TARGET_STACK" ]; then
    STACK_LIST=("$TARGET_STACK")
else
    STACK_LIST=()
    for dir in "$STACKS_DIR"/*/; do
        [ -f "$dir/compose.yaml" ] && STACK_LIST+=("$(basename "$dir")")
    done
    IFS=$'\n' STACK_LIST=($(sort <<<"${STACK_LIST[*]}")); unset IFS
fi

UPDATED=0
FAILED=0
SKIPPED=0
UP_TO_DATE=0
PINNED_NEWER=0

for stack in "${STACK_LIST[@]}"; do
    log "--- Processing: $stack ---"

    # Skip excluded stacks
    if echo "$SKIP_STACKS" | grep -qw "$stack"; then
        log_skip "Excluded from auto-update"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Get primary container
    container=$(get_primary_container "$stack")
    if [ -z "$container" ]; then
        log_skip "Not running"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Get image reference
    image=$(docker inspect "$container" --format '{{.Config.Image}}' 2>/dev/null || echo "")
    if [ -z "$image" ]; then
        log_skip "No image info"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Save the old image ID before pulling
    old_image_id=$(docker inspect "$container" --format '{{.Image}}' 2>/dev/null || echo "")

    # Pull to check for updates
    log "Pulling $image..."
    if ! docker pull "$image" >/dev/null 2>&1; then
        log_err "Pull failed for $image, skipping"
        FAILED=$((FAILED + 1))
        continue
    fi

    new_image_id=$(docker image inspect "$image" \
                   --format '{{.Id}}' 2>/dev/null || echo "")

    if [ "$new_image_id" = "$old_image_id" ]; then
        log_skip "Already up to date"
        UP_TO_DATE=$((UP_TO_DATE + 1))
        continue
    fi

    # There's a newer image. Check if tag is mutable or pinned.
    if is_mutable_tag "$image"; then
        log "Mutable tag — updating with health verification"

        if [ "$DRY_RUN" = true ]; then
            log "  [DRY RUN] Would update $stack"
            UPDATED=$((UPDATED + 1))
            continue
        fi

        # ── Update with health verification ─────────────────────

        log "Restarting stack..."
        if ! restart_stack "$stack"; then
            log_err "Restart failed, rolling back..."
            rollback_stack "$stack" || true
            sleep 10
            FAILED=$((FAILED + 1))
            continue
        fi

        # Get the container after restart
        new_container=$(get_primary_container "$stack")
        if [ -z "$new_container" ]; then
            log_err "Container not found after restart, rolling back..."
            rollback_stack "$stack" || true
            FAILED=$((FAILED + 1))
            continue
        fi

        # Wait for healthcheck
        log "Waiting for healthcheck (timeout: ${HEALTH_TIMEOUT}s)..."
        if ! wait_for_healthy "$new_container" "$HEALTH_TIMEOUT"; then
            log_err "Healthcheck failed, rolling back..."
            rollback_stack "$stack" || true
            FAILED=$((FAILED + 1))
            continue
        fi

        log "Healthcheck passed"

        # Monitor for delayed failures
        log "Monitoring for ${MONITOR_DURATION}s..."
        if ! monitor_container "$new_container" "$MONITOR_DURATION"; then
            log_err "Container became unhealthy during monitoring, rolling back..."
            rollback_stack "$stack" || true
            FAILED=$((FAILED + 1))
            continue
        fi

        log_ok "$stack updated successfully"
        UPDATED=$((UPDATED + 1))

        # Clean up old dangling images
        docker image prune -f >/dev/null 2>&1 || true

    else
        # Pinned tag — report but don't auto-update
        log_info "Pinned tag — newer image available but not auto-updated"
        log_info "  Image: $image"
        log_info "  To update: bump the version in stacks/${stack}/compose.yaml"
        PINNED_NEWER=$((PINNED_NEWER + 1))
    fi
done

# ── Summary ────────────────────────────────────────────────────

log ""
log "=========================================="
log " Update Results"
log "=========================================="
log "  Updated:       $UPDATED"
log "  Failed:        $FAILED"
log "  Skipped:       $SKIPPED"
log "  Up to date:    $UP_TO_DATE"
log "  Pinned (newer): $PINNED_NEWER"
log "=========================================="

if [ "$PINNED_NEWER" -gt 0 ]; then
    log ""
    log "  $PINNED_NEWER stack(s) have pinned tags with newer images available."
    log "  Review compose.yaml files and bump versions manually."
fi

# Always exit 0 — Dagu tracks individual step output, and partial
# failures are normal (e.g. a stack's image is temporarily unavailable).
# The summary above reports failures clearly.
exit 0
