#!/usr/bin/env bash
# pre-up.sh — Clone the ATLAS fork into stacks/atlas/src/ for Docker builds.
#
# The fork is pinned to a specific commit for reproducible builds.
# To update, change ATLAS_COMMIT below and run `make rebuild STACK=atlas`.
set -euo pipefail

STACK_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="${STACK_DIR}/src"
ATLAS_REPO="https://github.com/pain459/ATLAS.git"
ATLAS_COMMIT="0b84571891a62d93e0c7458104cb4c04b49ed85a"

if [ -d "${SRC_DIR}/.git" ]; then
  echo "[INFO] ATLAS source already present at ${SRC_DIR}"
  # Verify the pinned commit is available locally
  if git -C "${SRC_DIR}" cat-file -e "${ATLAS_COMMIT}" 2>/dev/null; then
    echo "[INFO] Pinned commit ${ATLAS_COMMIT:0:7} verified"
    # Make sure we're at the right commit
    git -C "${SRC_DIR}" checkout "${ATLAS_COMMIT}" --quiet 2>/dev/null || true
  else
    echo "[WARN] Pinned commit not found locally, fetching"
    git -C "${SRC_DIR}" fetch --quiet "${ATLAS_REPO}" "${ATLAS_COMMIT}"
    git -C "${SRC_DIR}" checkout "${ATLAS_COMMIT}" --quiet
  fi
else
  echo "[INFO] Cloning ATLAS fork to ${SRC_DIR}"
  git clone --no-tags "${ATLAS_REPO}" "${SRC_DIR}"
  git -C "${SRC_DIR}" checkout "${ATLAS_COMMIT}" --quiet
  # Shallow the history after checkout to save disk
  git -C "${SRC_DIR}" reflog expire --expire=now --all
  git -C "${SRC_DIR}" gc --prune=now --aggressive
  echo "[INFO] Cloned ATLAS at commit ${ATLAS_COMMIT:0:7}"
fi

echo "[PASS] ATLAS source ready"
