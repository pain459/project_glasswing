#!/usr/bin/env bash
# Pathfinder: grant RAPL energy-counter readability to an unprivileged group.
#
# Purpose (2026-11-09): the kernel ships /sys/class/powercap/intel-rapl:*/energy_uj
# as 0400 root:root (read-on-third counter reset = energy side-channel), so users
# cannot measure host power. This installs a udev rule that makes the files
# readable by group 'adm' after every device (re-)creation, then re-triggers the
# powercap devices so it takes effect immediately, then verifies.
#
# Run as: sudo ./scripts/05-rapl-access.sh
# Idempotent: rewriting the same rule file is a no-op.
#
# Note: measure, don't trust blindly — see Gotcha - glasswing-power - AMD RAPL
# Energy Counters 1000x Inflated (the script prints an instantaneous W check so
# the raw sysfs basis can be validated against any power gauge you use).

set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo ./scripts/05-rapl-access.sh" >&2; exit 1; }

RULE_FILE=/etc/udev/rules.d/99-rapl-read.rules
GROUP=adm

cat > "$RULE_FILE" <<'EOF'
# Allow non-root power monitoring: expose RAPL energy counters to group adm.
# Read-on-open resets each counter; two consecutive reads give instantaneous watts.
# NOTE: $devpath is /sys-RELATIVE (/devices/...), so preambula "/sys" is required —
# RUN with a bare $devpath fails with 'No such file or directory' (udev-worker).
# Installed by project_glasswing scripts/05-rapl-access.sh
SUBSYSTEM=="powercap", KERNEL=="intel-rapl:*", ACTION=="add", \
  RUN+="/usr/bin/chgrp adm /sys$devpath/energy_uj", \
  RUN+="/usr/bin/chmod g+r /sys$devpath/energy_uj"
EOF

udevadm control --reload
udevadm trigger --subsystem-match=powercap --action=add

sleep 1

echo "── Rules installed ────────────────────────────────────────────"
cat "$RULE_FILE"
echo "── Permission check (group 'adm' must be able to read) ───────"
# A root-run script can read 0400 files, so test the mode bits + non-member view.
for f in /sys/class/powercap/intel-rapl:*/energy_uj; do
  mode=$(stat -c '%A' "$f")
  owner=$(stat -c '%U:%G' "$f")
  if runuser -u ravik -- test -r "$f" 2>/dev/null; then
    echo "PASS: ravik-readable -> $f ($mode $owner)"
  elif stat -c '%a' "$f" | grep -q '[4567][0-9]$'; then
    echo "PARTIAL (group r present, verify interactively) -> $f ($mode $owner)"
  else
    echo "FAIL: no group read -> $f ($mode $owner)"
  fi
done

echo "── Identity check under 'adm' group membership ───────────────"
id ravik | grep -q 'adm' && echo "PASS: ravik is in adm" || echo "FAIL: ravik is NOT in adm (add with: sudo usermod -aG adm ravik)"

echo "── Instantaneous power sanity (raw sysfs, 5 s window) ────────"
for f in /sys/class/powercap/intel-rapl:0/energy_uj; do
  if [ -r "$f" ]; then
    e1=$(cat "$f")
    n1=${e1}
    sleep 5
    e2=$(cat "$f")
    # Counter can wrap at max_energy_range_uj; delta >= 0 required
    max=$(cat "$(dirname "$f")/max_energy_range_uj")
    if [ "$e2" -lt "$e1" ]; then delta=$((e2 + max - e1)); else delta=$((e2 - e1)); fi
    watts=$((delta / 5000000))  # µJ over 5 s → µW (/5) → W (/1e6)
    echo "$f : ${watts} W over 5 s (compare to your power gauge of choice)"
  else
    echo "skip (unreadable): $f"
  fi
done
