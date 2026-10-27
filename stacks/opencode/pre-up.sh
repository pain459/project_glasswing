#!/usr/bin/env bash
# Runs before `make up STACK=opencode`.
#
# OpenCode needs the inference backend. Reconciling the Ollama stack here means
# a single `make up STACK=opencode` also starts Ollama and applies the checked-in
# model recipe. The Ollama preflight is skipped because the OpenCode post-up
# hook validates the complete path, including all Ollama checks.
#
# The three local images are rebuilt from their Dockerfiles. Compose only builds
# when an image is missing, which would silently ignore a Dockerfile edit. The
# build is cached, so an unchanged context costs a second or two.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

INFISICAL_PATH="${INFISICAL_PATH:-/opencode}"

printf '[INFO] Building local OpenCode images\n'
if [ -s stacks/opencode/secrets.list ]; then
  ./scripts/with-infisical.sh "$INFISICAL_PATH" stacks/opencode/secrets.list -- \
    docker compose -f stacks/opencode/compose.yaml build
else
  docker compose -f stacks/opencode/compose.yaml build
fi

printf '[INFO] Reconciling the Ollama inference backend\n'
make --no-print-directory up STACK=ollama SKIP_PREFLIGHT=1
