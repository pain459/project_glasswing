#!/usr/bin/env bash
# Runs after `make up STACK=ollama` and after the container is healthy.
#
# 1. Ensures the base model and the checked-in coding model are present.
# 2. Validates GPU access, runtime flags, effective model parameters and a
#    non-truncated coding response.
#
# `make up STACK=opencode` calls the Ollama stack with SKIP_PREFLIGHT=1 so the
# full OpenCode preflight is the only validation that runs on that path.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

./stacks/ollama/build-model.sh

if [ "${SKIP_PREFLIGHT:-0}" != "1" ]; then
  ./scripts/ai-preflight.sh --ollama
fi
