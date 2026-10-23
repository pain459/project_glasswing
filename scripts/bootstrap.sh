#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/config/disks.csv"
LOG_DIR="${HOME}/glasswing-bootstrap-logs"
mkdir -p "$LOG_DIR"
log(){ printf '[%s] %s\n' "$(date -Is)" "$*"; }
die(){ log "ERROR: $*" >&2; exit 1; }
need_sudo(){ sudo -v; }
check_host(){ . /etc/os-release; [[ "$ID" == ubuntu ]] || die 'Ubuntu only'; [[ "$(uname -m)" == x86_64 ]] || die 'Expected x86_64 Glasswing host'; }
preflight(){
 check_host
 log '=== Host ==='; hostnamectl; echo
 log '=== Root and storage ==='; findmnt /; lsblk -e7 -o NAME,SIZE,TYPE,FSTYPE,LABEL,UUID,MOUNTPOINTS,MODEL; echo
 log '=== Existing mounts ==='; findmnt -t ext4,xfs,btrfs || true; echo
 log '=== GPU / driver ==='; lspci | grep -iE 'nvidia|vga|3d controller' || true; command -v nvidia-smi >/dev/null && nvidia-smi || true
 log '=== Network ==='; ip -br addr; echo
 log '=== Installed tools ==='; command -v docker >/dev/null && docker --version || true; command -v docker >/dev/null && docker compose version || true
 log '=== fstab ==='; sed -E '/^[[:space:]]*#/d;/^[[:space:]]*$/d' /etc/fstab
}
# No formatting, partition modification, or UUID generation. Only existing filesystems.
mount_plan(){
 check_host
 [[ -f "$CONFIG" ]] || die "Missing $CONFIG"
  while IFS=, read -r uuid target fs opts || [[ -n "$uuid" ]]; do
  [[ -z "${uuid//[[:space:]]/}" || "$uuid" == \#* ]] && continue
  [[ "$uuid" =~ ^[A-Za-z0-9-]+$ ]] || die "Invalid UUID: $uuid"
  [[ "$target" =~ ^/(srv|mnt)/[A-Za-z0-9_./-]+$ && "$target" != *..* ]] || die "Invalid mountpoint: $target"
  [[ "$fs" == ext4 || "$fs" == xfs || "$fs" == btrfs ]] || die "Unsupported filesystem: $fs"
  [[ "$opts" =~ ^[A-Za-z0-9=,._-]+$ ]] || die "Invalid options"
  [[ "$opts" == *nofail* ]] || die "Add nofail to options"
  dev="$(blkid -U "$uuid" || true)"; [[ -n "$dev" ]] || die "UUID not found: $uuid"
  actual="$(sudo blkid -o value -s TYPE "$dev")"; [[ "$actual" == "$fs" ]] || die "$dev is $actual, expected $fs"
  [[ "$(findmnt -n -o SOURCE /)" != "$dev" ]] || die "Refusing root filesystem: $dev"
  current="$(findmnt -n -o TARGET --source "$dev" | head -1 || true)"
  [[ -z "$current" || "$current" == "$target" ]] || die "$dev is already mounted at $current"
  [[ ! -e "$target" || -d "$target" ]] || die "Target is not a directory: $target"
  if [[ -d "$target" && -n "$(ls -A "$target" 2>/dev/null)" && -z "$(findmnt -n --target "$target" -o TARGET | grep -Fx "$target" || true)" ]]; then die "Unmounted target isn't empty: $target"; fi
  existing="$(awk -v u="UUID=$uuid" -v t="$target" '$1==u || $2==t {print}' /etc/fstab)"
  [[ -z "$existing" || "$existing" == "UUID=$uuid $target $fs $opts 0 2" ]] || die "Conflicting fstab entry: $existing"
  printf 'PLAN: %s (%s, %s) -> %s [%s]\n' "$uuid" "$dev" "$fs" "$target" "$opts"
 done < "$CONFIG"
}
mount_apply(){
 mount_plan
 [[ "${CONFIRM_MOUNTS:-}" == YES ]] || die 'Mount writes require CONFIRM_MOUNTS=YES'
 need_sudo
 backup="/etc/fstab.glasswing.$(date +%Y%m%d%H%M%S).bak"
 sudo cp -a /etc/fstab "$backup"; log "fstab backup: $backup"
 while IFS=, read -r uuid target fs opts; do
  [[ -z "${uuid//[[:space:]]/}" || "$uuid" == \#* ]] && continue
  if ! sudo awk -v u="UUID=$uuid" '$1==u {found=1} END {exit !found}' /etc/fstab; then
    sudo install -d -m 755 "$target"
    printf 'UUID=%s %s %s %s 0 2\n' "$uuid" "$target" "$fs" "$opts" | sudo tee -a /etc/fstab >/dev/null
  fi
  sudo systemctl daemon-reload
  if ! mountpoint -q "$target"; then sudo mount "$target"; fi
  mountpoint -q "$target" || die "Mount failed at $target"
  log "Mounted $target"
 done < "$CONFIG"
 sudo findmnt --verify --verbose
}
base(){
 check_host; need_sudo
 sudo apt-get update
 sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg git jq rsync unzip zip vim nano htop btop tmux tree lsof dnsutils iproute2 pciutils nvme-cli smartmontools ufw openssh-server python3 python3-venv python3-pip openssl acl
 sudo systemctl enable --now ssh
 sudo install -d -m 755 /opt/glasswing /opt/glasswing/releases /srv/glasswing /etc/glasswing
 # Do not change owners here. Deployment account permission design is separate.
 log 'Base packages and system directories ready. UFW intentionally unchanged to protect SSH access.'
}
docker_install(){
 check_host; need_sudo
 if dpkg-query -W -f='${Status}' docker.io 2>/dev/null | grep -q 'install ok installed'; then die 'docker.io already installed; review package migration manually'; fi
 sudo apt-get update
 sudo apt-get install -y ca-certificates curl gnupg
 sudo install -m 0755 -d /etc/apt/keyrings
 sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
 sudo chmod a+r /etc/apt/keyrings/docker.asc
 . /etc/os-release
 arch="$(dpkg --print-architecture)"
 sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOT
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $arch
Signed-By: /etc/apt/keyrings/docker.asc
EOT
 sudo apt-get update
 sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
 sudo systemctl enable --now docker
 sudo docker version; sudo docker compose version
 log 'Docker ready. Access requires sudo; no docker group membership granted.'
}
nvidia_toolkit(){
 check_host; command -v nvidia-smi >/dev/null || die 'Install and validate NVIDIA driver first (nvidia-smi required)'
 nvidia-smi >/dev/null || die 'GPU driver not working'
 command -v docker >/dev/null || die 'Install Docker first'
 need_sudo
 sudo install -m 0755 -d /usr/share/keyrings
 curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor | sudo tee /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg >/dev/null
 curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null
 sudo apt-get update
 sudo apt-get install -y nvidia-container-toolkit
 sudo nvidia-ctk runtime configure --runtime=docker
 sudo systemctl restart docker
 sudo docker info --format '{{json .Runtimes}}'
 log 'NVIDIA Container Toolkit installed. GPU workload smoke test is a separate phase.'
}
verify(){
 check_host; log '=== mounts ==='; findmnt --verify; while IFS=, read -r uuid target fs opts; do [[ -z "${uuid//[[:space:]]/}" || "$uuid" == \#* ]] && continue; findmnt --mountpoint "$target" || die "$target not mounted"; done < "$CONFIG"
 log '=== docker ==='; if command -v docker >/dev/null; then sudo docker info --format 'Engine: {{.ServerVersion}}'; sudo docker compose version; fi
 log '=== network/SSH ==='; systemctl is-active ssh; log 'Verification done'
}
usage(){ cat <<'EOT'
Usage: scripts/bootstrap preflight|mount-plan|mount-apply|base|docker|nvidia-toolkit|verify
Suggested order: preflight -> edit config/disks.csv -> mount-plan -> CONFIRM_MOUNTS=YES mount-apply -> base -> docker -> [nvidia-toolkit] -> verify
WARNING: mount-apply edits /etc/fstab and mounts existing filesystems. It NEVER formats disks.
EOT
}
case "${1:-}" in
 preflight) preflight;; mount-plan) mount_plan;; mount-apply) mount_apply;; base) base;; docker) docker_install;; nvidia-toolkit) nvidia_toolkit;; verify) verify;; *) usage; exit 2;;
esac
