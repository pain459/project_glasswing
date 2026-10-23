#!/usr/bin/env bash
set -Eeuo pipefail

# Pathfinder: minimal, repeatable Ubuntu server bootstrap.
# Does not mount, format, partition, resize, or move any disks/data.
# Uses the standard Docker package installation and respects existing daemon configuration.

if [[ $EUID -eq 0 ]]; then
  echo 'Run as your normal login user, not root: ./pathfinder-bootstrap.sh' >&2
  exit 1
fi

. /etc/os-release
if [[ "${ID:-}" != ubuntu ]]; then
  echo 'This bootstrapper supports Ubuntu only.' >&2
  exit 1
fi

USER_TO_CONFIGURE="$(id -un)"
log() { printf '\n==> %s\n' "$*"; }

log "Bootstrapping $(hostname) for ${USER_TO_CONFIGURE}"
sudo -v

log 'Installing baseline tools'
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl gnupg git jq rsync unzip zip \
  vim nano tree htop btop tmux lsof \
  dnsutils iproute2 pciutils nvme-cli smartmontools \
  python3 python3-venv python3-pip openssh-server ufw acl
sudo systemctl enable --now ssh

log 'Configuring official Docker apt repository'
sudo install -d -m 0755 /etc/apt/keyrings
if [[ ! -s /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
fi
sudo chmod a+r /etc/apt/keyrings/docker.asc
ARCH="$(dpkg --print-architecture)"
CODENAME="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
DOCKER_SOURCE="$(printf 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: %s\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n' "$CODENAME" "$ARCH")"
if [[ ! -f /etc/apt/sources.list.d/docker.sources ]] || [[ "$(cat /etc/apt/sources.list.d/docker.sources)" != "$DOCKER_SOURCE" ]]; then
  printf '%s\n' "$DOCKER_SOURCE" | sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null
fi

log 'Installing Docker Engine and Compose'
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now containerd docker

log "Granting ${USER_TO_CONFIGURE} Docker access"
getent group docker >/dev/null || sudo groupadd docker
if ! id -nG "$USER_TO_CONFIGURE" | tr ' ' '\n' | grep -qx docker; then
  sudo usermod -aG docker "$USER_TO_CONFIGURE"
fi

log 'Verifying installation'
sudo docker info --format 'Docker Engine: {{.ServerVersion}} | Data root: {{.DockerRootDir}}'
sudo docker compose version
printf '\nBootstrap complete.\n'
printf 'NOTE: Docker group membership grants root-equivalent access.\n'
printf 'Log out and reconnect once, then run: docker ps && docker compose version\n'
printf 'Existing /etc/docker and /etc/containerd configuration was preserved, if present.\n'
