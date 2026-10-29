#!/usr/bin/env bash
# pre-up.sh — Clone (or update) the telugu-calendar-utilities source before
# the Docker build. The source lives in stacks/panchangam/src/ and is
# .gitignored so it doesn't pollute the Glasswing repo.
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)/src"
REPO="https://github.com/pain459/telugu-calendar-utilities.git"

if [ -d "$SRC_DIR/.git" ]; then
  echo "[INFO] Panchangam source exists, fetching latest..."
  (cd "$SRC_DIR" && git fetch --all && git reset --hard origin/master)
else
  echo "[INFO] Cloning Panchangam source..."
  git clone "$REPO" "$SRC_DIR"
fi

echo "[PASS] Panchangam source ready at $SRC_DIR"
