#!/usr/bin/env bash
# notebook-note.sh — publish a Markdown file as a note in Open Notebook.
#
# The note is written through the Open Notebook REST API from the host that
# runs the stack. The API password is read from the running container's
# environment, so it never has to be copied into a shell or a chat.
#
# Usage:
#   ./scripts/notebook-note.sh <notebook-name> <note-title> <markdown-file>
#
# Re-running with the same notebook name and note title updates the existing
# note instead of creating a duplicate.
#
# Environment overrides:
#   NOTEBOOK_URL   default http://127.0.0.1:8502
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE_URL="${NOTEBOOK_URL:-}"
if [[ -z "$BASE_URL" ]]; then
  # Ports bind to the LAN address, not loopback, so resolve the same value the
  # Makefile uses (command line / shell, then the gitignored bootstrap file).
  NOTEBOOK_IP="${GLASSWING_HOST_IP:-}"
  if [[ -z "$NOTEBOOK_IP" && -f stacks/infisical/.env ]]; then
    NOTEBOOK_IP="$(sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' stacks/infisical/.env \
      | head -n1 | tr -d "\"'")"
  fi
  BASE_URL="http://${NOTEBOOK_IP:-127.0.0.1}:8502"
fi

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

[[ $# -eq 3 ]] || fail "Usage: $0 <notebook-name> <note-title> <markdown-file>"

NOTEBOOK_NAME="$1"
NOTE_TITLE="$2"
NOTE_FILE="$3"

[[ -f "$NOTE_FILE" ]] || fail "Note file not found: $NOTE_FILE"
[[ -s "$NOTE_FILE" ]] || fail "Note file is empty: $NOTE_FILE"
command -v docker >/dev/null || fail "docker is not available on this host"
command -v python3 >/dev/null || fail "python3 is required to build the request bodies"

# --- 1. Locate the running Open Notebook container ---------------------------
# Labels avoid parsing compose.yaml, which needs every required variable set.
CID="$(docker ps -q \
  --filter 'label=com.docker.compose.project=glasswing-open-notebook' \
  --filter 'label=com.docker.compose.service=open_notebook' | head -n1)"
if [[ -z "$CID" ]]; then
  CID="$(docker ps -q --filter 'name=open-notebook-open_notebook' | head -n1)"
fi
[[ -n "$CID" ]] || fail "Open Notebook container is not running (make up STACK=open-notebook)"

RUNNING="$(docker inspect -f '{{.State.Running}}' "$CID" 2>/dev/null || echo false)"
[[ "$RUNNING" == "true" ]] || fail "Open Notebook container $CID is not running"

TOKEN="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CID" \
  | sed -n 's/^OPEN_NOTEBOOK_PASSWORD=//p' | head -n1)"
[[ -n "$TOKEN" ]] || fail "OPEN_NOTEBOOK_PASSWORD is not set in the container environment"

# --- 2. Request helpers ------------------------------------------------------
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Credentials live in a curl config file (0600) so the token never appears in
# the process list.
CURL_CFG="$TMP_DIR/curl.cfg"
escape_cfg() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
{
  printf 'header = "Authorization: Bearer %s"\n' "$(escape_cfg "$TOKEN")"
  printf 'silent\nshow-error\nmax-time = 60\n'
} >"$CURL_CFG"

# call <method> <path> [json-file] -> prints the HTTP status; body in $TMP_DIR/body
call() {
  local method="$1" path="$2" payload="${3:-}"
  local args=(--config "$CURL_CFG" -X "$method" -o "$TMP_DIR/body" -w '%{http_code}' "$BASE_URL$path")
  if [[ -n "$payload" ]]; then
    args+=(-H 'Content-Type: application/json' --data-binary "@$payload")
  fi
  curl "${args[@]}"
}

# json_get <file> <python-expression> [argument] — `d` is the parsed JSON, `arg`
# is the extra value. Prints the expression result.
json_get() {
  python3 - "$1" "$2" "${3:-}" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
print(eval(sys.argv[2], {"d": d, "sys": sys, "arg": sys.argv[3]}))
PY
}

body_head() { head -c 300 "$TMP_DIR/body"; }

# --- 3. Find or create the notebook -----------------------------------------
status="$(call GET '/api/notebooks')" || fail "Cannot reach $BASE_URL"
case "$status" in
  200) ;;
  401) fail "Open Notebook rejected the container password (HTTP 401)" ;;
  *) fail "GET /api/notebooks returned HTTP $status: $(body_head)" ;;
esac

NOTEBOOK_ID="$(json_get "$TMP_DIR/body" \
  "next((n['id'] for n in d if n.get('name') == arg), '')" "$NOTEBOOK_NAME" 2>/dev/null || true)"

if [[ -z "$NOTEBOOK_ID" ]]; then
  python3 - "$TMP_DIR/notebook.json" "$NOTEBOOK_NAME" <<'PY'
import json, sys
json.dump(
    {"name": sys.argv[2], "description": "Glasswing session memory and runbooks"},
    open(sys.argv[1], "w", encoding="utf-8"),
)
PY
  status="$(call POST /api/notebooks "$TMP_DIR/notebook.json")"
  case "$status" in
    200|201) ;;
    *) fail "POST /api/notebooks returned HTTP $status: $(body_head)" ;;
  esac
  NOTEBOOK_ID="$(json_get "$TMP_DIR/body" "d['id']")"
  echo "[INFO] Created notebook '${NOTEBOOK_NAME}' (${NOTEBOOK_ID})"
else
  echo "[INFO] Using notebook '${NOTEBOOK_NAME}' (${NOTEBOOK_ID})"
fi

# --- 4. Update the note when the title already exists, else create it --------
status="$(call GET "/api/notes?notebook_id=${NOTEBOOK_ID}")"
[[ "$status" == "200" ]] || fail "GET /api/notes returned HTTP $status: $(body_head)"

NOTE_ID="$(json_get "$TMP_DIR/body" \
  "next((n['id'] for n in d if (n.get('title') or '').strip() == arg), '')" "$NOTE_TITLE" 2>/dev/null || true)"

# NoteUpdate has no notebook field, so the id is only sent when creating.
python3 - "$TMP_DIR/note.json" "$NOTE_TITLE" "$NOTE_FILE" "$NOTEBOOK_ID" "$NOTE_ID" <<'PY'
import json, sys
payload_path, title, source, notebook_id, existing_id = sys.argv[1:6]
with open(source, encoding="utf-8") as handle:
    content = handle.read()
payload = {"title": title, "content": content, "note_type": "human"}
if not existing_id:
    payload["notebook_id"] = notebook_id
json.dump(payload, open(payload_path, "w", encoding="utf-8"), ensure_ascii=False)
PY

if [[ -n "$NOTE_ID" ]]; then
  status="$(call PUT "/api/notes/${NOTE_ID}" "$TMP_DIR/note.json")"
  ACTION="updated"
else
  status="$(call POST /api/notes "$TMP_DIR/note.json")"
  ACTION="created"
fi
case "$status" in
  200|201) ;;
  *) fail "Writing the note returned HTTP $status: $(body_head)" ;;
esac

NOTE_ID="$(json_get "$TMP_DIR/body" "d['id']")"
BYTES="$(wc -c <"$NOTE_FILE" | tr -d ' ')"

echo "[PASS] ${ACTION} note '${NOTE_TITLE}' (${NOTE_ID}, ${BYTES} bytes)"
echo "       ${BASE_URL}/notebooks/${NOTEBOOK_ID}"
