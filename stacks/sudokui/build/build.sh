#!/usr/bin/env bash
# build.sh — Build the glasswing/sudokui Docker image from AImenes/sudokUI.
#
# sudokUI is a static PWA + Cloudflare Worker with no published Docker image.
# This script clones the repo, adds a small Node server (server.mjs) that
# renders the /p/ and /daily/ share pages (mirroring the Worker), and builds
# a self-contained image. The daily global-stats API and telemetry are
# Cloudflare-specific (D1 / Analytics Engine) and are not available here;
# the app still plays fully.
#
# Usage:
#   build.sh [UPSTREAM_REF]   # default: main
#
# The resulting image is tagged glasswing/sudokui:<version>.

set -Eeuo pipefail
umask 077

UPSTREAM_REF="${1:-main}"
UPSTREAM_REPO="https://github.com/AImenes/sudokUI.git"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "[INFO] Cloning $UPSTREAM_REPO @ $UPSTREAM_REF"
git clone --depth 1 --branch "$UPSTREAM_REF" "$UPSTREAM_REPO" "$WORKDIR/repo"

# Add the Glasswing server and Dockerfile
cp "$(dirname "$0")/server.mjs" "$WORKDIR/repo/server.mjs"
cp "$(dirname "$0")/Dockerfile" "$WORKDIR/repo/Dockerfile.glasswing"

# Determine the version from the upstream package.json
VERSION="$(cd "$WORKDIR/repo" && jq -r .version package.json)"
echo "[INFO] Building glasswing/sudokui:$VERSION"

docker build -f "$WORKDIR/repo/Dockerfile.glasswing" -t "glasswing/sudokui:$VERSION" "$WORKDIR/repo"

echo "[OK]   Built glasswing/sudokui:$VERSION"
