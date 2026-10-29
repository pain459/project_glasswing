#!/usr/bin/env bash
# doctor.sh — preflight the host and the repository for the failure modes that
# have actually bitten this platform:
#
#   * Docker network pool exhaustion  ("all predefined address pools ...")
#   * a stack publishing a port another stack already owns
#   * a service bound to 0.0.0.0 instead of the LAN IP
#   * containers stuck in a restart loop
#   * orphan networks from stacks that no longer exist
#   * Infisical not healthy before `make` tries to inject secrets
#
# Usage: ./scripts/doctor.sh
# Exit code: 0 when nothing failed, 1 when at least one [FAIL] was printed.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAILS=0
WARNS=0
pass() { printf '[PASS] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; WARNS=$((WARNS + 1)); }
fail() { printf '[FAIL] %s\n' "$*"; FAILS=$((FAILS + 1)); }

echo "Glasswing doctor"
echo "================"

# --- 1. Docker reachable -----------------------------------------------------
if docker info >/dev/null 2>&1; then
  pass "Docker daemon reachable ($(docker info --format '{{.ServerVersion}}'))"
else
  fail "Docker daemon not reachable; stop here"
  exit 1
fi

# --- 2. Address pool headroom ------------------------------------------------
POOL_JSON="$(python3 - <<'PY'
import json
try:
    data = json.load(open("/etc/docker/daemon.json"))
except FileNotFoundError:
    data = {}
print(json.dumps(data.get("default-address-pools", [])))
PY
)"

if [ "$POOL_JSON" = "[]" ]; then
  warn "No default-address-pools in /etc/docker/daemon.json; Docker allows ~16 networks"
  warn "  fix: sudo ./scripts/docker-daemon-config.sh --apply"
  CAPACITY=16
else
  CAPACITY="$(python3 - "$POOL_JSON" <<'PY'
import ipaddress, json, sys
pools = json.loads(sys.argv[1])
total = 0
for pool in pools:
    base = ipaddress.ip_network(pool["base"])
    total += 1 << (int(pool["size"]) - base.prefixlen)
print(total)
PY
)"
  pass "Address pools allow ${CAPACITY} networks ($POOL_JSON)"
fi

NET_COUNT="$(docker network ls --format '{{.Name}}' | wc -l | tr -d ' ')"
REMAINING=$((CAPACITY - NET_COUNT))
if [ "$REMAINING" -ge 10 ]; then
  pass "${NET_COUNT} networks exist; ${REMAINING} left in the pool"
elif [ "$REMAINING" -ge 1 ]; then
  warn "${NET_COUNT} networks exist; only ${REMAINING} left in the pool"
  warn "  fix: consolidate stacks onto the shared 'glasswing' network"
else
  fail "${NET_COUNT} networks exist; the pool is exhausted"
  fail "  fix: sudo ./scripts/docker-daemon-config.sh --apply, then prune orphans"
fi

# --- 3. Shared network -------------------------------------------------------
if docker network inspect glasswing >/dev/null 2>&1; then
  SUBNET="$(docker network inspect glasswing --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}')"
  pass "Shared network 'glasswing' exists (${SUBNET:-no fixed subnet})"
  if [ -z "$SUBNET" ]; then
    warn "  'glasswing' has no pinned subnet; it consumes a pool slot"
    warn "  fix: docker network rm glasswing && make network"
  fi
else
  warn "Shared network 'glasswing' does not exist yet"
  warn "  fix: make network"
fi

# --- 4. Orphan networks ------------------------------------------------------
STACKS="$(printf '%s\n' $(for d in stacks/*/; do [ -f "$d/compose.yaml" ] && basename "$d"; done))"
ORPHANS=""
while IFS= read -r net; do
  case "$net" in
    bridge|host|none|glasswing) continue ;;
    glasswing-*)
      stack="${net#glasswing-}"
      stack="${stack%_default}"
      stack="${stack%_internal}"
      if ! printf '%s\n' "$STACKS" | grep -qx "$stack"; then
        ORPHANS="${ORPHANS} ${net}"
      fi
      ;;
    *) continue ;;
  esac
done < <(docker network ls --format '{{.Name}}')

DANGLING="$(docker network ls --filter dangling=true --format '{{.Name}}' 2>/dev/null | grep -vxE 'bridge|host|none|glasswing' | tr '\n' ' ' || true)"
if [ -n "${DANGLING// /}" ]; then
  warn "Unused networks (no container attached): ${DANGLING% }"
  warn "  fix: docker network prune -f  (or docker network rm <name>)"
fi

if [ -n "$ORPHANS" ]; then
  warn "Orphan networks (stack no longer in the repo):${ORPHANS}"
  warn "  fix: docker network rm${ORPHANS}"
else
  pass "No orphan stack networks"
fi

# --- 5. Published host ports -------------------------------------------------
PORT_REPORT="$(python3 - <<'PY'
import collections, pathlib, re

pub = collections.defaultdict(list)
unbound = []
for f in sorted(pathlib.Path("stacks").glob("*/compose.yaml")):
    stack = f.parent.name
    for line in f.read_text().splitlines():
        m = re.search(r'-\s*"(\d+\.\d+\.\d+\.\d+):(\d+):(\d+)"', line)
        if m:
            pub[m.group(2)].append(stack)
            continue
        m = re.search(r'-\s*"(\d+):(\d+)"\s*(?:/tcp)?\s*$', line.strip())
        if m:
            unbound.append(f"{stack}:{m.group(1)}")

dupes = {p: s for p, s in pub.items() if len(s) > 1}
for port, stacks in sorted(dupes.items(), key=lambda kv: int(kv[0])):
    print(f"DUP {port} {' '.join(stacks)}")
for item in unbound:
    print(f"UNBOUND {item}")
print(f"COUNT {len(pub)}")
PY
)"

DUPES="$(printf '%s\n' "$PORT_REPORT" | grep '^DUP ' || true)"
UNBOUND="$(printf '%s\n' "$PORT_REPORT" | grep '^UNBOUND ' || true)"
PORT_COUNT="$(printf '%s\n' "$PORT_REPORT" | awk '/^COUNT /{print $2}')"

if [ -n "$DUPES" ]; then
  while IFS= read -r line; do fail "Host port collision: ${line#DUP }"; done <<< "$DUPES"
else
  pass "${PORT_COUNT} published host ports, no duplicates across stacks"
fi

if [ -n "$UNBOUND" ]; then
  while IFS= read -r line; do
    warn "Port bound to all interfaces: ${line#UNBOUND } (bind it to \${GLASSWING_HOST_IP})"
  done <<< "$UNBOUND"
fi

# --- 6. Restart loops --------------------------------------------------------
LOOPING="$(docker ps --filter status=restarting --format '{{.Names}}')"
if [ -n "$LOOPING" ]; then
  while IFS= read -r name; do fail "Container in a restart loop: $name"; done <<< "$LOOPING"
else
  pass "No containers in a restart loop"
fi

# --- 7. Infisical health (make depends on it) --------------------------------
INFISICAL_HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' glasswing-infisical-infisical-1 2>/dev/null || true)"
case "$INFISICAL_HEALTH" in
  healthy) pass "Infisical reports healthy" ;;
  "") warn "Infisical container not found; run: make infisical" ;;
  *) fail "Infisical health is '${INFISICAL_HEALTH}'; secret injection will fail" ;;
esac

# --- Summary -----------------------------------------------------------------
echo "----------------"
if [ "$FAILS" -gt 0 ]; then
  echo "${FAILS} failure(s), ${WARNS} warning(s)"
  exit 1
fi
echo "No failures, ${WARNS} warning(s)"
