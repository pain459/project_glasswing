
#!/usr/bin/env bash
# onboard-service.sh — Headless service onboarding executor for Glasswing.
#
# Reads a JSON configuration from stdin, creates all required stack files,
# registers secrets in Infisical, updates VERSIONS.yaml and homepage config,
# then deploys and verifies the service.
#
# Usage:
#   echo '<json>' | scripts/onboard-service.sh [--dry-run]
#   scripts/onboard-service.sh --help
#
# JSON schema (all fields required unless noted):
#   slug            — kebab-case service identifier
#   image           — full Docker image reference (registry/repo:tag)
#   container_port  — port inside the container
#   host_port       — port exposed on the host
#   category        — homepage category (e.g. "Developer Workbench")
#   description     — short description for homepage
#   healthcheck_path — health endpoint path (e.g. "/api/v1/status")
#   volumes         — array of { name, container_path } (optional)
#   environment     — object of non-secret env vars (optional)
#   secrets         — object of secret env vars with default values (optional)
#   homepage_icon   — icon name or file for homepage (optional, default: mdi-server)
#   notes           — optional notes for VERSIONS.yaml (optional)

set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=false
TODAY="$(date +%Y-%m-%d)"

# ── Helpers ────────────────────────────────────────────────────────────────

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

info() {
  echo "[INFO] $*"
}

ok() {
  echo "[OK]   $*"
}

usage() {
  cat <<'EOF'
Usage: echo '<json>' | scripts/onboard-service.sh [--dry-run]
       scripts/onboard-service.sh --help

Onboard a new Docker service into Glasswing.

Options:
  --dry-run   Validate and preview without creating files or deploying
  --help      Show this help message

JSON fields (on stdin):
  slug              kebab-case service identifier (required)
  image             Docker image with tag (required)
  container_port    port inside the container (required)
  host_port         port exposed on the host (required)
  category          homepage category name (required)
  description       short description for homepage (required)
  healthcheck_path  health endpoint path (optional, default: "/")
  volumes           array of { name, container_path } (optional)
  environment       object of non-secret env vars (optional)
  secrets           object of secret env vars (optional)
  homepage_icon     icon for homepage (optional, default: "mdi-server")
  notes             context for VERSIONS.yaml (optional)
EOF
  exit 0
}

# ── Argument parsing ───────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --help)    usage ;;
    *)         fail "Unknown option: $1" ;;
  esac
done

# ── Read and validate JSON ────────────────────────────────────────────────

if [[ -t 0 ]]; then
  fail "No JSON input on stdin. Pipe JSON or run --help for usage."
fi

JSON="$(cat)"

# Validate required fields exist
for field in slug image container_port host_port category description; do
  VALUE="$(echo "$JSON" | jq -r ".$field // empty" 2>/dev/null)" || true
  [[ -n "$VALUE" ]] || fail "Missing required field: $field"
done

SLUG="$(echo "$JSON" | jq -r '.slug')"
IMAGE="$(echo "$JSON" | jq -r '.image')"
CONTAINER_PORT="$(echo "$JSON" | jq -r '.container_port')"
HOST_PORT="$(echo "$JSON" | jq -r '.host_port')"
CATEGORY="$(echo "$JSON" | jq -r '.category')"
DESCRIPTION="$(echo "$JSON" | jq -r '.description')"
HEALTH_PATH="$(echo "$JSON" | jq -r '.healthcheck_path // "/"')"
ICON="$(echo "$JSON" | jq -r '.homepage_icon // "mdi-server"')"
NOTES="$(echo "$JSON" | jq -r '.notes // empty')"

# Split image into registry/repo and tag
IMAGE_NO_TAG="${IMAGE%:*}"
TAG="${IMAGE##*:}"
IMAGE_REPO="${IMAGE_NO_TAG%/*}"  # registry/repo without tag for VERSIONS.yaml

# Validate slug format
[[ "$SLUG" =~ ^[a-z][a-z0-9-]*$ ]] || fail "Slug must be kebab-case lowercase: $SLUG"

info "Onboarding service: $SLUG"
info "Image: $IMAGE"
info "Ports: $HOST_PORT -> $CONTAINER_PORT"

# ── Idempotency check ─────────────────────────────────────────────────────

STACK_DIR="$ROOT/stacks/$SLUG"
if [[ -d "$STACK_DIR" ]]; then
  fail "Stack directory already exists: $STACK_DIR — refusing to overwrite."
fi

# ── Port conflict check ───────────────────────────────────────────────────

PORT_CONFLICT=false
while IFS= read -r line; do
  # Extract host port from port mappings like "IP:host:container"
  if [[ "$line" =~ :([0-9]+):[0-9]+ ]]; then
    existing_port="${BASH_REMATCH[1]}"
    if [[ "$existing_port" == "$HOST_PORT" ]]; then
      PORT_CONFLICT=true
      break
    fi
  fi
done < <(grep -rh '^\s*- "\${GLASSWING_HOST' "$ROOT/stacks/"*/compose.yaml 2>/dev/null || true)

if $PORT_CONFLICT; then
  fail "Port $HOST_PORT is already in use by another stack."
