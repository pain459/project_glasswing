# Glasswing / Pathfinder — Restic Backup & Recovery Runbook

**Status:** Initial manual backup, repository checks, and test restoration reported successful (26 October 2026).  
**Scope:** One encrypted Restic repository, one cold-backup job, all persistent Docker volumes and Glasswing infrastructure configuration.  
**Host:** `pathfinder` (Ubuntu Server)  
**Repository for configuration:** `/home/ravik/src_git/project_glasswing`  
**Backup destination:** `/mnt/cold/glasswing-backups/restic`

> **Terminology:** This installation uses **Restic**, not Rustic. The CLI and commands below are `restic`. Rustic is a different, Restic-compatible backup client and is not part of this documented implementation.

## 1. Architecture and recovery objectives

```text
Pathfinder / Glasswing
  ├── Glasswing source repository (Compose, scripts, TLS config)
  ├── /var/lib/docker/volumes (application persistent state)
  └── selected /etc configuration (host/service configuration)
         │
         ▼
  Cold-backup controller: backup/scripts/backup.sh
    1. Verify destination mount UUID, password and repository
    2. Acquire exclusive backup lock
    3. Record running glasswing-* containers
    4. Stop applications, then stateful backends
    5. Create a single Restic snapshot
    6. Attempt to restart the previously running containers
         │
         ▼
  Encrypted Restic repository on COLD drive
  /mnt/cold/glasswing-backups/restic
         │
         └── Future: independent off-host / offline copy
```

This is an **application-state backup**, not a bootable operating-system image. Application downtime is required during each cold snapshot. The backup repository is on the same physical machine, so it **does not** protect against loss of the entire host, theft, fire, or simultaneous loss of disks. The second independent copy remains pending.

**Operational prerequisites:** root/sudo, Docker CLI, Restic, `flock`, `findmnt`, and enough free space on the destination.

## 2. Verified storage inventory

| Device / filesystem | Mount | Purpose | UUID |
|---|---|---|---|
| OS NVMe, ext4 | `/` | OS, Docker volumes, repo | `c3e4f49c-f4c4-40c7-985d-42252849a75a` |
| STORAGE NVMe, ext4 | `/mnt/storage` | Ollama models / experiments | `83259698-d2a6-45e7-b503-7f106b746b39` |
| COLD HDD, ext4 | `/mnt/cold` | Media, books, local encrypted backup | `9070ff10-5016-4b6f-a148-b5ed1ad61ae6` |

At inventory time: root ~68 GB used, STORAGE ~24 GB used, COLD ~1.1 TB used; COLD had ~2.4 TB available. These values change; inspect before future backups.

**Critical fail-closed guard:** `findmnt` must show `/mnt/cold` as its own mount with COLD UUID `9070ff10-5016-4b6f-a148-b5ed1ad61ae6`. A directory existing at `/mnt/cold` is not sufficient. Never initialize or write to the repository if this guard fails.

```bash
findmnt --mountpoint /mnt/cold -o TARGET,SOURCE,UUID,FSTYPE
lsblk -o NAME,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINTS
df -hT / /mnt/storage /mnt/cold
restic version
```

The installed Restic version at setup was `0.18.1`.

## 3. Backup scope

### Included by the unified script

- `/home/ravik/src_git/project_glasswing` — Compose definitions, Makefile, scripts, Homepage configuration and icons, Infisical gateway/TLS configuration, etc.
- `/var/lib/docker/volumes` — **all** Docker named and anonymous volume data, including volumes created by future applications.
- Optional paths, if present: `/etc/glasswing`, `/etc/docker`, `/etc/systemd/system`, `/etc/ssh/sshd_config`, `/etc/fstab`.

### Representative stateful services

