#!/usr/bin/env bash
# pre-up.sh — Prepare the Forgejo Runner config before the container starts.
#
# The runner-config.yml is generated here (not baked into the image) so the
# runner token can be rotated without rebuilding.
#
# The token is read from FORGEJO_RUNNER_TOKEN (env var, injected by Infisical)
# or from the existing .runner-data/runner-config.yml file.
set -euo pipefail

RUNNER_DATA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.runner-data"
mkdir -p "$RUNNER_DATA_DIR"

FORGEJO_URL="${FORGEJO_URL:-http://192.168.68.62:3011}"

# If the config already exists, leave it alone (token was set manually or previously).
if [ -f "$RUNNER_DATA_DIR/runner-config.yml" ]; then
  echo "[PASS] Runner config already exists: $RUNNER_DATA_DIR/runner-config.yml"
  exit 0
fi

# If FORGEJO_RUNNER_TOKEN is set (via Infisical), use it.
if [ -n "${FORGEJO_RUNNER_TOKEN:-}" ]; then
  cat > "$RUNNER_DATA_DIR/runner-config.yml" <<EOF
url: $FORGEJO_URL
token: $FORGEJO_RUNNER_TOKEN
labels:
  - name: glasswing
    type: host
EOF
  echo "[PASS] Runner config written from FORGEJO_RUNNER_TOKEN"
  exit 0
fi

echo "[WARN] FORGEJO_RUNNER_TOKEN not set and no existing config found."
echo "[WARN] Runner will start but cannot register."
echo "[WARN] Set the token in .runner-data/runner-config.yml or Infisical /forgejo-runner."

# Write a placeholder config so the container can start.
cat > "$RUNNER_DATA_DIR/runner-config.yml" <<EOF
# Placeholder — runner token not yet configured.
url: $FORGEJO_URL
token: "REPLACE_ME"
labels:
  - name: glasswing
    type: host
EOF
