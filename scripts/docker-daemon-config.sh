#!/usr/bin/env bash
# docker-daemon-config.sh — keep the Docker daemon's network pool sized for Glasswing.
#
# Docker allocates every new bridge network from `default-address-pools`. The
# built-in pools yield roughly 16 networks, which a 29-stack platform exhausts:
#
#   Error response from daemon: all predefined address pools have been fully subnetted
#
# This script merges a wider pool into /etc/docker/daemon.json without touching
# other keys (the NVIDIA runtime lives there too), backs up the previous file,
# and restarts the daemon only when something changed.
#
# Usage:
#   ./scripts/docker-daemon-config.sh --check   # report drift, exit 1 if unset
#   ./scripts/docker-daemon-config.sh --apply   # write the pool and restart Docker
#   ./scripts/docker-daemon-config.sh --show    # print the current effective pool
#
# Environment:
#   POOL_BASE=172.16.0.0/12   POOL_SIZE=24   (4096 networks, clear of 192.168.68.0/24)
set -Eeuo pipefail

DAEMON_JSON="${DAEMON_JSON:-/etc/docker/daemon.json}"
POOL_BASE="${POOL_BASE:-172.16.0.0/12}"
POOL_SIZE="${POOL_SIZE:-24}"

MODE="${1:---check}"
case "$MODE" in
  --check|--apply|--show) ;;
  *) echo "usage: $0 [--check|--apply|--show]" >&2; exit 2 ;;
esac

read -r POOL_PREFIX < <(python3 -c 'import ipaddress,sys; print(ipaddress.ip_network(sys.argv[1]).prefixlen)' "$POOL_BASE")
CAPACITY=$(( 1 << (POOL_SIZE - POOL_PREFIX) ))

current_pools() {
  python3 - "$DAEMON_JSON" <<'PY'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except FileNotFoundError:
    data = {}
print(json.dumps(data.get("default-address-pools", []), separators=(",", ":")))
PY
}

desired_pools() {
  printf '[{"base":"%s","size":%s}]' "$POOL_BASE" "$POOL_SIZE"
}

case "$MODE" in
  --show)
    echo "daemon.json: $DAEMON_JSON"
    echo "pools:       $(current_pools)"
    echo "desired:     $(desired_pools)  (${CAPACITY} networks)"
    exit 0
    ;;
esac

if [ "$(current_pools)" = "$(desired_pools)" ]; then
  echo "[PASS] Docker address pool already set to ${POOL_BASE} with /${POOL_SIZE} slices (${CAPACITY} networks)"
  exit 0
fi

if [ "$MODE" = "--check" ]; then
  echo "[FAIL] Docker address pool is $(current_pools)"
  echo "       expected ${POOL_BASE} with /${POOL_SIZE} slices (${CAPACITY} networks; stock pools allow ~16)"
  echo "       fix: sudo ./scripts/docker-daemon-config.sh --apply"
  exit 1
fi

# --apply -------------------------------------------------------------------
if [ "${EUID}" -ne 0 ] && [ "$DAEMON_JSON" = "/etc/docker/daemon.json" ]; then
  echo "[INFO] Re-running with sudo to write $DAEMON_JSON"
  exec sudo -E POOL_BASE="$POOL_BASE" POOL_SIZE="$POOL_SIZE" DAEMON_JSON="$DAEMON_JSON" "$0" --apply
fi

mkdir -p "$(dirname "$DAEMON_JSON")"
if [ -f "$DAEMON_JSON" ]; then
  BACKUP="${DAEMON_JSON}.bak.$(date +%Y%m%d-%H%M%S)"
  cp -a "$DAEMON_JSON" "$BACKUP"
  echo "[INFO] Backed up $DAEMON_JSON -> $BACKUP"
  echo "[INFO] Previous pools: $(current_pools)"
fi

echo "[INFO] Writing default-address-pools ${POOL_BASE} with /${POOL_SIZE} slices (${CAPACITY} networks)"
python3 - "$DAEMON_JSON" "$POOL_BASE" "$POOL_SIZE" <<'PY'
import json, os, sys, tempfile

path, base, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
try:
    with open(path) as fh:
        data = json.load(fh)
except FileNotFoundError:
    data = {}

data["default-address-pools"] = [{"base": base, "size": size}]

# Validate before replacing: same directory so the rename is atomic.
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
with os.fdopen(fd, "w") as fh:
    json.dump(data, fh, indent=4)
    fh.write("\n")
os.replace(tmp, path)
PY

python3 -m json.tool "$DAEMON_JSON" >/dev/null
echo "[INFO] daemon.json is valid JSON; keys preserved: $(python3 -c 'import json,sys;print(",".join(sorted(json.load(open(sys.argv[1])))))' "$DAEMON_JSON")"

if [ "${NO_RESTART:-0}" = "1" ]; then
  echo "[INFO] NO_RESTART=1; not restarting Docker"
  exit 0
fi

echo "[WARN] Restarting Docker; every container drops for a few seconds and comes back"
echo "       via its restart policy. Existing networks keep their subnets."
systemctl restart docker

for _ in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then break; fi
  sleep 1
done
docker info >/dev/null 2>&1 || { echo "[FAIL] Docker did not come back; check: systemctl status docker"; exit 1; }

echo "[PASS] Docker restarted with ${CAPACITY} available networks"
echo "       $(docker network ls --format '{{.Name}}' | wc -l) networks exist now; new ones draw from ${POOL_BASE} at /${POOL_SIZE}"
