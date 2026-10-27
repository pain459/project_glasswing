#!/usr/bin/env bash
# Runs before `make up STACK=opencode`.
#
# OpenCode needs the inference backend. Reconciling the Ollama stack here means
# a single `make up STACK=opencode` also starts Ollama and applies the checked-in
# model recipe. The Ollama preflight is skipped because the OpenCode post-up
# hook validates the complete path, including all Ollama checks.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

printf '[INFO] Reconciling the Ollama inference backend\n'
make --no-print-directory up STACK=ollama SKIP_PREFLIGHT=1
