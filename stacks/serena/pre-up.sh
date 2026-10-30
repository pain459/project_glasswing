#!/usr/bin/env bash
# Generate compose.override.yaml from repos.env so repo mounts are
# configurable without touching the committed compose.yaml.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_ENV="$SCRIPT_DIR/repos.env"
OVERRIDE="$SCRIPT_DIR/compose.override.yaml"

if [[ ! -f "$REPOS_ENV" ]]; then
  echo "[WARN] $REPOS_ENV not found — no repo mounts will be configured"
  echo "[INFO] Copy repos.env.example to repos.env and edit it"
  exit 0
fi

# Build the volumes list from repos.env.
# Format per line:  HOST_PATH:CONTAINER_PATH[:ro]
# Lines starting with # or blank are ignored.
volumes=()
while IFS= read -r line || [[ -n "$line" ]]; do
  # Strip leading/trailing whitespace
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  # Skip blanks and comments
  [[ -z "$line" || "$line" == \#* ]] && continue
  volumes+=("      - $line")
done < "$REPOS_ENV"

if [[ ${#volumes[@]} -eq 0 ]]; then
  echo "[WARN] repos.env has no valid mount entries"
  exit 0
fi

# Write the override file
{
  echo "services:"
  echo "  serena:"
  echo "    volumes:"
  printf '%s\n' "${volumes[@]}"
} > "$OVERRIDE"

echo "[INFO] Generated $OVERRIDE with ${#volumes[@]} repo mount(s)"
