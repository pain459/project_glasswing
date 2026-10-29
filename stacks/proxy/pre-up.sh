#!/usr/bin/env bash
# pre-up.sh — prepare the shared network and TLS material before nginx starts.
#
# 1. Create the external `glasswing-proxy` network if it does not exist.
# 2. Issue the wildcard certificate if it is missing or expiring.
#
# Both operations are idempotent.

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

NETWORK="glasswing-proxy"

if docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "[INFO] Docker network $NETWORK already exists"
else
  echo "[INFO] Creating Docker network $NETWORK"
  docker network create --driver bridge "$NETWORK" >/dev/null
fi

echo "[INFO] Ensuring the proxy wildcard certificate is present"
./scripts/gen-proxy-cert.sh
