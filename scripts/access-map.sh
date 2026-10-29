#!/usr/bin/env bash
# Print (and optionally probe) the plain-IP access map for every stack.
#
# Ports are discovered from `stacks/*/compose.yaml`, so this cannot drift from
# what is actually published. A few entries need a label, an HTTPS scheme, or a
# path: those live in the `describe` function below.
#
# Usage:
#   ./scripts/access-map.sh           # print the map
#   ./scripts/access-map.sh --probe   # print the map and curl every URL
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_IP_DEFAULT="192.168.68.62"
HOST_IP="${GLASSWING_HOST_IP:-$HOST_IP_DEFAULT}"

# Sets LABEL, SCHEME, PATH, PROBE for a published host port.
# PROBE=0 hides the row (non-HTTP protocols).
describe() {
  local port="$1"
  LABEL=""; SCHEME="http"; PATH_="/"; PROBE=1
  case "$port" in
    53)          PROBE=0 ;;
    2222)        LABEL="Forgejo SSH"; SCHEME="ssh"; PROBE=0 ;;
    3008)        PROBE=0 ;;                                   # AdGuard first-run UI
    5432)        LABEL="PostgreSQL"; PROBE=0 ;;
    4318)        LABEL="OTLP HTTP ingest"; PROBE=0 ;;
    9223)        LABEL="Steel CDP"; PROBE=0 ;;
    13133)       LABEL="OTel health" ;;
    3002)        LABEL="Flowise" ;;
    3003)        LABEL="Uptime Kuma" ;;
    3004)        LABEL="DBGate" ;;
    3006)        LABEL="Homepage / dashboard" ;;
    3007)        LABEL="AdGuard Home" ;;
    3009)        LABEL="Excalidraw" ;;
    3010)        LABEL="Langfuse" ;;
    3011)        LABEL="Forgejo"; PATH_="/" ;;
    3012)        LABEL="AnythingLLM" ;;
    3013)        LABEL="CyberChef" ;;
    3014)        LABEL="Dagu" ;;
    3015)        LABEL="IT-Tools" ;;
    3016)        LABEL="Stirling-PDF" ;;
    3017)        LABEL="Kavita" ;;
    3018)        LABEL="OpenObserve"; PATH_="/healthz" ;;
    3019)        LABEL="OpenCode"; PATH_="/health" ;;
    3021)        LABEL="Calculators" ;;
    3100)        LABEL="Steel Browser"; PATH_="/ui" ;;
    5055)        LABEL="Open Notebook API"; PATH_="/api/v1/" ;;
    8090)        LABEL="Beszel" ;;
    8095)        LABEL="Infisical"; SCHEME="https" ;;
    8502)        LABEL="Open Notebook" ;;
    8889)        LABEL="JupyterLab"; PATH_="/lab" ;;
    9090)        LABEL="Langfuse media (S3)"; PROBE=0 ;;
    9443)        LABEL="Portainer"; SCHEME="https" ;;
    11434)       LABEL="Ollama API"; PATH_="/api/version" ;;
    32400)       LABEL="Plex"; PATH_="/web" ;;
    61208)       LABEL="Glances"; PATH_="/api/4/status" ;;
    8686)        LABEL="Vector API"; PATH_="/health" ;;
    *)           LABEL="port $port" ;;
  esac
}

url_for() {
  local port="$1" scheme="$2" path="$3"
  if [ "$scheme" = "ssh" ]; then
    printf 'ssh://%s:%s' "$HOST_IP" "$port"
  else
    printf '%s://%s:%s%s' "$scheme" "$HOST_IP" "$port" "$path"
  fi
}

probe_url() {
  local url="$1" scheme="$2"
  [ "$scheme" = "https" ] && set -- "$url" "-k" || set -- "$url" ""
  local code
  code="$(curl -sk -o /dev/null -m 4 -w '%{http_code}' "$1" || true)"
  case "$code" in
    2??|3??|401|403) printf 'ok (%s)' "$code" ;;
    "") printf 'no answer' ;;
    *) printf 'HTTP %s' "$code" ;;
  esac
}

main() {
  local probe=0
  [ "${1:-}" = "--probe" ] && probe=1

  printf '%-15s %-22s %-42s' "STACK" "SERVICE" "URL"
  [ "$probe" -eq 1 ] && printf ' %s' "STATUS"
  printf '\n'
  printf '%.0s-' {1..110}; printf '\n'

  local compose stack port rows=0
  while IFS= read -r compose; do
    stack="$(basename "$(dirname "$compose")")"
    # Published host ports look like "192.168.68.62:3006:3000" or
    # "${VAR}:3018:5080"; only the numeric middle field is a host port.
    while IFS= read -r port; do
      [ -n "$port" ] || continue
      describe "$port"
      [ "$PROBE" -eq 1 ] || continue
      local url; url="$(url_for "$port" "$SCHEME" "$PATH_")"
      printf '%-15s %-22s %-42s' "$stack" "$LABEL" "$url"
      [ "$probe" -eq 1 ] && printf ' %s' "$(probe_url "$url" "$SCHEME")"
      printf '\n'
      rows=$((rows + 1))
    done < <(grep -Eo '"[0-9.]+:[0-9]+:[0-9]+"' "$compose" \
               | tr -d '"' | awk -F: '{print $(NF-1)}' | sort -un)
  done < <(find "$ROOT/stacks" -mindepth 2 -maxdepth 2 -name compose.yaml | sort)

  # Ports that are bound through environment variables, or that never appear in
  # a compose `ports:` block (host networking), are listed explicitly.
  local static_rows=(
    "dagu|Dagu|http|/|3014"
    "infisical|Infisical|https|/|8095"
    "steel|Steel Browser|http|/ui|3100"
  )
  local row s_stack s_label s_scheme s_path s_port s_url
  for row in "${static_rows[@]}"; do
    IFS='|' read -r s_stack s_label s_scheme s_path s_port <<< "$row"
    s_url="$s_scheme://$HOST_IP:$s_port$s_path"
    printf '%-15s %-22s %-42s' "$s_stack" "$s_label" "$s_url"
    [ "$probe" -eq 1 ] && printf ' %s' "$(probe_url "$s_url" "$s_scheme")"
    printf '\n'
    rows=$((rows + 1))
  done

  printf '%-15s %-22s %-42s' "steel" "Steel CDP" "http://$HOST_IP:9223 (CDP, not a UI)"
  [ "$probe" -eq 1 ] && printf ' %s' "-"
  printf '\n'
  rows=$((rows + 1))

  printf '%.0s-' {1..110}; printf '\n'
  echo "$rows entries. Host IP: $HOST_IP (override with GLASSWING_HOST_IP)."
  [ "$probe" -eq 1 ] || echo "Run '$0 --probe' to curl every URL."
}

main "$@"
