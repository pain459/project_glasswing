#!/usr/bin/env bash
# 04-certificates.sh — create the host-local TLS material the platform needs.
#
# Two artefacts are gitignored and therefore missing on a fresh clone:
#
#   .local/ca/glasswing-ca.{key,crt}              private CA (10 years)
#   stacks/infisical/tls/{cert.pem,key.pem}       Infisical gateway (self-signed)
#   stacks/portainer/certs/{portainer.crt,key}    Portainer (signed by the CA)
#
# Infisical's certificate is self-signed on purpose: scripts/with-infisical.sh,
# scripts/infisical-register.sh and every curl example verify it with
# `--cacert stacks/infisical/tls/cert.pem`. If it were signed by the Glasswing CA
# instead, that file would no longer be the issuer and verification would fail.
#
# Usage:
#   ./scripts/04-certificates.sh            # create what is missing, leave the rest
#   ./scripts/04-certificates.sh --force    # reissue everything
#   ./scripts/04-certificates.sh --check    # verify presence, SAN and expiry (CI/preflight)
#
# The host address is resolved the same way as the Makefile: GLASSWING_HOST_IP
# from the environment, then stacks/infisical/.env (the legacy HOST_IP key is
# accepted).
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="create"
for arg in "$@"; do
  case "$arg" in
    --force) MODE="force" ;;
    --check) MODE="check" ;;
    -h | --help)
      sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "usage: $0 [--force|--check]" >&2
      exit 2
      ;;
  esac
done

CA_DIR=".local/ca"
CA_KEY="$CA_DIR/glasswing-ca.key"
CA_CRT="$CA_DIR/glasswing-ca.crt"
INFISICAL_DIR="stacks/infisical/tls"
INFISICAL_CRT="$INFISICAL_DIR/cert.pem"
INFISICAL_KEY="$INFISICAL_DIR/key.pem"
PORTAINER_DIR="stacks/portainer/certs"
PORTAINER_CRT="$PORTAINER_DIR/portainer.crt"
PORTAINER_KEY="$PORTAINER_DIR/portainer.key"

DAYS_LEAF=825
WARN_DAYS=21

pass() { printf '[PASS] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; }
fail() {
  printf '[FAIL] %s\n' "$*" >&2
  exit 1
}

HOST_IP="${GLASSWING_HOST_IP:-}"
if [[ -z "$HOST_IP" && -f stacks/infisical/.env ]]; then
  HOST_IP="$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' stacks/infisical/.env \
    | head -n1 | tr -d "\"'")"
fi
[[ -n "$HOST_IP" ]] ||
  fail "GLASSWING_HOST_IP is not set (environment or stacks/infisical/.env)"
