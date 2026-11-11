#!/usr/bin/env bash
# build.sh — Build the glasswing/parlour Docker image from braedonsaunders/parlour.
#
# parlour is a static Next.js export (output: 'export') with peer-to-peer
# multiplayer (WebRTC). No game server needed. Served by the project's own
# zero-dependency static server (serve-export.mjs).
#
# Usage:
#   build.sh [UPSTREAM_REF]   # default: main
#
# The resulting image is tagged glasswing/parlour:<version>.

set -Eeuo pipefail
umask 077

UPSTREAM_REF="${1:-main}"
UPSTREAM_REPO="https://github.com/braedonsaunders/parlour.git"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "[INFO] Cloning $UPSTREAM_REPO @ $UPSTREAM_REF"
git clone --depth 1 --branch "$UPSTREAM_REF" "$UPSTREAM_REPO" "$WORKDIR/repo"

# Patch serve-export.mjs to bind to 0.0.0.0 (upstream hardcodes 127.0.0.1)
sed -i "s/server.listen(port, '127.0.0.1', () => {/server.listen(port, process.env.HOST || '0.0.0.0', () => {/" "$WORKDIR/repo/apps/web/scripts/serve-export.mjs"
sed -i "s/process.stdout.write(\`serving \${root} on http:\/\/127.0.0.1:\${port}\\\\n\`);/process.stdout.write(\`serving \${root} on http:\/\/\${process.env.HOST || '0.0.0.0'}:\${port}\\\\n\`);/" "$WORKDIR/repo/apps/web/scripts/serve-export.mjs"

# Add the Glasswing Dockerfile
cp "$(dirname "$0")/Dockerfile" "$WORKDIR/repo/Dockerfile.glasswing"

echo "[INFO] Building glasswing/parlour:1.0.0"

docker build -f "$WORKDIR/repo/Dockerfile.glasswing" -t "glasswing/parlour:1.0.0" "$WORKDIR/repo"

echo "[OK]   Built glasswing/parlour:1.0.0"