- Infisical PostgreSQL and Redis; Infisical gateway configuration.
- Langfuse PostgreSQL, ClickHouse, MinIO, Redis.
- Open Notebook application data and SurrealDB; includes anonymous volumes.
- Plex configuration, database and metadata (**not media**).
- Uptime Kuma, Portainer, Beszel, AdGuard Home.
- Forgejo, Flowise, AnythingLLM, DBGate, Kavita, Stirling-PDF, JupyterLab.
- OpenObserve stored data and Vector state are also included because **all** Docker volumes are backed up. This may enlarge the snapshot; change scope deliberately rather than assuming telemetry is excluded.

### Explicitly excluded from this application-state job

- `/mnt/cold/media` (movies/TV/other media).
- `/mnt/cold/books` (book library contents; Kavita configuration remains included).
- `/mnt/storage/ollama` (downloaded model files).
- `/var/lib/docker` outside `volumes` (images, container writable layers, container definitions outside the repo).
- Any application data stored in unlisted bind mounts outside the Glasswing repo and selected `/etc` paths. Audit new stacks before relying on backup coverage.

> **Important:** The backup copies *everything* under `/var/lib/docker/volumes`, including volumes for unrelated Docker containers. The cold-stop logic only targets containers whose names begin `glasswing-`. Any other active writer to a volume can make its snapshot inconsistent. Review the scope if non-Glasswing workloads are added.

## 4. Encryption and recovery credentials

The repository password lives outside Docker and outside Infisical so backups remain decryptable if Infisical is lost.

```bash
sudo install -d -m 700 /etc/glasswing/backup
sudo sh -c 'umask 077; openssl rand -base64 48 > /etc/glasswing/backup/restic-password'
sudo chmod 600 /etc/glasswing/backup/restic-password
```

**Run password generation only when initializing a NEW repository. Do not overwrite this file for an existing repository.** Losing the original password means the snapshots cannot be decrypted. Keep a securely stored **offline, independent** recovery copy; don't commit credentials to Git or make Infisical the sole holder of the password.

Restic environment used by Make targets and scripts:

```bash
RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic
RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password
```

Initialize **once**, only after the UUID preflight passes:

```bash
sudo mkdir -p /mnt/cold/glasswing-backups
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic init
```

**Do not rerun `restic init` on an existing repository.** The current system has already been initialized and tested.

## 5. Repository-managed implementation

### Backup controller

`backup/scripts/backup.sh` is the **single entry point** for the cold backup.

Its essential expected controls are:

1. `set -Eeuo pipefail`; run as root.
2. Acquire `/run/glasswing-backup.lock` with `flock -n`.
3. Verify COLD mount UUID, repository and password file; confirm `restic cat config` succeeds.
4. Snapshot names from `docker ps` matching `^glasswing-` (only currently running containers).
5. Install an `EXIT` trap that attempts to restart that captured set, including after a backup error.
6. Stop application containers first; stop PostgreSQL, Redis, ClickHouse, MinIO and SurrealDB backends afterward.
7. Run a single Restic backup with `--host pathfinder --tag glasswing-full` over the paths in Section 3.
8. Attempt to restart backing services first, then applications.

**Review the actual version in Git** before changes or automation. The initial implementation uses `docker stop` / `docker start`, not full Compose orchestration. A successful `docker start` does not guarantee an application is healthy. Its restart trap is *best-effort* and may leave a service unavailable if Docker itself fails.

### Makefile interface

These targets were added to the existing Glasswing Makefile:

```make
.PHONY: backup backup-list backup-check backup-retention

RESTIC_REPO := /mnt/cold/glasswing-backups/restic
RESTIC_PASSWORD := /etc/glasswing/backup/restic-password

backup:
	@sudo bash backup/scripts/backup.sh

backup-list:
	@sudo env \
	  RESTIC_REPOSITORY=$(RESTIC_REPO) \
	  RESTIC_PASSWORD_FILE=$(RESTIC_PASSWORD) \
	  restic snapshots --tag glasswing-full

backup-check:
	@sudo env \
	  RESTIC_REPOSITORY=$(RESTIC_REPO) \
	  RESTIC_PASSWORD_FILE=$(RESTIC_PASSWORD) \
	  restic check

backup-retention:
	@sudo env \
	  RESTIC_REPOSITORY=$(RESTIC_REPO) \
	  RESTIC_PASSWORD_FILE=$(RESTIC_PASSWORD) \
	  restic forget \
	    --tag glasswing-full \
	    --host pathfinder \
	    --keep-daily 7 \
	    --keep-weekly 4 \
	    --keep-monthly 6 \
	    --prune
```

