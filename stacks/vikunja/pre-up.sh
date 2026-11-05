#!/usr/bin/env bash
# pre-up.sh — Ensure Vikunja volumes are writable by uid 1000 before startup.
#
# Vikunja runs as uid 1000. Docker named volumes are created with root
# ownership, which blocks the container from writing runtime files.
# This hook fixes ownership before the container starts.

set -euo pipefail

for VOLUME in glasswing-vikunja_files glasswing-vikunja_db; do
  if docker volume inspect "$VOLUME" &>/dev/null; then
    echo "[INFO] Fixing ownership in volume $VOLUME"
    docker run --rm \
        -v "$VOLUME:/data" \
        alpine:3.20 \
        sh -c 'chown -R 1000:0 /data 2>/dev/null || true'
  fi
done
