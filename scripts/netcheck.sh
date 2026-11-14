#!/usr/bin/env bash
# netcheck.sh — refuse to start stacks unless the host owns the reserved address.
#
# Every published port binds ${GLASSWING_HOST_IP} (see stacks/*/compose.yaml), and
# Docker stores that address in each container's HostConfig.PortBindings. If the
# host does not actually own the address, endpoint creation fails with
# EADDRNOTAVAIL and the container is left with a sandbox but no network: "Up" in
# `docker ps`, while DNS and every connection inside it fail. That is how 11
# stacks broke on 2026-11-13 (the host came up on 192.168.29.97/24 while every
# binding pointed at 192.168.68.62).
#
# This gate turns that silent breakage into a hard stop before the first stack is
# touched. It only reads state: no sudo, no network calls, no writes.
#
# The platform therefore requires a mandatory address reservation at the network
# level (router DHCP reservation, or a static address on the interface), so the
# host always receives the address recorded in stacks/infisical/.env. That file
# is the single source of truth; this script verifies it against reality.
#
# Usage:
#   ./scripts/netcheck.sh                 # use GLASSWING_HOST_IP, else stacks/infisical/.env
#   ./scripts/netcheck.sh 192.168.68.62   # check an explicit address
#
# Exit codes: 0 the host owns the address, 1 mismatch or nothing configured.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="stacks/infisical/.env"

ENV_VALUE=""
if [ -f "$ENV_FILE" ]; then
  ENV_VALUE="$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' "$ENV_FILE" | head -n1 | tr -d '"'"'")"
fi

# Resolution order matches the Makefile: argument, then the exported variable,
# then the git-ignored bootstrap file that also seeds Infisical. `make` exports
# the file's value, so cite the file whenever the two agree.
if [ -n "${1:-}" ]; then
  EXPECTED="$1"
  SOURCE="the argument"
elif [ -n "${GLASSWING_HOST_IP:-}" ]; then
  EXPECTED="$GLASSWING_HOST_IP"
  if [ "$EXPECTED" = "$ENV_VALUE" ]; then
    SOURCE="$ENV_FILE"
  else
    SOURCE="\${GLASSWING_HOST_IP}"
  fi
else
  EXPECTED="$ENV_VALUE"
  SOURCE="$ENV_FILE"
fi

if [ -z "$EXPECTED" ]; then
  echo "[FAIL] No host IP configured, so the port bindings cannot be verified." >&2
  echo "        fix: add GLASSWING_HOST_IP=<reserved lan ip> to ${ENV_FILE}" >&2
  echo "        no stacks were started." >&2
  exit 1
fi

# Global IPv4 addresses actually assigned to a real host interface. `-o` renders
# one line per address ("2: enp6s0    inet 192.168.68.62/22 brd ..."), so field 2
# is the interface and field 4 is "address/prefix". Docker-created bridges are
# excluded: they are never a valid LAN address and only add noise to the report.
ACTUAL="$(
  ip -4 -o addr show scope global 2>/dev/null |
    awk '$3 == "inet" && $2 !~ /^(docker|br-|veth|virbr)/ { print $4 }' |
    cut -d/ -f1
)"

if printf '%s\n' "$ACTUAL" | grep -qxF -- "$EXPECTED"; then
  echo "[PASS] Host IP ${EXPECTED} matches ${SOURCE}"
  exit 0
fi

printf '[FAIL] IP mismatch: the host does not own the reserved address.\n' >&2
printf '        expected: %s   (%s)\n' "$EXPECTED" "$SOURCE" >&2
if [ -n "$ACTUAL" ]; then
  while IFS= read -r addr; do
    printf '        actual:   %s\n' "$addr" >&2
  done <<< "$ACTUAL"
else
  printf '        actual:   none (no global IPv4 address on this host)\n' >&2
fi
printf '        fix:      reserve %s at the network level (router DHCP reservation or a\n' "$EXPECTED" >&2
printf '                  static address), or update %s to the address the host owns.\n' "$ENV_FILE" >&2
printf '        no stacks were started.\n' >&2
exit 1
