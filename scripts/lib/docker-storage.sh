#!/usr/bin/env bash
# Glasswing Docker/containerd storage guard. Run BEFORE installing Docker packages.
set -Eeuo pipefail
EXPECTED_UUID="dd944c46-29e9-401b-a03f-b180ab7303c7"
MOUNT="/srv/glasswing"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
require_mount() {
  mountpoint -q "$MOUNT" || fail "$MOUNT is not a mountpoint"
  local actual
  actual="$(findmnt -n -o UUID --mountpoint "$MOUNT")"
  [[ "$actual" == "$EXPECTED_UUID" ]] || fail "$MOUNT UUID is '$actual', expected '$EXPECTED_UUID'"
  [[ "$(findmnt -n -o FSTYPE --mountpoint "$MOUNT")" == "ext4" ]] || fail "$MOUNT must be ext4"
}

prepare() {
  require_mount
  if command -v dockerd >/dev/null || command -v containerd >/dev/null ||
     [[ -d /var/lib/docker && -n "$(ls -A /var/lib/docker 2>/dev/null)" ]] ||
     [[ -d /var/lib/containerd && -n "$(ls -A /var/lib/containerd 2>/dev/null)" ]]; then
    fail "Detected existing runtime or nonempty default data directory. Review migration manually."
  fi
  sudo install -d -m 0711 "$MOUNT/docker" "$MOUNT/containerd"
  sudo install -d -m 0755 /etc/docker /etc/containerd \
    /etc/systemd/system/docker.service.d /etc/systemd/system/containerd.service.d
  if [[ -e /etc/docker/daemon.json ]]; then
    fail "Existing /etc/docker/daemon.json found. Merge manually before proceeding."
  fi
  if [[ -e /etc/containerd/config.toml ]]; then
    fail "Existing /etc/containerd/config.toml found. Merge manually before proceeding."
  fi
  printf '%s\n' '{' '  "data-root": "/srv/glasswing/docker",' '  "log-driver": "local",' '  "log-opts": {"max-size": "20m", "max-file": "5"}' '}' |
    sudo tee /etc/docker/daemon.json >/dev/null
  printf '%s\n' 'version = 2' 'root = "/srv/glasswing/containerd"' |
    sudo tee /etc/containerd/config.toml >/dev/null
  for unit in docker.service containerd.service; do
    sudo tee "/etc/systemd/system/${unit}.d/10-glasswing-storage.conf" >/dev/null <<'UNIT'
[Unit]
RequiresMountsFor=/srv/glasswing
AssertPathIsMountPoint=/srv/glasswing
UNIT
  done
  sudo systemctl daemon-reload
  echo 'Configured storage paths and mount dependencies BEFORE installation.'
}

verify() {
  require_mount
  [[ "$(sudo docker info --format '{{.DockerRootDir}}')" == "$MOUNT/docker" ]] || fail "Docker data root is incorrect"
  [[ "$(sudo containerd config dump | awk -F '"' '/^root = / { print $2; exit }')" == "$MOUNT/containerd" ]] || fail "containerd root is incorrect"
  systemctl is-active --quiet docker.service || fail 'docker.service is not active'
  systemctl is-active --quiet containerd.service || fail 'containerd.service is not active'
  sudo docker compose version
  echo 'Docker and containerd storage verified.'
}

case "${1:-}" in
  prepare) prepare ;;
  verify) verify ;;
  check-mount) require_mount; echo 'Mount UUID verified.' ;;
  *) echo "Usage: $0 prepare|verify|check-mount" >&2; exit 2 ;;
esac
