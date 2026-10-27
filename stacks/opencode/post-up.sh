#!/usr/bin/env bash
# Runs after `make up STACK=opencode` and after the container is healthy.
#
# Validates the full path: GPU access, Ollama runtime flags and model limits,
# the effective OpenCode configuration, container-to-container connectivity,
# a non-truncated coding response with thinking disabled, and GPU residency.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

./scripts/ai-preflight.sh --opencode
