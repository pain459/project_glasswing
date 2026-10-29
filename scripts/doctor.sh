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
# /etc/docker/daemon.json is root-only on Debian/Ubuntu, so fall back to asking
# the daemon what a brand new network actually gets.
DAEMON_JSON="${DAEMON_JSON:-/etc/docker/daemon.json}"

POOL_JSON="$(python3 - "$DAEMON_JSON" <<'PY'
import json, sys
try:
    with open(sys.argv[1]) as fh:
        data = json.load(fh)
except PermissionError:
    print("UNREADABLE")
    raise SystemExit(0)
except FileNotFoundError:
    data = {}
except json.JSONDecodeError:
    print("INVALID")
    raise SystemExit(0)
print(json.dumps(data.get("default-address-pools", [])))
PY
)"

CAPACITY=""
case "$POOL_JSON" in
  "[]")
    warn "No default-address-pools in ${DAEMON_JSON}; Docker allows ~16 networks"
    warn "  fix: sudo ./scripts/docker-daemon-config.sh --apply"
    CAPACITY=16
    ;;
  UNREADABLE|INVALID)
    PROBE="glasswing-doctor-probe-$$"
    if PROBE_ERR="$(docker network create "$PROBE" 2>&1)"; then
      PROBE_SUBNET="$(docker network inspect "$PROBE" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null)"
      docker network rm "$PROBE" >/dev/null 2>&1 || true
      if python3 -c 'import ipaddress,sys; sys.exit(0 if ipaddress.ip_network(sys.argv[2]).subnet_of(ipaddress.ip_network(sys.argv[1])) else 1)' \
           172.16.0.0/12 "$PROBE_SUBNET" 2>/dev/null; then
        pass "Widened address pool in effect (a new network gets ${PROBE_SUBNET})"
        CAPACITY=4096
      else
        warn "New networks get ${PROBE_SUBNET:-an unknown subnet}; the 172.16.0.0/12 pool is not in effect"
        warn "  fix: sudo ./scripts/docker-daemon-config.sh --apply"
        CAPACITY=16
      fi
    else
      case "$PROBE_ERR" in
        *"fully subnetted"*)
          fail "Docker cannot allocate a network: all predefined address pools are fully subnetted"
          fail "  fix: sudo ./scripts/docker-daemon-config.sh --apply, then prune unused networks"
          ;;
        *)
          warn "Could not probe the address pool: ${PROBE_ERR%%$'\n'*}"
          warn "  ${DAEMON_JSON} is not readable as $(id -un); run: sudo make doctor"
          ;;
      esac
    fi
    ;;
  *)
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
    ;;
esac

NET_COUNT="$(docker network ls --format '{{.Name}}' | wc -l | tr -d ' ')"
if [ -n "$CAPACITY" ]; then
  REMAINING=$((CAPACITY - NET_COUNT))
  if [ "$REMAINING" -ge 10 ]; then
    pass "${NET_COUNT} networks exist; ${REMAINING} left in the pool"
  elif [ "$REMAINING" -ge 1 ]; then
    warn "${NET_COUNT} networks exist; only ${REMAINING} left in the pool"
    warn "  fix: consolidate stacks onto the shared 'glasswing' network"
  else
    fail "${NET_COUNT} networks exist; the pool is exhausted"
    fail "  fix: sudo ./scripts/docker-daemon-config.sh --apply, then prune unused networks"
  fi
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

# --- 5. Host IP ---------------------------------------------------------------
HOST_IP="$(printf '%s' "${GLASSWING_HOST_IP:-}")"
if [ -z "$HOST_IP" ] && [ -f stacks/infisical/.env ]; then
  HOST_IP="$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' stacks/infisical/.env | head -n1 | tr -d '"'"'")"
fi
if [ -z "$HOST_IP" ]; then
  warn "GLASSWING_HOST_IP is not configured; Compose port bindings will refuse to start"
  warn "  fix: add GLASSWING_HOST_IP=<lan ip> to stacks/infisical/.env (or export it)"
else
  pass "Port bindings use GLASSWING_HOST_IP=${HOST_IP}"
fi

# --- 6. Published host ports -------------------------------------------------
PORT_REPORT="$(python3 - <<'PY'
import collections, pathlib, re

# A binding is either "${GLASSWING_HOST_IP:?...}:3006:3000" or "1.2.3.4:3006:3000".
HOST = r"(?:\$\{[^}]+\}|\d+\.\d+\.\d+\.\d+)"
pub = collections.defaultdict(set)
literal = collections.defaultdict(set)
unbound = []

for f in sorted(pathlib.Path("stacks").glob("*/compose.yaml")):
    stack = f.parent.name
    for line in f.read_text().splitlines():
        m = re.search(r'-\s*"' + HOST + r':(\d+):(\d+)', line)
        if m:
            pub[m.group(1)].add(stack)
            if re.search(r'-\s*"\d+\.\d+\.\d+\.\d+:', line):
                literal[stack].add(m.group(1))
            continue
        m = re.search(r'-\s*"(\d+):(\d+)"\s*(?:/tcp)?\s*$', line.strip())
        if m:
            unbound.append(f"{stack}:{m.group(1)}")

for port, stacks in sorted((p, s) for p, s in pub.items() if len(s) > 1):
    print(f"DUP {port} {' '.join(sorted(stacks))}")
for stack, ports in sorted(literal.items()):
    print(f"LITERAL {stack} {','.join(sorted(ports, key=int))}")
for item in unbound:
    print(f"UNBOUND {item}")
print(f"COUNT {len(pub)}")
PY
)"

DUPES="$(printf '%s\n' "$PORT_REPORT" | grep '^DUP ' || true)"
LITERAL="$(printf '%s\n' "$PORT_REPORT" | grep '^LITERAL ' || true)"
UNBOUND="$(printf '%s\n' "$PORT_REPORT" | grep '^UNBOUND ' || true)"
PORT_COUNT="$(printf '%s\n' "$PORT_REPORT" | awk '/^COUNT /{print $2}')"

if [ -n "$LITERAL" ]; then
  while IFS= read -r line; do
    fail "Hardcoded host IP in ${line#LITERAL } (use \${GLASSWING_HOST_IP})"
  done <<< "$LITERAL"
fi

if [ -n "$DUPES" ]; then
  while IFS= read -r line; do fail "Host port collision: ${line#DUP }"; done <<< "$DUPES"
fi

if [ -z "$LITERAL" ] && [ -z "$DUPES" ]; then
  pass "${PORT_COUNT} published host ports, no duplicates, no hardcoded IPs"
fi

if [ -n "$UNBOUND" ]; then
  while IFS= read -r line; do
    warn "Port bound to all interfaces: ${line#UNBOUND } (bind it to \${GLASSWING_HOST_IP})"
  done <<< "$UNBOUND"
fi

# --- 7. Restart loops --------------------------------------------------------
LOOPING="$(docker ps --filter status=restarting --format '{{.Names}}')"
if [ -n "$LOOPING" ]; then
  while IFS= read -r name; do fail "Container in a restart loop: $name"; done <<< "$LOOPING"
else
  pass "No containers in a restart loop"
fi

# --- 8. Infisical health (make depends on it) --------------------------------
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
