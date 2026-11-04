#!/usr/bin/env bash
# Generate compose.override.yaml from repos.env so repo mounts are
# configurable without touching the committed compose.yaml.
# Also generates a projects list file that init-permissions uses to
# sync the Serena projects registry.
#
# repos.env format — one line per repo:
#   HOST_PATH:CONTAINER_PATH[:ro]
# The first valid line is treated as the active project (passed as --project
# to Serena on startup).  Add more lines below it for additional mounts.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_ENV="$SCRIPT_DIR/repos.env"
OVERRIDE="$SCRIPT_DIR/compose.override.yaml"
PROJECTS_LIST="$SCRIPT_DIR/.projects.list"

if [[ ! -f "$REPOS_ENV" ]]; then
  echo "[WARN] $REPOS_ENV not found — no repo mounts will be configured"
  echo "[INFO] Copy repos.env.example to repos.env and edit it"
  exit 0
fi

# Build the volumes list and extract container paths for the projects registry.
# The first valid line becomes the active project.
volumes=()
projects=()
active_project=""
while IFS= read -r line || [[ -n "$line" ]]; do
  # Strip leading/trailing whitespace
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  # Skip blanks and comments
  [[ -z "$line" || "$line" == \#* ]] && continue
  volumes+=("      - $line")
  # Extract the container path (second colon-separated field)
  container_path="$(echo "$line" | cut -d: -f2)"
  projects+=("$container_path")
  # First valid line is the active project
  if [[ -z "$active_project" ]]; then
    active_project="$container_path"
  fi
done < "$REPOS_ENV"

if [[ ${#volumes[@]} -eq 0 ]]; then
  echo "[WARN] repos.env has no valid mount entries"
  exit 0
fi

# Write the override file.
# The active project (--project) is always set from the first mount line.
{
  echo "services:"
  echo "  serena:"
  echo "    command:"
  echo "      - serena"
  echo "      - start-mcp-server"
  echo "      - --project"
  echo "      - $active_project"
  echo "      - --transport"
  echo "      - streamable-http"
  echo "      - --port"
  echo '      - "9121"'
  echo "      - --host"
  echo "      - 0.0.0.0"
  echo "    volumes:"
  printf '%s\n' "${volumes[@]}"
} > "$OVERRIDE"

# Write the projects list for init-permissions to consume.
# Each line is a container path that should be registered as a Serena project.
printf '%s\n' "${projects[@]}" > "$PROJECTS_LIST"

echo "[INFO] Generated $OVERRIDE with ${#volumes[@]} repo mount(s)"
echo "[INFO] Generated $PROJECTS_LIST with ${#projects[@]} project path(s)"
echo "[INFO] Active project set to $active_project"