**Safety improvement required before unattended retention:** `backup-retention` above does not perform the same UUID mount guard as `backup.sh`. Do not run it if the COLD mount is unavailable or incorrect; add a dedicated guarded retention script before scheduling it. The example reflects the tested workflow design, not an endorsement of running destructive cleanup without preflight.

### Everyday commands

```bash
cd /home/ravik/src_git/project_glasswing
make backup          # Cold snapshot, downtime for Glasswing services
make backup-list     # List glasswing-full snapshots
make backup-check    # Validate repository structure/integrity
make status          # Review container health after restart
```

`make backup-check` as shown runs the default Restic repository check; it does **not** read all backed-up data. Schedule occasional stronger checks with `restic check --read-data-subset=...` or `--read-data` when practical.

## 6. Standard operating procedure: manual backup

**Schedule during a maintenance window.** Stopping AdGuard Home will interrupt DNS if the network has no independent resolver; Plex, Infisical and monitoring also become temporarily unavailable.

```bash
cd /home/ravik/src_git/project_glasswing

# 1. Confirm mount and disk headroom
findmnt --mountpoint /mnt/cold -o TARGET,SOURCE,UUID,FSTYPE
df -hT /mnt/cold

# 2. Confirm service baseline
docker ps --format 'table {{.Names}}\t{{.Status}}'

# 3. Run the single backup job
make backup

# 4. Verify new snapshot and repository
make backup-list
make backup-check

# 5. Verify services resumed
make status
```

Afterward explicitly test critical services: Infisical, DNS resolution through AdGuard, Plex, Langfuse, OpenObserve, and any other essential stacks. For more confidence compare the originally running container set with the post-backup set.

**Expected snapshot metadata:** tag `glasswing-full`; host `pathfinder`. New backups produce new snapshots; Restic deduplicates unchanged content.

## 7. Retention and capacity

Proposed retention is **7 daily, 4 weekly, 6 monthly snapshots**, using `restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune` with host/tag selection.

- `forget` removes snapshot references according to retention rules.
- `prune` reclaims repository storage no longer referenced by retained snapshots.
- Run retention only against the correct mounted repository, after confirming a successful backup and restore confidence.
- Use `restic forget ... --dry-run` to preview which snapshots would be retained/deleted before first enforcement.
- Monitor COLD free space: logs/telemetry and Plex metadata live inside backed-up Docker volumes and can change significantly.

The retention command is available through `make backup-retention`, but **automatic pruning is not yet confirmed to be configured**.

## 8. Restore procedures

### A. List snapshots and files

```bash
cd /home/ravik/src_git/project_glasswing
make backup-list

sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic ls latest | head -50
```

For an actual incident, prefer an **explicit snapshot ID** from `make backup-list`, not `latest`, to avoid restoring the wrong data set.

### B. Safe isolated configuration restore (performed successfully in initial testing)

```bash
sudo mkdir -p /tmp/glasswing-restore-test

sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore latest \
    --target /tmp/glasswing-restore-test \
    --include /home/ravik/src_git/project_glasswing/stacks/homepage/config

sudo find /tmp/glasswing-restore-test -type f | head -30
```

Restic restores absolute saved paths beneath the supplied target. Verify the files in the restored hierarchy before copying anything back to production.

### C. Full application-state recovery — controlled procedure (not yet exercised end-to-end)