[[ "$HOST_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  fail "GLASSWING_HOST_IP does not look like an IPv4 address: $HOST_IP"

command -v openssl >/dev/null || fail "openssl is required"

HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo pathfinder)"
SAN_CACHE=""

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Leaf config for one certificate: CN plus the IP and DNS names clients use.
leaf_config() {
  local path="$1" cn="$2"
  {
    printf '[req]\ndistinguished_name = dn\nprompt = no\n'
    printf '[dn]\nCN = %s\n' "$cn"
    printf '[server]\nbasicConstraints = critical,CA:FALSE\n'
    printf 'keyUsage = critical,digitalSignature,keyEncipherment\n'
    printf 'extendedKeyUsage = serverAuth\n'
    printf 'subjectAltName = @alt\n[alt]\nIP.1 = %s\nDNS.1 = pathfinder\n' "$HOST_IP"
    if [[ "$HOSTNAME_SHORT" != "pathfinder" ]]; then
      printf 'DNS.2 = %s\n' "$HOSTNAME_SHORT"
    fi
  } >"$path"
}

# cert_subject <file> — CN of a certificate
cert_subject() { openssl x509 -in "$1" -noout -subject | sed 's/^subject= *//'; }

# san_has_ip <file> — does the certificate cover HOST_IP?
san_has_ip() {
  openssl x509 -in "$1" -noout -text 2>/dev/null |
    sed -n '/Subject Alternative Name/,+1p' | grep -q "IP Address:${HOST_IP}\([,[[:space:]]\|$\)"
}

expires_soon() { ! openssl x509 -in "$1" -noout -checkend $((WARN_DAYS * 86400)) >/dev/null; }
expired() { ! openssl x509 -in "$1" -noout -checkend 0 >/dev/null; }

# The CA-signed leaf is only useful while clients trust the CA that signed it.
signed_by_ca() { openssl verify -CAfile "$CA_CRT" "$1" >/dev/null 2>&1; }

# Infisical must stay self-signed: clients verify it with --cacert <its own crt>.
is_self_signed() {
  [[ "$(cert_subject "$1")" == "$(openssl x509 -in "$1" -noout -issuer | sed 's/^issuer= *//')" ]]
}

# check_one <label> <crt> <key> <ca|infisical|portainer>
check_one() {
  local label="$1" crt="$2" key="$3" kind="$4" ok=0
  if [[ ! -s "$crt" || ! -s "$key" ]]; then
    warn "$label: certificate or key missing ($crt)"
    return 1
  fi
  case "$kind" in
    ca)
      pass "$label: valid until $(openssl x509 -in "$crt" -noout -enddate | cut -d= -f2)"
      ;;
    infisical)
      if ! san_has_ip "$crt"; then
        warn "$label: certificate does not cover IP $HOST_IP"
        ok=1
      fi
      if ! is_self_signed "$crt"; then
        warn "$label: certificate is not self-signed; clients use it as their own CA"
        ok=1
      fi
      ;;
    portainer)
      if ! san_has_ip "$crt"; then
        warn "$label: certificate does not cover IP $HOST_IP"
        ok=1
      fi
      if ! signed_by_ca "$crt"; then
        warn "$label: certificate was not signed by $CA_CRT"
        ok=1
      fi
      ;;
  esac
  if expires_soon "$crt"; then
    warn "$label: expires within $WARN_DAYS days ($(openssl x509 -in "$crt" -noout -enddate | cut -d= -f2))"
    ok=1
  fi
  if [[ "$ok" -eq 0 && "$kind" != "ca" ]]; then
    pass "$label: covers $HOST_IP, valid until $(openssl x509 -in "$crt" -noout -enddate | cut -d= -f2)"
  fi
  return "$ok"
}

if [[ "$MODE" == "check" ]]; then
  rc=0
  check_one CA "$CA_CRT" "$CA_KEY" ca || rc=1
  check_one Infisical "$INFISICAL_CRT" "$INFISICAL_KEY" infisical || rc=1
  check_one Portainer "$PORTAINER_CRT" "$PORTAINER_KEY" portainer || rc=1
  if [[ "$rc" -ne 0 ]]; then
    echo "[FAIL] TLS material is missing, stale or expiring; run ./scripts/04-certificates.sh --force"
    exit 1
  fi
  exit 0
fi

# --- CA -----------------------------------------------------------------------
CA_CREATED=false
if [[ "$MODE" == "force" || ! -s "$CA_KEY" || ! -s "$CA_CRT" ]]; then
  install -d -m 700 "$CA_DIR"
  cat >"$TMP_DIR/ca.cnf" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no
