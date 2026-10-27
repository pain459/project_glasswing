# Routine Maintenance — Glasswing

Day-to-day operations for keeping the platform healthy, current, and backed up.

**Host:** `pathfinder` (Ubuntu Server)  
**Repository:** `/home/ravik/src_git/project_glasswing`  
**Homepage:** `http://192.168.68.62:3006`  
**Infisical:** `https://192.168.68.62:8095`  
**Portainer:** `https://192.168.68.62:9443`  
**Dagu:** `http://192.168.68.62:3014`

---

## Table of Contents

- [Daily checks](#daily-checks)
- [Weekly tasks](#weekly-tasks)
- [Monthly tasks](#monthly-tasks)
- [Image updates](#image-updates)
- [Secret management](#secret-management)
- [Backup operations](#backup-operations)
- [Health troubleshooting](#health-troubleshooting)
- [Adding a new stack](#adding-a-new-stack)

---

## Daily checks

### Quick health scan (2 minutes)

```bash
cd /home/ravik/src_git/project_glasswing

# 1. All containers running?
make status

# 2. Any containers restarting or exited?
docker ps --filter "status=restarting" --filter "status=exited" -q | wc -l

# 3. Disk space headroom
df -hT / /mnt/storage /mnt/cold
```

### Homepage dashboard

Open `http://192.168.68.62:3006` and check:
- **Top widgets** — Glances shows real host CPU, memory, disk I/O, network, temperature
- **Service cards** — green status dots mean services are reachable
- **Disk widgets** — `/`, `/mnt/storage`, `/mnt/cold` all have headroom

### Portainer dashboard

Open `https://192.168.68.62:9443` and check:
- **Containers** tab — all `glasswing-*` containers should be `Up`
- **Images** tab — orange badges indicate newer images available
- **Volumes** tab — no unexpectedly large volumes

### Observability sanity

- **OpenObserve** (`:3018`) — confirm logs and metrics are arriving for the last hour
- **Beszel** (`:8090`) — CPU, memory, disk within normal ranges
- **Uptime Kuma** (`:3003`) — no monitors in `Down` state

---

## Weekly tasks

### 1. Run a backup

```bash
cd /home/ravik/src_git/project_glasswing

# Confirm COLD mount and disk space
findmnt --mountpoint /mnt/cold -o TARGET,SOURCE,UUID,FSTYPE
df -hT /mnt/cold

# Run backup (stops all glasswing-* containers briefly)
make backup

# Verify new snapshot appeared
make backup-list

# Verify services resumed
make status
```

**Schedule:** Pick a low-traffic window. AdGuard downtime interrupts DNS if no fallback resolver is configured.

### 2. Check for image updates

#### Automated updates (Dagu)

The Dagu DAG `staged-image-update` runs every Sunday at 05:00 and handles updates for stacks with mutable tags automatically:

- **Mutable tags** (`:latest`, `:public`, `:lts`, etc.): Pulls new image, restarts, verifies health for ~5 min, rolls back if broken
- **Pinned tags**: Checks registry for newer versions and reports availability
- **Critical infrastructure** (Infisical, OTel, Vector, Postgres, Dagu): Excluded — update manually

Review results in the Dagu Web UI at `http://192.168.68.62:3014` or trigger a manual run. The DAG always succeeds; per-stack failures are logged.

#### Manual updates (pinned-tag stacks)

For stacks with pinned tags that Dagu reports as having updates available:

```bash
# Terminal: compare running images against registry
./scripts/check-updates.sh

# Or: browse Portainer at :9443, check for orange update badges
```

If updates are available:
1. Review release notes for the specific version
2. Bump the tag: `./scripts/bump-image.sh <stack> <old-tag> <new-tag>`
3. Commit: `git add stacks/<stack>/compose.yaml && git commit -m "bump: <stack> to <new-tag>"`
4. Deploy: `make up STACK=<stack>`
5. Verify: `make check STACK=<stack>`

### 3. Verify secret injection

```bash
make secrets-check
```

This confirms Infisical authentication works and secrets load correctly.

---

## Monthly tasks

### 1. Restic repository integrity check

```bash
# Basic check (fast)
make backup-check

# Deeper check — sample data read (slower, more thorough)
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic check --read-data-subset=10%
```

### 2. Apply retention policy

```bash
# Preview what would be kept/deleted
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic forget \
    --host pathfinder --tag glasswing-full \
    --keep-daily 7 --keep-weekly 4 --keep-monthly 6 \
    --dry-run

# Apply (after reviewing the preview)
make backup-retention
```

**Warning:** Only run retention after confirming COLD is mounted with the correct UUID and a recent backup succeeded.

### 3. Review and prune unused Docker images

```bash
# See dangling images
docker image ls -f "dangling=true"

# Remove dangling images (safe — pinned images are retained)
docker image prune -f

# Remove images not used by any container
docker image prune -a -f
```

### 4. Certificate expiry check

```bash
# Portainer certificate
openssl x509 -in stacks/portainer/certs/portainer.crt -noout -dates

# Infisical certificate
openssl x509 -in stacks/infisical/tls/cert.pem -noout -dates
```

Renew before expiry using the procedures in `stacks/portainer/certificate_instructions.md`.

### 5. Test restore (isolated)

```bash
# Restore a small subset to a temp directory
sudo mkdir -p /tmp/glasswing-restore-test

sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore latest \
    --target /tmp/glasswing-restore-test \
    --include /home/ravik/src_git/project_glasswing/stacks/homepage/config

# Verify files exist
sudo find /tmp/glasswing-restore-test -type f | head -20

# Clean up
sudo rm -rf /tmp/glasswing-restore-test
```

---

## Image updates

### Pinning policy

Most images use explicit version tags for stability. A few stacks use mutable tags (`:latest`, `:public`, `:4`, etc.) and are eligible for automatic updates through the Dagu DAG.

Critical infrastructure stacks (Infisical, OTel Collector, Vector, Postgres, Dagu) are excluded from automatic updates regardless of tag type.

### Automated updates (Dagu)

The `staged-image-update` DAG runs weekly via the Dagu scheduler. It uses `scripts/update-stacks.sh` inside the Dagu container (which has the Docker socket and project directory mounted):

```
For each eligible stack:
  1. Pull latest image (mutable tags only)
  2. Restart via docker compose
  3. Healthcheck: wait up to 120s for service to respond
  4. Monitor: observe for 180s to catch delayed failures
  5. Rollback: if healthcheck or monitor fails, restart with old image (--pull never)
```

To trigger manually:
- Open Dagu Web UI at `http://192.168.68.62:3014`
- Click the `staged-image-update` DAG → Run
- Or run the script directly: `./scripts/update-stacks.sh`

### Manual update workflow (pinned tags)

```
1. Discover updates
   ./scripts/check-updates.sh          # terminal
   or Portainer :9443 → Images tab     # UI
   or Dagu :3014 → DAG run logs        # automated check results

2. Review release notes
   Check GitHub releases or project changelog

3. Bump the tag
   ./scripts/bump-image.sh ollama 0.40.11 0.40.12
   # Shows diff, edits compose.yaml in-place

4. Commit to git
   git add stacks/ollama/compose.yaml
   git commit -m "bump: ollama to 0.40.12"

5. Deploy
   make up STACK=ollama

6. Verify
   make check STACK=ollama

7. Rollback if needed
   git revert HEAD
   make up STACK=ollama
```

### Inspect running images

```bash
# Show what image each stack container is actually running
./scripts/inspect-images.sh

# Show a specific stack
./scripts/inspect-images.sh ollama
```

### Downgrading an image

Same workflow as upgrading — just bump to an older tag:

```bash
./scripts/bump-image.sh flowise 3.2.0 3.1.3
git add stacks/flowise/compose.yaml
git commit -m "revert: flowise to 3.1.3 (3.2.0 unstable)"
make up STACK=flowise
```

---

## Secret management

### Adding a new secret

1. Add the key name to the stack's `secrets.list`:
   ```
   echo "MY_NEW_SECRET" >> stacks/<stack>/secrets.list
   ```

2. Register the value in Infisical (via UI or API):
   ```bash
   ./scripts/infisical-register.sh stacks/<stack>/<stack>.registry
   ```

3. Reference in compose.yaml:
   ```yaml
   environment:
     MY_NEW_SECRET: ${MY_NEW_SECRET:?Required from Infisical}
   ```

4. Deploy: `make up STACK=<stack>`

### Changing a secret value

1. Update the value in Infisical (UI or `scripts/infisical-register.sh`)
2. Redeploy the stack: `make up STACK=<stack>`

### Adding a global variable

1. Add to `stacks/global-secrets.list`
2. Register via `stacks/global-secrets.registry` and `scripts/infisical-register.sh`
3. All stacks pick it up on next `make up`

---

## Backup operations

### Run a backup

```bash
make backup
```

This stops all `glasswing-*` containers, creates a Restic snapshot, then restarts them.

### List snapshots

```bash
make backup-list
```

### Verify repository health

```bash
make backup-check
```

### Apply retention

```bash
make backup-retention
```

**Always verify COLD mount UUID before running retention.**

### Full backup documentation

See [backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md](backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md) for scope, encryption, restore procedures, and known risks.

---

## Health troubleshooting

### Container won't start

```bash
# Check logs
make logs STACK=<stack>

# Validate compose config
make check STACK=<stack>

# Check if secrets loaded
make secrets-check
```

### Secret injection fails

```bash
# Verify Infisical is running
make ps STACK=infisical

# Verify credentials file exists and is readable
ls -la .local/infisical/credentials.env

# Verify certificate
ls -la stacks/infisical/tls/cert.pem

# Test injection manually
make secrets-injection-check
```

### GPU not accessible

```bash
# Run preflight
make ai-preflight

# Check NVIDIA driver
nvidia-smi

# Check Docker GPU runtime
docker info --format '{{json .Runtimes}}'
```

### Disk space issues

```bash
# Check all mounts
df -hT / /mnt/storage /mnt/cold

# Check Docker disk usage
docker system df

# Clean unused Docker resources
docker system prune -a
```

### Full platform restart

```bash
# Restart all stacks in dependency order
./scripts/verify-stacks.sh

# Or via Makefile
make restart-all
```

---

## Adding a new stack

1. Create directory: `mkdir stacks/<name>`
2. Create `stacks/<name>/compose.yaml` with `name: glasswing-<name>`
3. Create `stacks/<name>/secrets.list` (even if empty, with a comment)
4. If the stack needs secrets, create `stacks/<name>/<name>.registry` with `KEY=value` pairs
5. Register secrets: `./scripts/infisical-register.sh stacks/<name>/<name>.registry`
6. Deploy: `make up STACK=<name>`
7. Add to `scripts/verify-stacks.sh` STACKS array if it should be part of full restarts
8. Commit everything to git

---

## Quick reference

| Task | Command |
|---|---|
| Show all containers | `make status` |
| Start a stack | `make up STACK=name` |
| Stop a stack | `make down STACK=name` |
| Follow logs | `make logs STACK=name` |
| Validate config | `make check STACK=name` |
| Restart all stacks | `make restart-all` |
| Check secret injection | `make secrets-check` |
| Run backup | `make backup` |
| List snapshots | `make backup-list` |
| Check image updates | `./scripts/check-updates.sh` |
| Trigger automated updates | `./scripts/update-stacks.sh` |
| Bump image version | `./scripts/bump-image.sh <stack> <old> <new>` |
| Inspect running images | `./scripts/inspect-images.sh` |
| Verify all stacks | `./scripts/verify-stacks.sh` |
| GPU preflight | `make ai-preflight` |
| Dagu Web UI | `http://192.168.68.62:3014` |
