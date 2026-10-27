#!/usr/bin/env bash
# pre-up.sh — ensure Dagu directories are writable before startup.
#
# Dagu runs as a non-root user (default PUID=1000). The named volume may
# have been created with root ownership from a prior failed run, which
# blocks Dagu from writing runtime files. This hook fixes ownership
# before the container starts.

set -euo pipefail

VOLUME="glasswing-dagu-data"

# Only fix if the volume exists
if docker volume inspect "$VOLUME" &>/dev/null; then
    echo "[INFO] Fixing Dagu directory ownership in volume $VOLUME"
    # Run a throwaway container to chown the entire data directory inside the volume
    docker run --rm \
        -v "$VOLUME:/data" \
        alpine:3.20 \
        sh -c 'chown -R 1000:1000 /data/dags /data/data 2>/dev/null || true'
fi