[dn]
CN = Glasswing Home CA
[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
EOF
  openssl req -x509 -newkey rsa:4096 -sha256 -nodes -days 3650 \
    -keyout "$TMP_DIR/ca.key" -out "$TMP_DIR/ca.crt" -config "$TMP_DIR/ca.cnf" 2>/dev/null ||
    fail "Could not create the Glasswing CA"
  install -m 600 "$TMP_DIR/ca.key" "$CA_KEY"
  install -m 644 "$TMP_DIR/ca.crt" "$CA_CRT"
  CA_CREATED=true
  pass "Created CA: $CA_CRT (valid until $(openssl x509 -in "$CA_CRT" -noout -enddate | cut -d= -f2))"
else
  pass "CA present: $CA_CRT (until $(openssl x509 -in "$CA_CRT" -noout -enddate | cut -d= -f2))"
fi

# --- Infisical (self-signed) --------------------------------------------------
# Reissue when missing, expired, not self-signed, or issued for another address.
# Without --force an expiring-but-valid certificate is left alone (check warns).
INFISICAL_EXISTED=false
[[ -s "$INFISICAL_CRT" ]] && INFISICAL_EXISTED=true
if [[ "$MODE" == "force" || ! -s "$INFISICAL_CRT" || ! -s "$INFISICAL_KEY" ]] ||
  expired "$INFISICAL_CRT" 2>/dev/null ||
  ! san_has_ip "$INFISICAL_CRT" 2>/dev/null ||
  ! is_self_signed "$INFISICAL_CRT" 2>/dev/null; then
  install -d -m 755 "$INFISICAL_DIR"
  leaf_config "$TMP_DIR/infisical.cnf" "Pathfinder Infisical"
  openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days "$DAYS_LEAF" \
    -keyout "$TMP_DIR/infisical.key" -out "$TMP_DIR/infisical.crt" \
    -config "$TMP_DIR/infisical.cnf" -extensions server 2>/dev/null ||
    fail "Could not create the Infisical certificate"
  install -m 644 "$TMP_DIR/infisical.crt" "$INFISICAL_CRT"
  install -m 600 "$TMP_DIR/infisical.key" "$INFISICAL_KEY"
  if [[ "$INFISICAL_EXISTED" == true ]]; then
    pass "Reissued Infisical certificate (self-signed, $HOST_IP)"
  else
    pass "Created Infisical certificate: $INFISICAL_CRT (self-signed, $HOST_IP)"
  fi
else
  pass "Infisical certificate present: $INFISICAL_CRT (until $(openssl x509 -in "$INFISICAL_CRT" -noout -enddate | cut -d= -f2))"
fi

# --- Portainer (signed by the CA) --------------------------------------------
# Reissue when missing, expired, for another address, or signed by a CA we no
# longer hold the key for (the leaf would otherwise not chain to $CA_CRT).
PORTAINER_EXISTED=false
[[ -s "$PORTAINER_CRT" ]] && PORTAINER_EXISTED=true
if [[ "$MODE" == "force" || ! -s "$PORTAINER_CRT" || ! -s "$PORTAINER_KEY" ]] ||
  expired "$PORTAINER_CRT" 2>/dev/null ||
  ! san_has_ip "$PORTAINER_CRT" 2>/dev/null ||
  ! signed_by_ca "$PORTAINER_CRT" 2>/dev/null; then
  install -d -m 755 "$PORTAINER_DIR"
  leaf_config "$TMP_DIR/portainer.cnf" "pathfinder"
  openssl req -new -newkey rsa:3072 -sha256 -nodes \
    -keyout "$TMP_DIR/portainer.key" -out "$TMP_DIR/portainer.csr" \
    -config "$TMP_DIR/portainer.cnf" 2>/dev/null ||
    fail "Could not create the Portainer key pair"
  openssl x509 -req -in "$TMP_DIR/portainer.csr" -sha256 -days "$DAYS_LEAF" \
    -CA "$CA_CRT" -CAkey "$CA_KEY" -set_serial "0x$(openssl rand -hex 16)" \
    -extfile "$TMP_DIR/portainer.cnf" -extensions server \
    -out "$TMP_DIR/portainer.crt" 2>/dev/null ||
    fail "Could not sign the Portainer certificate"
  install -m 644 "$TMP_DIR/portainer.crt" "$PORTAINER_CRT"
  install -m 600 "$TMP_DIR/portainer.key" "$PORTAINER_KEY"
  if [[ "$PORTAINER_EXISTED" == true ]]; then
    pass "Reissued Portainer certificate (signed by Glasswing CA, $HOST_IP)"
  else
    pass "Created Portainer certificate: $PORTAINER_CRT (signed by Glasswing CA, $HOST_IP)"
  fi
else
  pass "Portainer certificate present: $PORTAINER_CRT (until $(openssl x509 -in "$PORTAINER_CRT" -noout -enddate | cut -d= -f2))"
fi

if [[ "$CA_CREATED" == true ]]; then
  echo ""
  warn "A new CA was created: any leaf signed by an older CA has been reissued."
  warn "Clients must trust the new $CA_CRT (or restore the old .local/ca first)."
fi

echo ""
echo "[INFO] Restart the stacks that mount these files:"
echo "         make restart STACK=infisical"
echo "         make restart STACK=portainer"
echo "[INFO] Use restart, not up: the certificate is a mounted file, so the"
echo "       container's Compose config does not change and \`up\` leaves it running."
echo "[INFO] Trust the CA on client machines with $CA_CRT (never copy $CA_KEY)."
echo "[INFO] Infisical's certificate is self-signed; clients verify it with --cacert $INFISICAL_CRT."