1. Restore or provision Ubuntu, Docker Engine/Compose, Restic and the Glasswing source repository.
2. Mount/attach the backup destination, verify filesystem UUID and retrieve the offline Restic password.
3. **Stop Glasswing containers** and ensure no process writes to target volume data.
4. Take a second safety snapshot/copy of the current target state before overwriting anything.
5. Restore the chosen snapshot to a **staging directory**, inspect its file tree, owners, permissions and volume paths.
6. Restore Docker volume data only while relevant containers are stopped, preserving ownership and permissions.
7. Restore configuration and systemd files carefully; revalidate environment-specific IPs, mount paths, SSH/TLS and secrets permissions.
8. Start database/stateful backend containers first; wait for readiness; then start dependent apps.
9. Verify Infisical identity/secrets, database health, DNS, Plex metadata, Langfuse and critical UI functionality.
10. Record the recovery test and adjust automation based on observed gaps.

**Never run a full `restic restore` directly into `/` or over live `/var/lib/docker/volumes` as a quick fix.** Some applications require version-compatible database images; restoring only parts of a multi-volume service may be inconsistent.

## 9. Known risks and limitations

| Risk | Current mitigation / action |
|---|---|
| COLD drive not mounted | Script checks exact mount UUID before backing up |
| Running databases are inconsistent | Cold-stop the `glasswing-*` containers before snapshot |
| Unrelated writers to `/var/lib/docker/volumes` | Must be discovered; stop/avoid backing up while active |
| Services fail to restart | EXIT trap attempts restart; **manual health validation required** |
| Backup data grows | Retention policy proposed; monitor sizes, add safe pruning |
| Backup repository on same host | **Off-host/offline replica required** for disaster recovery |
| Lost password or Infisical outage | Separate `/etc/glasswing/backup/restic-password` plus offline copy |
| Backup corruption not caught by metadata check | Perform periodic `restic check --read-data` sampling and restore tests |
| Telemetry volume grows | `/var/lib/docker/volumes` captures OpenObserve and collector state; optimize scope if needed |
| OS rebuild incomplete | Backup is not a disk image; document packages, NVIDIA toolkit, Docker setup and networking |
| Timer not yet installed | Implement and test systemd service/timer only after unattended recovery works |

## 10. Planned automation (not yet implemented)

The planned daily schedule is **03:00 Asia/Kolkata**, managed by a systemd service and timer with clear logs, persistent timer behavior, and monitoring/alerting for failures. The schedule **must not be documented as already enabled** until installed and inspected using `systemctl list-timers` and `systemctl status`.

Before enabling automation:

- Replace best-effort restart with verified health/readiness checks and alerting.
- Guard *all* Restic operations, especially pruning, with filesystem UUID validation.
- Verify service order and handle partially failed `docker stop` correctly.
- Add backup success/failure notification and publish job status to monitoring.
- Perform a disaster-recovery dry run using an isolated host or disposable containers.
- Arrange an independent encrypted copy of the repository (external drive, NAS or remote target) and test decryptability off-host.

## 11. Quick reference

| Task | Command |
|---|---|
| Run backup | `make backup` |
| List snapshots | `make backup-list` |
| Basic integrity check | `make backup-check` |
| Inspect service status | `make status` |
| Preview retention | `sudo env RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password restic forget --host pathfinder --tag glasswing-full --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --dry-run` |
| Test restore | See Section 8B |
| Verify COLD UUID | `findmnt --mountpoint /mnt/cold -o TARGET,SOURCE,UUID,FSTYPE` |
| Backup controller | `backup/scripts/backup.sh` |
| Password file | `/etc/glasswing/backup/restic-password` |
| Repository | `/mnt/cold/glasswing-backups/restic` |

---

**Change control:** Update this runbook whenever backup sources, new bind mounts, retention rules, Docker volume locations, service restart ordering or the recovery password handling change. Keep the runbook in the Glasswing repository, but never commit live credentials, password files or unencrypted secret exports.
