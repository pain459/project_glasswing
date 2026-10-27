#!/usr/bin/env bash
# bump-image.sh — Update an image tag in a stack's compose.yaml file.
#
# Usage:
#   ./scripts/bump-image.sh <stack> <old-tag> <new-tag>
#   ./scripts/bump-image.sh ollama latest 0.40.11
#   ./scripts/bump-image.sh flowise 3.1.3 3.2.0
#
# This edits the compose.yaml in-place. Review the diff before committing.
# Run on the host where the repository lives.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  echo "Usage: $0 <stack> <old-tag> <new-tag>"
  echo ""
  echo "Examples:"
  echo "  $0 ollama latest 0.40.11"
  echo "  $0 flowise 3.1.3 3.2.0"
  echo ""
  echo "This edits stacks/<stack>/compose.yaml in-place."
  echo "Review the diff, then commit and deploy with make up."
  exit 1
}

[ $# -lt 3 ] && usage

STACK="$1"
OLD_TAG="$2"
NEW_TAG="$3"

COMPOSE_FILE="$REPO_DIR/stacks/${STACK}/compose.yaml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "[FAIL] No compose file found: $COMPOSE_FILE"
  exit 1
fi

# Find all image: lines and show which ones match the old tag
echo "Looking for images with tag '${OLD_TAG}' in ${COMPOSE_FILE}..."
echo ""

MATCHES=0
while IFS= read -r line; do
  MATCHES=$((MATCHES + 1))
  echo "  Found: $line"
done < <(grep -n "image:.*:${OLD_TAG}" "$COMPOSE_FILE" || true)

if [ "$MATCHES" -eq 0 ]; then
  echo "[WARN] No images with tag '${OLD_TAG}' found in ${COMPOSE_FILE}"
  echo "Current image lines:"
  grep -n "image:" "$COMPOSE_FILE" || true
  exit 1
fi

echo ""
echo "Found ${MATCHES} image(s) with tag '${OLD_TAG}'."
echo "Replacing with '${NEW_TAG}'..."
echo ""

# Create backup
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.bak"

# Do the replacement
sed -i "s/:${OLD_TAG}$/:${NEW_TAG}/g" "$COMPOSE_FILE"

# Show diff
echo "--- Diff ---"
diff -u "${COMPOSE_FILE}.bak" "$COMPOSE_FILE" || true
echo ""

# Clean up backup
rm -f "${COMPOSE_FILE}.bak"

echo "Done. Review the changes, then:"
echo "  git add ${COMPOSE_FILE}"
echo "  git commit -m \"bump: ${STACK} image to ${NEW_TAG}\""
echo "  make up STACK=${STACK}"
