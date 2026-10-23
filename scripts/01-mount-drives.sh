#!/usr/bin/env bash
set -Eeuo pipefail

# Existing data disks only; never partitions or formats drives.
UUIDS=(
  '83259698-d2a6-45e7-b503-7f106b746b39'
  '9070ff10-5016-4b6f-a148-b5ed1ad61ae6'
)
TARGETS=(/mnt/storage /mnt/cold)

[[ $EUID -eq 0 ]] || { echo 'Run with sudo: sudo ./pathfinder-mount-drives.sh' >&2; exit 1; }

# Validate everything before editing fstab.
for i in "${!UUIDS[@]}"; do
  uuid=${UUIDS[$i]}; target=${TARGETS[$i]}
  device=$(blkid -U "$uuid" || true)
  [[ -n $device ]] || { echo "Missing filesystem UUID: $uuid" >&2; exit 1; }
  type=$(blkid -p -o value -s TYPE "$device")
  [[ $type == ext4 ]] || { echo "Unexpected filesystem on $device: $type" >&2; exit 1; }
  [[ ! -e $target || -d $target ]] || { echo "Not a directory: $target" >&2; exit 1; }
  mounted_uuid=$(findmnt -n -o UUID --mountpoint "$target" || true)
  if [[ -n $mounted_uuid && $mounted_uuid != "$uuid" ]]; then
    echo "WRONG filesystem already mounted at $target ($mounted_uuid)" >&2; exit 1
  fi
  if [[ -z $mounted_uuid && -d $target && -n $(ls -A "$target") ]]; then
    echo "Refusing nonempty unmounted directory: $target" >&2; exit 1
  fi
  existing=$(awk -v u="UUID=$uuid" -v t="$target" '$1==u || $2==t {print}' /etc/fstab)
  expected="UUID=$uuid $target ext4 defaults,nofail,x-systemd.device-timeout=15s 0 2"
  if [[ -n $existing && $existing != "$expected" ]]; then
    echo "Conflicting /etc/fstab entry for $target: $existing" >&2; exit 1
  fi
  echo "Verified $device (ext4) -> $target"
done

backup="/etc/fstab.pathfinder.$(date +%Y%m%d-%H%M%S).bak"
cp -a /etc/fstab "$backup"
echo "Backup: $backup"

for i in "${!UUIDS[@]}"; do
  uuid=${UUIDS[$i]}; target=${TARGETS[$i]}
  install -d -m 755 "$target"
  if ! awk -v u="UUID=$uuid" '$1==u {found=1} END {exit !found}' /etc/fstab; then
    printf 'UUID=%s %s ext4 defaults,nofail,x-systemd.device-timeout=15s 0 2\n' "$uuid" "$target" >> /etc/fstab
  fi
done

systemctl daemon-reload
for i in "${!UUIDS[@]}"; do
  uuid=${UUIDS[$i]}; target=${TARGETS[$i]}
  if ! mountpoint -q "$target"; then mount "$target"; fi
  actual=$(findmnt -n -o UUID --mountpoint "$target")
  [[ $actual == "$uuid" ]] || { echo "Verification failed for $target" >&2; exit 1; }
  echo "Mounted $target (UUID $actual)"
done
findmnt --verify
printf '\n'; df -hT /mnt/storage /mnt/cold
