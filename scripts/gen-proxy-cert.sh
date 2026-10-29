#!/usr/bin/env bash
# gen-proxy-cert.sh — issue the wildcard certificate used by the Glasswing proxy.
#
# The certificate is signed by the local Glasswing CA in .local/ca. That CA is
# already used for Portainer and Infisical TLS, and is the CA clients should
# trust on the LAN.
#
# Usage:
#   ./scripts/gen-proxy-cert.sh [--force]
#
# Outputs (git-ignored):
#   stacks/proxy/certs/fullchain.pem
#   stacks/proxy/certs/privkey.pem
#
# Override the domain with GLASSWING_DOMAIN (default: glasswing.lan).

set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CA_DIR="$ROOT/.local/ca"
CA_CRT="$CA_DIR/glasswing-ca.crt"
CA_KEY="$CA_DIR/glasswing-ca.key"
OUT_DIR="$ROOT/stacks/proxy/certs"
DOMAIN="${GLASSWING_DOMAIN:-glasswing.lan}"
DAYS="${GLASSWING_CERT_DAYS:-825}"
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -h|--help)
      sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "[FAIL] Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

fail() { echo "[FAIL] $*" >&2; exit 1; }
info() { echo "[INFO] $*"; }

command -v openssl >/dev/null 2>&1 || fail "openssl is required"
[[ -s "$CA_CRT" ]] || fail "Glasswing CA certificate missing: $CA_CRT"
[[ -s "$CA_KEY" ]] || fail "Glasswing CA key missing: $CA_KEY"

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

CERT="$OUT_DIR/fullchain.pem"
KEY="$OUT_DIR/privkey.pem"

cert_is_usable() {
  [[ -s "$CERT" && -s "$KEY" ]] || return 1
  openssl x509 -checkend $((30 * 86400)) -noout -in "$CERT" >/dev/null 2>&1 || return 1
  openssl x509 -noout -ext subjectAltName -in "$CERT" 2>/dev/null |
    grep -q "DNS:\*\.${DOMAIN}" || return 1
  # Ensure the certificate and key still belong together.
  local cert_mod key_mod
  cert_mod="$(openssl x509 -noout -modulus -in "$CERT" 2>/dev/null)" || return 1
  key_mod="$(openssl rsa -noout -modulus -in "$KEY" 2>/dev/null)" || return 1
  [[ "$cert_mod" == "$key_mod" ]]
}

if [[ "$FORCE" -eq 0 ]] && cert_is_usable; then
  info "Proxy certificate is valid for another 30+ days; leaving it in place"
  info "  $CERT"
  exit 0
fi

info "Issuing wildcard certificate for *.${DOMAIN}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

EXT_FILE="$TMP_DIR/ext.cnf"
cat > "$EXT_FILE" <<EOF
basicConstraints       = CA:FALSE
keyUsage               = critical, digitalSignature, keyEncipherment
extendedKeyUsage       = serverAuth
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid,issuer
subjectAltName         = DNS:${DOMAIN}, DNS:*.${DOMAIN}
EOF

openssl genrsa -out "$TMP_DIR/privkey.pem" 2048 >/dev/null 2>&1
openssl req -new \
  -key "$TMP_DIR/privkey.pem" \
  -out "$TMP_DIR/proxy.csr" \
  -subj "/CN=${DOMAIN}" >/dev/null 2>&1

openssl x509 -req \
  -in "$TMP_DIR/proxy.csr" \
  -CA "$CA_CRT" \
  -CAkey "$CA_KEY" \
  -CAserial "$CA_DIR/glasswing-ca.srl" \
  -CAcreateserial \
  -out "$TMP_DIR/fullchain.pem" \
  -days "$DAYS" \
  -sha256 \
  -extfile "$EXT_FILE" >/dev/null 2>&1

install -m 600 "$TMP_DIR/privkey.pem" "$KEY"
install -m 644 "$TMP_DIR/fullchain.pem" "$CERT"

openssl x509 -in "$CERT" -noout -subject -issuer -dates -ext subjectAltName

info "Wrote $CERT"
info "Wrote $KEY"
