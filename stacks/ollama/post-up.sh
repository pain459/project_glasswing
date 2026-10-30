#!/usr/bin/env bash
# Runs after `make up STACK=ollama` and after the container is healthy.
#
# 1. Ensures the base model and the checked-in coding model are present.
# 2. Validates GPU access, runtime flags, effective model parameters and a
#    non-truncated coding response.
#
# Run `make ai-preflight` separately to validate the host-installed OpenCode
# client against this Ollama service.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

./stacks/ollama/build-model.sh

if [ "${SKIP_PREFLIGHT:-0}" != "1" ]; then
  ./scripts/ai-preflight.sh --ollama
fi
