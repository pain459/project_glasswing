
#!/usr/bin/env bash
set -Eeuo pipefail

# Glasswing unified application-state backup.
# All running glasswing-* containers are stopped
# before the snapshot and restarted afterward.

REPO_ROOT="/home/ravik/src_git/project_glasswing"
BACKUP_MOUNT="/mnt/cold"
EXPECTED_UUID="9070ff10-5016-4b6f-a148-b5ed1ad61ae6"

export RESTIC_REPOSITORY="/mnt/cold/glasswing-backups/restic"
export RESTIC_PASSWORD_FILE="/etc/glasswing/backup/restic-password"

[[ $EUID -eq 0 ]] || {
  echo "[FAIL] Run backup as root"
  exit 1
}

# Prevent simultaneous backup jobs.
exec 9>/run/glasswing-backup.lock
flock -n 9 || {
  echo "[FAIL] Another Glasswing backup is running"
  exit 1
}

# Fail closed when the destination is not mounted.
ACTUAL_UUID="$(
  findmnt -rn --mountpoint "$BACKUP_MOUNT" -o UUID
)"

[[ "$ACTUAL_UUID" == "$EXPECTED_UUID" ]] || {
  echo "[FAIL] Wrong or missing COLD filesystem"
  exit 1
}

[[ -f "$RESTIC_PASSWORD_FILE" ]] || {
  echo "[FAIL] Restic password file missing"
  exit 1
}

[[ -d "$RESTIC_REPOSITORY" ]] || {
  echo "[FAIL] Restic repository missing"
  exit 1
}

[[ -d "$REPO_ROOT" ]] || {
  echo "[FAIL] Glasswing repository missing"
  exit 1
}

command -v docker >/dev/null
command -v restic >/dev/null

restic cat config >/dev/null

# Capture the exact containers that were running.
mapfile -t RUNNING < <(
  docker ps --format '{{.Names}}' |
    grep '^glasswing-' || true
)

echo "[INFO] Running Glasswing containers: ${#RUNNING[@]}"

RESTORE_REQUIRED=0

restore_containers() {
  [[ "$RESTORE_REQUIRED" == 1 ]] || return 0

  echo "[INFO] Restoring previously running containers"

  # Start backing services first.
  for name in "${RUNNING[@]}"; do
    if [[ "$name" =~ (postgres|redis|clickhouse|minio|surrealdb) ]]; then
      docker start "$name" || true
    fi
  done

  # Give databases a chance to initialize.
  sleep 15

  # Start remaining application services.
  for name in "${RUNNING[@]}"; do
    if [[ ! "$name" =~ (postgres|redis|clickhouse|minio|surrealdb) ]]; then
      docker start "$name" || true
    fi
  done

  RESTORE_REQUIRED=0
  echo "[INFO] Container restart attempted"
}

trap restore_containers EXIT

# Stop applications before their databases.
RESTORE_REQUIRED=1

for name in "${RUNNING[@]}"; do
  if [[ ! "$name" =~ (postgres|redis|clickhouse|minio|surrealdb) ]]; then
    echo "[STOP] $name"
    docker stop --time 90 "$name"
  fi
done

for name in "${RUNNING[@]}"; do
  if [[ "$name" =~ (postgres|redis|clickhouse|minio|surrealdb) ]]; then
    echo "[STOP] $name"
    docker stop --time 90 "$name"
  fi
done

echo "[INFO] Creating unified Restic snapshot"

SOURCES=(
  "$REPO_ROOT"
  /var/lib/docker/volumes
)

for optional in \
  /etc/glasswing \
  /etc/docker \
  /etc/systemd/system \
  /etc/ssh/sshd_config \
  /etc/fstab; do
  [[ ! -e "$optional" ]] || SOURCES+=("$optional")
done

restic backup \
  --host pathfinder \
  --tag glasswing-full \
  "${SOURCES[@]}"

echo "[PASS] Restic snapshot completed"

# EXIT trap restarts only the original running containers.
