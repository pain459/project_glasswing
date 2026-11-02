#!/usr/bin/env bash
# pre-up.sh — Ensure the JPL ephemeris kernel is available before the API starts.
# The kernel is cached in the sky_ephemeris_data Docker volume, so subsequent
# deploys skip the download.
set -euo pipefail

EPHEMERIS_DIR="$(cd "$(dirname "$0")" && pwd)/data/ephemeris"
KERNEL_URL="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp"
KERNEL_FILE="de440s.bsp"
EXPECTED_SHA256="c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2"

mkdir -p "$EPHEMERIS_DIR"

if [ -f "$EPHEMERIS_DIR/$KERNEL_FILE" ]; then
  actual_sha=$(sha256sum "$EPHEMERIS_DIR/$KERNEL_FILE" | cut -d' ' -f1)
  if [ "$actual_sha" = "$EXPECTED_SHA256" ]; then
    echo "[INFO] Ephemeris kernel already verified at $EPHEMERIS_DIR/$KERNEL_FILE"
    echo "[PASS] Sky pre-up check passed"
    exit 0
  else
    echo "[WARN] Kernel checksum mismatch, re-downloading..."
  fi
fi

echo "[INFO] Downloading JPL DE440S ephemeris kernel..."
curl -sfL -o "$EPHEMERIS_DIR/$KERNEL_FILE" "$KERNEL_URL"

actual_sha=$(sha256sum "$EPHEMERIS_DIR/$KERNEL_FILE" | cut -d' ' -f1)
if [ "$actual_sha" != "$EXPECTED_SHA256" ]; then
  echo "[FAIL] Kernel checksum verification failed"
  rm -f "$EPHEMERIS_DIR/$KERNEL_FILE"
  exit 1
fi

echo "[PASS] Ephemeris kernel downloaded and verified"
