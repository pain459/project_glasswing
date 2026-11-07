#!/usr/bin/env bash
# pre-up.sh — Clone the glasswing-power fork into stacks/glasswing-power/src/
# for Docker builds.
#
# glasswing-power is a Rust power/energy metering agent (Scaphandre fork) with
# no prebuilt Docker image, so we build it from source. The fork is pinned to a
# specific commit for reproducible builds.
# To update, change POWER_COMMIT below and run `make rebuild STACK=glasswing-power`.
set -euo pipefail

STACK_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="${STACK_DIR}/src"
POWER_REPO="https://github.com/pain459/glasswing-power.git"
POWER_COMMIT="6de2e9cd5805087b4d80e819dedb1ece680080bb"

if [ -d "${SRC_DIR}/.git" ]; then
  echo "[INFO] glasswing-power source already present at ${SRC_DIR}"
  # Verify the pinned commit is available locally
  if git -C "${SRC_DIR}" cat-file -e "${POWER_COMMIT}" 2>/dev/null; then
    echo "[INFO] Pinned commit ${POWER_COMMIT:0:7} verified"
    # Make sure we're at the right commit
    git -C "${SRC_DIR}" checkout "${POWER_COMMIT}" --quiet 2>/dev/null || true
  else
    echo "[WARN] Pinned commit not found locally, fetching"
    git -C "${SRC_DIR}" fetch --quiet "${POWER_REPO}" "${POWER_COMMIT}"
    git -C "${SRC_DIR}" checkout "${POWER_COMMIT}" --quiet
  fi
else
  echo "[INFO] Cloning glasswing-power fork to ${SRC_DIR}"
  git clone --no-tags "${POWER_REPO}" "${SRC_DIR}"
  git -C "${SRC_DIR}" checkout "${POWER_COMMIT}" --quiet
  # Shallow the history after checkout to save disk
  git -C "${SRC_DIR}" reflog expire --expire=now --all
  git -C "${SRC_DIR}" gc --prune=now --aggressive
  echo "[INFO] Cloned glasswing-power at commit ${POWER_COMMIT:0:7}"
fi

echo "[PASS] glasswing-power source ready"