fi

ok "Port $HOST_PORT is available"

# ── Dry run mode ──────────────────────────────────────────────────────────

if $DRY_RUN; then
  info "DRY RUN — no files will be created"
  info "Stack directory: $STACK_DIR"
  info "Compose file: $STACK_DIR/compose.yaml"
  info "Secrets list: $STACK_DIR/secrets.list"
  info "Secrets registry: $STACK_DIR/${SLUG}-config.registry"
  info "Category: $CATEGORY"
  info "Health check: $HEALTH_PATH"

  # Show volumes if any
  VOL_COUNT="$(echo "$JSON" | jq '.volumes | length // 0')"
  if [[ "$VOL_COUNT" -gt 0 ]]; then
    info "Volumes: $VOL_COUNT defined"
    echo "$JSON" | jq -r '.volumes[] | "  - \(.name) -> \(.container_path)"'
  fi

  # Show environment vars
  ENV_COUNT="$(echo "$JSON" | jq '.environment | length // 0')"
  if [[ "$ENV_COUNT" -gt 0 ]]; then
    info "Environment variables: $ENV_COUNT"
    echo "$JSON" | jq -r '.environment | to_entries[] | "  - \(.key)=\(.value)"'
  fi

  # Show secrets
  SECRET_COUNT="$(echo "$JSON" | jq '.secrets | length // 0')"
  if [[ "$SECRET_COUNT" -gt 0 ]]; then
    info "Secrets: $SECRET_COUNT"
    echo "$JSON" | jq -r '.secrets | to_entries[] | "  - \(.key)=<masked>"'
  fi

  ok "Dry run complete — all checks passed"
  exit 0
fi

# ── Create stack directory ────────────────────────────────────────────────

mkdir -p "$STACK_DIR"
ok "Created $STACK_DIR"

# ── Build compose.yaml ────────────────────────────────────────────────────

{
  cat <<COMPOSE_HEADER

name: glasswing-${SLUG}

services:
  ${SLUG}:
    extends:
      file: ../base.yaml
      service: hardened
    image: ${IMAGE}
    container_name: glasswing-${SLUG}

    ports:
      - "\${GLASSWING_HOST_IP:?required}:${HOST_PORT}:${CONTAINER_PORT}"

    environment:
      OTEL_SERVICE_NAME: glasswing-${SLUG}
COMPOSE_HEADER

  # Add non-secret environment variables
  ENV_COUNT="$(echo "$JSON" | jq '.environment | length // 0')"
  if [[ "$ENV_COUNT" -gt 0 ]]; then
    echo "$JSON" | jq -r '.environment // {} | to_entries[] | "      \(.key): \(.value)"'
  fi

  # Add secret environment variables (referenced from Infisical)
  SECRET_COUNT="$(echo "$JSON" | jq '.secrets | length // 0')"
  if [[ "$SECRET_COUNT" -gt 0 ]]; then
    while IFS= read -r skey; do
      [[ -z "$skey" ]] && continue
      echo "      ${skey}: \${${skey}:?Required from Infisical}"
    done < <(echo "$JSON" | jq -r '.secrets // {} | keys[]')
  fi

  # Add volumes if defined
  VOL_COUNT="$(echo "$JSON" | jq '.volumes | length // 0')"
  if [[ "$VOL_COUNT" -gt 0 ]]; then
    echo ""
    echo "    volumes:"
    echo "$JSON" | jq -r '.volumes[] | "      - \(.name):\(.container_path)"'
  fi

  # Add healthcheck if path is not just "/"
  if [[ "$HEALTH_PATH" != "/" ]]; then
    cat <<HEALTHCHECK

    healthcheck:
      test:
        - CMD
        - curl
        - -f
        - "http://127.0.0.1:${CONTAINER_PORT}${HEALTH_PATH}"
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
HEALTHCHECK
  fi

  cat <<COMPOSE_FOOTER

    labels:
      com.glasswing.service: ${SLUG}

    networks:
      - glasswing

COMPOSE_FOOTER

  # Add volume declarations if named volumes are used
  if [[ "$VOL_COUNT" -gt 0 ]]; then
    echo "volumes:"
    echo "$JSON" | jq -r '.volumes[] | "  \(.name):\n    name: glasswing-\(.name)"'
  fi

  cat <<COMPOSE_NETWORK

networks:
  glasswing:
    name: \${GLASSWING_NETWORK:-glasswing}
    external: true
COMPOSE_NETWORK

} > "$STACK_DIR/compose.yaml"

ok "Created compose.yaml"

# ── Build secrets.list ────────────────────────────────────────────────────

{
  echo "# Global: loaded automatically from /global"
  echo "# Stack path: /${SLUG}"
  echo ""

  if [[ "$SECRET_COUNT" -gt 0 ]]; then
    echo "$JSON" | jq -r '.secrets // {} | keys[]'
  else
    echo "# No custom env vars beyond global OTEL+TZ"
  fi
} > "$STACK_DIR/secrets.list"

ok "Created secrets.list"

# ── Build registry file for Infisical ─────────────────────────────────────

