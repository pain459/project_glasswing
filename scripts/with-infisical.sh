
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDS="$ROOT/.local/infisical/credentials.env"
CERT="$ROOT/stacks/infisical/tls/cert.pem"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

# Usage:
# with-infisical.sh <secret-path> <keys-file> -- <command>

[[ $# -ge 4 ]] ||
  fail "Usage: $0 <path> <keys-file> -- <command>"

SECRET_PATH="$1"
KEYS_FILE="$2"
shift 2

[[ "$1" == "--" ]] || fail "Missing -- separator"
shift

[[ -f "$CREDS" ]] || fail "Infisical credentials missing"
[[ -f "$CERT" ]] || fail "Infisical certificate missing"
[[ -f "$KEYS_FILE" ]] || fail "Secret manifest missing"
[[ "$SECRET_PATH" == /* ]] || fail "Secret path must begin with /"

# Load local machine identity.
# Do not export bootstrap credentials to child processes.
source "$CREDS"

for name in INFISICAL_URL INFISICAL_PROJECT_ID \
            INFISICAL_ENV INFISICAL_CLIENT_ID \
            INFISICAL_CLIENT_SECRET; do
  [[ -n "${!name:-}" ]] || fail "Missing $name"
done

echo "[INFO] Authenticating with Infisical"

TOKEN="$(
  curl --fail --silent --show-error \
    --cacert "$CERT" \
    -X POST \
    "$INFISICAL_URL/api/v1/auth/universal-auth/login" \
    -H "Content-Type: application/json" \
    --data "$(jq -n \
      --arg id "$INFISICAL_CLIENT_ID" \
      --arg secret "$INFISICAL_CLIENT_SECRET" \
      '{clientId:$id,clientSecret:$secret}')" |
  jq -er '.accessToken'
)" || fail "Authentication failed"

# Prevent accidental inheritance of bootstrap credentials.
unset INFISICAL_CLIENT_ID INFISICAL_CLIENT_SECRET

COUNT=0

while IFS= read -r KEY || [[ -n "$KEY" ]]; do
  [[ -z "$KEY" || "$KEY" == \#* ]] && continue

  [[ "$KEY" =~ ^[A-Z][A-Z0-9_]*$ ]] ||
    fail "Invalid secret name: $KEY"

  # Avoid accidental overwrites of deployment metadata.
  [[ "$KEY" != INFISICAL_* && "$KEY" != COMPOSE_* ]] ||
    fail "Reserved variable name: $KEY"

  VALUE="$(
    curl --fail --silent --show-error \
      --cacert "$CERT" \
      -G "$INFISICAL_URL/api/v4/secrets/$KEY" \
      -H "Authorization: Bearer $TOKEN" \
      --data-urlencode "projectId=$INFISICAL_PROJECT_ID" \
      --data-urlencode "environment=$INFISICAL_ENV" \
      --data-urlencode "secretPath=$SECRET_PATH" |
    jq -er '.secret.secretValue'
  )" || fail "Unable to retrieve $KEY"

  [[ -n "$VALUE" ]] || fail "Empty secret: $KEY"

  export "$KEY=$VALUE"
  unset VALUE

  COUNT=$((COUNT + 1))
done < "$KEYS_FILE"

unset TOKEN

echo "[PASS] Retrieved $COUNT secrets from $SECRET_PATH"
echo "[INFO] Starting requested command"

exec "$@"
