#!/usr/bin/env bash
# opencode-costs.sh - Token usage and electricity cost for OpenCode.
#
# OpenCode routes through LiteLLM, which records every request in Postgres.
# This wrapper delegates to opencode-costs.py, which reads that ledger.
#
# Usage:
#   ./scripts/opencode-costs.sh                 # last 30 days
#   ./scripts/opencode-costs.sh --days 7
#   ./scripts/opencode-costs.sh --json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec python3 "$SCRIPT_DIR/opencode-costs.py" "$@"
