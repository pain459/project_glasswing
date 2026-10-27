
#!/usr/bin/env bash
# infisical-register.sh — Register (upsert) secrets into Infisical via API.
#
# Usage:
#   infisical-register.sh <secret-path> <registry-file>
#
# <registry-file> is a plain text file with lines:
#   SECRET_KEY=value
# Lines starting with # are comments. Blank lines are skipped.
#
# Strategy: POST first (create), if 400 (already exists) then PATCH (update).

set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDS="$ROOT/.local/infisical/credentials.env"
CERT="$ROOT/stacks/infisical/tls/cert.pem"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

[[ $# -ge 2 ]] || fail "Usage: $0 <secret-path> <registry-file>"

SECRET_PATH="$1"
REGISTRY_FILE="$2"

[[ -f "$CREDS" ]] || fail "Infisical credentials missing"
[[ -f "$CERT" ]] || fail "Infisical certificate missing"
[[ -f "$REGISTRY_FILE" ]] || fail "Registry file missing: $REGISTRY_FILE"
[[ "$SECRET_PATH" == /* ]] || fail "Secret path must begin with /"

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

# Ensure the secret path (folder) exists.
if [[ "$SECRET_PATH" != "/" ]]; then
  FOLDER_NAME="$(basename "$SECRET_PATH")"
  FOLDER_PARENT="$(dirname "$SECRET_PATH")"
  curl --silent \
    --cacert "$CERT" \
    -X POST \
    "$INFISICAL_URL/api/v2/folders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data "$(jq -n \
      --arg pid "$INFISICAL_PROJECT_ID" \
      --arg env "$INFISICAL_ENV" \
      --arg name "$FOLDER_NAME" \
      --arg path "$FOLDER_PARENT" \
      '{projectId: $pid, environment: $env, name: $name, path: $path}')" \
    > /dev/null 2>&1 || true
  echo "[INFO] Ensured path $SECRET_PATH exists"
fi

# upsert_secret KEY VALUE — POST to create, PATCH if already exists.
upsert_secret() {
  local KEY="$1" VALUE="$2"

  # Try POST (create).
  local HTTP_CODE
  HTTP_CODE="$(
    curl --silent \
      --cacert "$CERT" \
      -X POST \
      "$INFISICAL_URL/api/v4/secrets/$KEY" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --data "$(jq -n \
        --arg pid "$INFISICAL_PROJECT_ID" \
        --arg env "$INFISICAL_ENV" \
        --arg sp "$SECRET_PATH" \
        --arg sv "$VALUE" \
        '{projectId: $pid, environment: $env, secretPath: $sp, secretValue: $sv, type: "shared"}')" \
      -w '%{http_code}' -o /dev/null
  )" || return 1

  if [[ "$HTTP_CODE" == "200" ]]; then
    return 0
  elif [[ "$HTTP_CODE" == "400" ]]; then
    # Already exists — PATCH to update.
    HTTP_CODE="$(
      curl --silent \
        --cacert "$CERT" \
        -X PATCH \
        "$INFISICAL_URL/api/v4/secrets/$KEY" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        --data "$(jq -n \
          --arg pid "$INFISICAL_PROJECT_ID" \
          --arg env "$INFISICAL_ENV" \
          --arg sp "$SECRET_PATH" \
          --arg sv "$VALUE" \
          '{projectId: $pid, environment: $env, secretPath: $sp, secretValue: $sv}')" \
        -w '%{http_code}' -o /dev/null
    )" || return 1
    if [[ "$HTTP_CODE" == "200" ]]; then
      return 0
    fi
  fi
  return 1
}

# Parse registry file.
declare -a KEYS=()
declare -a VALUES=()
COUNT=0

while IFS= read -r LINE || [[ -n "$LINE" ]]; do
  [[ -z "$LINE" || "$LINE" == \#* ]] && continue
  KEY="${LINE%%=*}"
  VALUE="${LINE#*=}"
  [[ "$KEY" =~ ^[A-Z][A-Z0-9_]*$ ]] || fail "Invalid secret name: $KEY"
  KEYS+=("$KEY")
  VALUES+=("$VALUE")
  COUNT=$((COUNT + 1))
done < "$REGISTRY_FILE"

[[ "$COUNT" -gt 0 ]] || fail "No secrets found in registry file"

echo "[INFO] Upserting $COUNT secrets into $SECRET_PATH"

OK=0
FAIL=0

for i in $(seq 0 $((COUNT - 1))); do
  KEY="${KEYS[$i]}"
  VALUE="${VALUES[$i]}"

  if upsert_secret "$KEY" "$VALUE"; then
    OK=$((OK + 1))
    echo "  [OK]   $KEY"
  else
    FAIL=$((FAIL + 1))
    echo "  [FAIL] $KEY"
  fi
done

unset TOKEN

echo "[PASS] $OK/$COUNT secrets registered in $SECRET_PATH"
[[ "$FAIL" -eq 0 ]] || fail "$FAIL secrets failed"
