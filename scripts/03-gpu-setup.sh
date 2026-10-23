#!/usr/bin/env bash
# Pathfinder: idempotent NVIDIA driver + Docker GPU integration.
set -Eeuo pipefail

LOG_DIR="${HOME}/pathfinder-setup-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/gpu-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG_FILE") 2>&1

STEPS_OK=()
log() { printf '[%s] %s\n' "$(date -Is)" "$*"; }
pass() { STEPS_OK+=("$1"); log "PASS: $1"; }
fail() { log "FAIL: $*" >&2; exit 1; }
on_error() { rc=$?; log "FAILED at line $1 (exit $rc). Log: $LOG_FILE" >&2; exit "$rc"; }
trap 'on_error "$LINENO"' ERR

[[ "$(id -u)" -ne 0 ]] || fail 'Run as normal user (not root): ./scripts/gpu-setup.sh'
. /etc/os-release
[[ "$ID" == ubuntu ]] || fail 'Ubuntu is required'
[[ "$(hostname -s)" == pathfinder ]] || log "NOTE: hostname is $(hostname -s), expected pathfinder"
command -v docker >/dev/null || fail 'Docker not installed; run primary bootstrap first'
docker info >/dev/null || fail 'Docker unavailable to current user; reconnect after docker group change'
sudo -v
pass 'Ubuntu and Docker access'

log 'Checking RTX 4090 presence'
PCI_INVENTORY="$(lspci -nn)"

if [[ "$PCI_INVENTORY" != *"[10de:2684]"* ]]; then
  fail 'NVIDIA RTX 4090 GPU not detected'
fi

pass 'NVIDIA RTX 4090 detected'

log 'Refreshing APT and installing driver selection tools'
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg ubuntu-drivers-common pciutils
pass 'APT prerequisites'

# Do not replace a working driver. If installed during this run, kernel modules
# generally require a reboot before continuing to toolkit + runtime checks.
if nvidia-smi -L >/dev/null 2>&1; then
  pass 'Host NVIDIA driver already operational'
else
  log 'No functioning NVIDIA driver; installing Ubuntu-recommended driver'
  sudo ubuntu-drivers install
  log 'Driver packages installed. A reboot may be needed before GPU initialization.'
  if ! nvidia-smi -L >/dev/null 2>&1; then
    log 'ACTION REQUIRED: sudo reboot; then rerun this SAME script.'
    log "Partial completion: driver installed, toolkit pending. Log: $LOG_FILE"
    exit 20
  fi
  pass 'Host NVIDIA driver installed and operational'
fi

log 'Driver and GPU information'
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

log 'Configuring official NVIDIA Container Toolkit APT repository'
sudo install -d -m 0755 /usr/share/keyrings
keyfile=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
if [[ ! -s "$keyfile" ]]; then
  tmpkey="$(mktemp)"
  trap 'rm -f "$tmpkey"' EXIT
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --batch --yes --dearmor > "$tmpkey"
  sudo install -m 0644 "$tmpkey" "$keyfile"
  rm -f "$tmpkey"
  trap - EXIT
fi
repo_tmp="$(mktemp)"
trap 'rm -f "$repo_tmp"' EXIT
curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' > "$repo_tmp"
sudo install -m 0644 "$repo_tmp" /etc/apt/sources.list.d/nvidia-container-toolkit.list
rm -f "$repo_tmp"
trap - EXIT
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nvidia-container-toolkit
pass 'NVIDIA Container Toolkit installed'

# Avoid modifying daemon.json and restarting Docker on every execution.
if ! docker info --format '{{json .Runtimes}}' | grep -q '"nvidia"'; then
  log 'Registering NVIDIA runtime with Docker'
  sudo nvidia-ctk runtime configure --runtime=docker
  sudo systemctl restart docker
else
  log 'NVIDIA runtime already registered; leaving Docker configuration untouched'
fi

docker info --format '{{json .Runtimes}}' | grep -q '"nvidia"' || fail 'Docker NVIDIA runtime missing'
pass 'Docker NVIDIA runtime registered'

log 'Running GPU smoke test in Docker (may download ubuntu:24.04)'
docker run --rm --pull=missing --gpus all ubuntu:24.04 nvidia-smi -L
pass 'GPU accessible inside container'

log 'Final results'
printf '  %-36s %s\n' 'OS:' "$(. /etc/os-release; echo "$PRETTY_NAME")" 'Docker:' "$(docker version --format '{{.Server.Version}}')" 'Compose:' "$(docker compose version --short)" 'Toolkit:' "$(dpkg-query -W -f='${Version}' nvidia-container-toolkit)" 'Log:' "$LOG_FILE"
for step in "${STEPS_OK[@]}"; do printf '  [PASS] %s\n' "$step"; done
log 'COMPLETE: Pathfinder NVIDIA host + Docker GPU setup verified.'