{
  echo "# Stack-specific secrets — Infisical path /${SLUG}"

  if [[ "$SECRET_COUNT" -gt 0 ]]; then
    echo "$JSON" | jq -r '.secrets // {} | to_entries[] | "\(.key)=\(.value)"'
  fi
} > "$STACK_DIR/${SLUG}-config.registry"

ok "Created ${SLUG}-config.registry"

# ── Register secrets in Infisical ─────────────────────────────────────────

if [[ "$SECRET_COUNT" -gt 0 ]]; then
  info "Registering $SECRET_COUNT secrets in Infisical at /${SLUG}"
  bash "$ROOT/scripts/infisical-register.sh" "/${SLUG}" "$STACK_DIR/${SLUG}-config.registry"
  ok "Secrets registered"
else
  info "No custom secrets to register"
fi

# ── Update VERSIONS.yaml ──────────────────────────────────────────────────

VERSIONS_FILE="$ROOT/stacks/VERSIONS.yaml"

# Determine the section for this service. Put external services under
# "Application Services" section.
# Extract the image reference without tag for VERSIONS.yaml
IMAGE_REF="${IMAGE%:*}"

# Build the YAML entry
ENTRY="  ${SLUG}:
    image: ${IMAGE_REF}
    tag: \"${TAG}\"
    mutable: false
    updated: \"${TODAY}\"
    build-type: external"

if [[ -n "$NOTES" ]]; then
  ENTRY="${ENTRY}
    notes: \"${NOTES}\""
fi

# Insert before the last line of the file (which is the end of the stacks block)
# We add under the "Application Services" section if it exists, otherwise
# at the end before the last line.
if grep -q '# ── Application Services' "$VERSIONS_FILE"; then
  # Insert after the Application Services header line
  awk -v entry="$ENTRY" '
    /# ── Application Services/ {
      print
      # Indent and print entry
      n = split(entry, lines, "\n")
      for (i = 1; i <= n; i++) print lines[i]
      next
    }
    { print }
  ' "$VERSIONS_FILE" > "$VERSIONS_FILE.tmp" && mv "$VERSIONS_FILE.tmp" "$VERSIONS_FILE"
else
  # Append before the last line
  head -n -1 "$VERSIONS_FILE" > "$VERSIONS_FILE.tmp"
  echo "" >> "$VERSIONS_FILE.tmp"
  echo "$ENTRY" >> "$VERSIONS_FILE.tmp"
  tail -n 1 "$VERSIONS_FILE" >> "$VERSIONS_FILE.tmp"
  mv "$VERSIONS_FILE.tmp" "$VERSIONS_FILE"
fi

ok "Updated VERSIONS.yaml"

# ── Update homepage services.yaml ─────────────────────────────────────────

HOMEPAGE_FILE="$ROOT/stacks/homepage/config/services.yaml"

# Determine the protocol for the health check — most services use http
# unless they have TLS configured. Default to http.
PROTO="http"

# Build the homepage entry
HOMEPAGE_ENTRY="    - ${SLUG}:
        icon: ${ICON}
        href: ${PROTO}://192.168.68.62:${HOST_PORT}
        description: ${DESCRIPTION}
        container: glasswing-${SLUG}
        siteMonitor: ${PROTO}://192.168.68.62:${HOST_PORT}${HEALTH_PATH}"

# Insert under the specified category. The category line format is:
# "- Category Name:"
# We insert the new entry right after the category header line.
CATEGORY_ESCAPED="$(echo "$CATEGORY" | sed 's/[\/&]/\\&/g')"

if grep -q "^- ${CATEGORY}:" "$HOMEPAGE_FILE"; then
  awk -v entry="$HOMEPAGE_ENTRY" -v cat="$CATEGORY" '
    /^- '"$CATEGORY_ESCAPED"':$/ {
      print
      # Indent and print entry (8 spaces for service entry under category)
      n = split(entry, lines, "\n")
      for (i = 1; i <= n; i++) print lines[i]
      next
    }
    { print }
  ' "$HOMEPAGE_FILE" > "$HOMEPAGE_FILE.tmp" && mv "$HOMEPAGE_FILE.tmp" "$HOMEPAGE_FILE"
else
  fail "Category '$CATEGORY' not found in homepage services.yaml. Available categories: $(grep '^-' "$HOMEPAGE_FILE" | sed 's/:$//' | tr '\n' ', ')"
fi

ok "Updated homepage services.yaml"

# ── Deploy ────────────────────────────────────────────────────────────────

info "Deploying stack $SLUG"
cd "$ROOT"
make up STACK="$SLUG" INFISICAL_PATH="/${SLUG}"
ok "Stack $SLUG deployed"

# ── Verify ────────────────────────────────────────────────────────────────

info "Verifying stack $SLUG"
make check STACK="$SLUG"
ok "Stack $SLUG is healthy"

# ── Summary ───────────────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  Service onboarded successfully: $SLUG"
echo "  URL: ${PROTO}://192.168.68.62:${HOST_PORT}"
echo "  Health: ${PROTO}://192.168.68.62:${HOST_PORT}${HEALTH_PATH}"
echo "  Stack: stacks/${SLUG}/"
echo "=========================================="
echo ""
