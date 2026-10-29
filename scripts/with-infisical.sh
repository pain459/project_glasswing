
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDS="$ROOT/.local/infisical/credentials.env"
CERT="$ROOT/stacks/infisical/tls/cert.pem"
GLOBAL_LIST="$ROOT/stacks/global-secrets.list"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

# Usage:
# with-infisical.sh <secret-path> <keys-file> -- <command>
#
# <keys-file> format:
#   SECRET_KEY              — fetched from <secret-path>
#   # comment               — ignored
#   (blank line)            — ignored
#
# If stacks/global-secrets.list exists, its keys are always loaded first
# from the /global Infisical path.

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

# The Infisical API can still be booting, or its gateway can briefly answer
# 502, right after `make up STACK=infisical` or a restart. Retry the login
# instead of failing the whole deploy on a transient error.
LOGIN_ATTEMPTS="${INFISICAL_LOGIN_ATTEMPTS:-15}"
LOGIN_DELAY="${INFISICAL_LOGIN_DELAY:-2}"
login_attempt=1

while :; do
  if TOKEN="$(
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
  )"; then
    break
  fi

  (( login_attempt < LOGIN_ATTEMPTS )) ||
    fail "Authentication failed after $LOGIN_ATTEMPTS attempts"

  echo "[INFO] Infisical API not ready (attempt $login_attempt/$LOGIN_ATTEMPTS); retrying in ${LOGIN_DELAY}s"
  sleep "$LOGIN_DELAY"
  login_attempt=$((login_attempt + 1))
done

# Prevent accidental inheritance of bootstrap credentials.
unset INFISICAL_CLIENT_ID INFISICAL_CLIENT_SECRET

# fetch_one <key> <path> — retrieve a single secret and export it.
fetch_one() {
  local KEY="$1" PATH_="$2"

  VALUE="$(
    curl --fail --silent --show-error \
      --cacert "$CERT" \
      -G "$INFISICAL_URL/api/v4/secrets/$KEY" \
      -H "Authorization: Bearer $TOKEN" \
      --data-urlencode "projectId=$INFISICAL_PROJECT_ID" \
      --data-urlencode "environment=$INFISICAL_ENV" \
      --data-urlencode "secretPath=$PATH_" |
    jq -er '.secret.secretValue'
  )" || fail "Unable to retrieve $KEY from $PATH_"

  [[ -n "$VALUE" ]] || fail "Empty secret: $KEY"

  export "$KEY=$VALUE"

  # Credentials embedded in URLs (postgresql://user:pass@host/db) must be
  # percent-encoded or an '@', '/', ':' or '#' in the password changes the URL.
  # Export a companion variable rather than mutating the secret itself.
  case "$KEY" in
    *_PASSWORD | *_SECRET | *_TOKEN)
      export "${KEY}_URLENCODED=$(jq -rn --arg v "$VALUE" '$v | @uri')"
      ;;
  esac

  unset VALUE
}

# load_keys <path> <file> — read keys from <file>, fetch from <path>.
# Returns count via global LOAD_COUNT.
load_keys() {
  local PATH_="$1" FILE="$2"
  LOAD_COUNT=0

  while IFS= read -r KEY || [[ -n "$KEY" ]]; do
    # Strip whitespace.
    KEY="${KEY#"${KEY%%[![:space:]]*}"}"
    KEY="${KEY%"${KEY##*[![:space:]]}"}"

    # Skip blanks and comments.
    [[ -z "$KEY" || "$KEY" == \#* ]] && continue

    [[ "$KEY" =~ ^[A-Z][A-Z0-9_]*$ ]] ||
      fail "Invalid secret name: $KEY"

    # Avoid accidental overwrites of deployment metadata.
    [[ "$KEY" != INFISICAL_* && "$KEY" != COMPOSE_* ]] ||
      fail "Reserved variable name: $KEY"

    fetch_one "$KEY" "$PATH_"
    LOAD_COUNT=$((LOAD_COUNT + 1))
  done < "$FILE"
}

COUNT=0

# Always load global secrets first (if the manifest exists).
if [[ -f "$GLOBAL_LIST" ]]; then
  load_keys /global "$GLOBAL_LIST"
  echo "[INFO] Loaded $LOAD_COUNT global secrets from /global"
  COUNT=$((COUNT + LOAD_COUNT))
fi

# Load stack-specific secrets.
load_keys "$SECRET_PATH" "$KEYS_FILE"
echo "[INFO] Loaded $LOAD_COUNT secrets from $SECRET_PATH"
COUNT=$((COUNT + LOAD_COUNT))

unset TOKEN

echo "[PASS] Retrieved $COUNT secrets total"
echo "[INFO] Starting requested command"

exec "$@"
