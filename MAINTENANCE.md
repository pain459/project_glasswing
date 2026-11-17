# Routine Maintenance — Glasswing

Day-to-day operations for keeping the platform healthy, current, and backed up.

**Host:** `pathfinder` (Ubuntu Server)  
**Repository:** `/home/ravik/src_git/project_glasswing`  
**Homepage:** `http://192.168.68.62:3006`  
**Infisical:** `https://192.168.68.62:8095`  
**Portainer:** `https://192.168.68.62:9443`  
**Dagu:** `http://192.168.68.62:3014`  
**Forgejo:** `http://192.168.68.62:3011`  
**Registry:** `http://192.168.68.62:5000`

---

## Table of Contents

- [Daily checks](#daily-checks)
- [Weekly tasks](#weekly-tasks)
- [Monthly tasks](#monthly-tasks)
- [Image updates](#image-updates)
- [Release pipeline (Forgejo)](#release-pipeline-forgejo)
- [Secret management](#secret-management)
- [Backup operations](#backup-operations)
- [Docker network capacity](#docker-network-capacity)
- [Host address and access map](#host-address-and-access-map)
- [Compose conventions](#compose-conventions)
- [TLS material](#tls-material)
- [Health troubleshooting](#health-troubleshooting)
- [Adding a new stack](#adding-a-new-stack)
- [Rebuilding or restoring](#rebuilding-or-restoring)

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

Renew with the script rather than by hand; it recreates the CA only if it is
missing and keeps the Infisical certificate self-signed so `--cacert` keeps
working:

```bash
./scripts/04-certificates.sh --force
make restart STACK=infisical     # restart, not up: only a mounted file changed
make restart STACK=portainer
make certificates-check
```

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

## Release pipeline (Forgejo)

The Forgejo Actions pipeline is the primary deployment mechanism for stacks that participate in the release flow. It lives in the `glasswing-apps` repository (Forgejo org `glasswing`) and is driven by the `glasswing-release` workflow.

### Architecture

```
Forgejo (control plane)
  └─ glasswing-apps repo
       ├─ .forgejo/workflows/glasswing-release.yml   ← workflow definition
       ├─ scripts/ci/{build,validate,promote,rollback,status}.sh
       └─ stacks/<name>/{build.yaml,compose.yaml,secrets.list,pre-up.sh}

Forgejo Runner (execution)
  └─ glasswing-forgejo-runner (host mode, Docker socket)
       └─ executes jobs in Alpine containers with docker-cli

Local Registry (192.168.68.62:5000)
  └─ glasswing/<stack>:{future,current,previous,rolled-back-*}
```

### Release (build → validate → promote)

**From the Forgejo UI:**

1. Go to **Repositories → glasswing-apps → Actions → glasswing-release → Run workflow**
2. Set inputs:
   - `action`: `release`
   - `stack`: e.g. `vikunja`
   - `version`: e.g. `2.7.1` (the upstream version to pull)
3. Click **Run workflow**
4. Monitor the run: the workflow shows `connectivity → release` jobs
5. Each step logs `[PASS]` or `[FAIL]` — a `[FAIL]` stops the pipeline

**What each step does:**

| Step | Action |
| --- | --- |
| `connectivity` | Verifies the runner is online, Docker is available, and the registry is reachable |
| `build` | Pulls `vikunja/vikunja:2.7.1` from Docker Hub, tags as `glasswing/vikunja:future`, pushes to the local registry |
| `validate` | Runs `docker compose config` with secrets injected, boots a scratch container, probes `/health` |
| `promote` | Retags `previous ← current`, `current ← future`, writes `manifest.yaml`, redeploys the stack, health-checks the live container |

**Via the Forgejo API:**

```bash
# Trigger a release
curl -X POST "http://192.168.68.62:3011/api/v1/repos/glasswing/glasswing-apps/actions/workflows/glasswing-release.yml/dispatches" \
  -H "Authorization: token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ref":"main","inputs":{"action":"release","stack":"vikunja","version":"2.7.1"}}'

# Check the latest run
curl -s "http://192.168.68.62:3011/api/v1/repos/glasswing/glasswing-apps/actions/runs?limit=1" \
  -H "Authorization: token <TOKEN>" | jq '.workflow_runs[0] | {id, status, conclusion}'

# Download job logs (ZIP)
curl -s -o /tmp/run-logs.zip "http://192.168.68.62:3011/api/v1/repos/glasswing/glasswing-apps/actions/runs/<RUN_ID>/logs" \
  -H "Authorization: token <TOKEN>"
unzip /tmp/run-logs.zip
```

### Rollback

Rollback is instant — no rebuild, no pull. It promotes `previous` to `current` and redeploys.

**From the Forgejo UI:**

1. **Repositories → glasswing-apps → Actions → glasswing-release → Run workflow**
2. Set `action`: `rollback`, `stack`: `vikunja`
3. No version input needed
4. The old current is preserved as `glasswing/vikunja:rolled-back-<timestamp>`

**Via the API:**

```bash
curl -X POST "http://192.168.68.62:3011/api/v1/repos/glasswing/glasswing-apps/actions/workflows/glasswing-release.yml/dispatches" \
  -H "Authorization: token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ref":"main","inputs":{"action":"rollback","stack":"vikunja"}}'
```

### Status

Show the current/previous/future state, running container, registry tags, and manifest:

```bash
curl -X POST "http://192.168.68.62:3011/api/v1/repos/glasswing/glasswing-apps/actions/workflows/glasswing-release.yml/dispatches" \
  -H "Authorization: token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ref":"main","inputs":{"action":"status","stack":"vikunja"}}'
```

### Verifying a release

After a release completes:

```bash
# 1. Container is running the new image
docker ps --filter "name=glasswing-vikunja" --format '{{.Image}}'
# Expected: 192.168.68.62:5000/glasswing/vikunja:current

# 2. Health endpoint responds
curl -sf http://192.168.68.62:3031/health && echo "healthy"

# 3. Registry tags are consistent
curl -sf http://192.168.68.62:5000/v2/glasswing/vikunja/tags/list | jq .
# Expected: ["2.7.1", "current", "previous", "future", ...]

# 4. Manifest is up to date (in the glasswing-apps repo)
# Check via Forgejo UI or:
git clone --depth 1 http://192.168.68.62:3011/glasswing/glasswing-apps.git /tmp/ga
cat /tmp/ga/stacks/vikunja/manifest.yaml
```

### Verifying a rollback

```bash
# 1. Container is running the previous version
docker ps --filter "name=glasswing-vikunja" --format '{{.Image}}'

# 2. Health endpoint responds
curl -sf http://192.168.68.62:3031/health && echo "healthy"

# 3. The rolled-back tag exists in the registry
curl -sf http://192.168.68.62:5000/v2/glasswing/vikunja/tags/list | jq .
# Look for a rolled-back-<timestamp> tag
```

### Runner maintenance

#### Check runner status

```bash
# Via Forgejo API
curl -s "http://192.168.68.62:3011/api/v1/orgs/glasswing/actions/runners" \
  -H "Authorization: token <TOKEN>" | jq '.data[] | {id, name, status, version}'

# Via Docker
docker ps --filter "name=glasswing-forgejo-runner" --format '{{.Names}}\t{{.Status}}'
docker logs glasswing-forgejo-runner --tail 20
```

#### Restart the runner

```bash
make up STACK=forgejo-runner
```

#### Rotate the runner token

1. In Forgejo: **Orgs → glasswing → Actions → Runners** → delete the old runner
2. Register a new runner: **Orgs → glasswing → Actions → Runners → New runner**
3. Copy the UUID and token
4. Update `stacks/forgejo-runner/.runner-data/runner-config.yml`:
   ```yaml
   server:
     connections:
       glasswing:
         url: http://192.168.68.62:3011
         uuid: <NEW_UUID>
         token: <NEW_TOKEN>
         labels:
           - glasswing:host
   ```
5. Restart: `make up STACK=forgejo-runner`

#### Update the runner binary

The runner downloads its binary on first boot. To update:

```bash
# Stop the runner
docker stop glasswing-forgejo-runner

# Remove the old binary
rm stacks/forgejo-runner/.runner-data/forgejo-runner

# Start again (downloads the latest version from compose.yaml)
docker start glasswing-forgejo-runner
```

Or edit the version in `stacks/forgejo-runner/compose.yaml` and `make up STACK=forgejo-runner`.

### Secret rotation (Forgejo repo secrets)

The CI pipeline uses these Forgejo repo secrets (set in **Repositories → glasswing-apps → Settings → Actions → Secrets**):

| Secret | Purpose |
| --- | --- |
| `CI_TOKEN` | Forgejo access token for the runner connectivity check and git clone |
| `INFISICAL_URL` | Infisical API endpoint |
| `INFISICAL_PROJECT_ID` | Infisical project ID |
| `INFISICAL_ENV` | Infisical environment (e.g. `prod`) |
| `INFISICAL_CLIENT_ID` | CI-scoped Infisical client ID |
| `INFISICAL_CLIENT_SECRET` | CI-scoped Infisical client secret |

To rotate:

```bash
# Update a secret via the Forgejo API
curl -X PUT "http://192.168.68.62:3011/api/v1/repos/glasswing/glasswing-apps/actions/secrets/<SECRET_NAME>" \
  -H "Authorization: token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"data":"<new-value>"}'
```

Note: the secret name `FORGEJO_TOKEN` is rejected by Forgejo as "invalid secret name" — use `CI_TOKEN` instead.

### Troubleshooting

#### Workflow fails at connectivity

```bash
# Is the runner online?
curl -s "http://192.168.68.62:3011/api/v1/orgs/glasswing/actions/runners" \
  -H "Authorization: token <TOKEN>" | jq '.data[] | {name, status}'
# Expected: status "idle" or "busy"

# Is the runner container running?
docker ps --filter "name=glasswing-forgejo-runner"

# Check runner logs
docker logs glasswing-forgejo-runner --tail 50
```

#### Build fails (pull error)

- Verify the upstream image exists: `docker pull vikunja/vikunja:<version>`
- Check the registry is reachable: `curl -sf http://192.168.68.62:5000/v2/`
- Check `build.yaml` in `glasswing-apps` has the correct image name and registry name

#### Validate fails (health probe)

- The scratch container may not have the right environment variables
- Some services don't have a `/health` endpoint — the probe warns but continues
- Check the scratch container logs: `docker logs glasswing-vikunja-validate` (if it still exists)

#### Promote fails (deploy error)

- Check the stack's compose file in `glasswing-apps` is valid
- Verify Infisical secrets are set: `make secrets-check`
- Check the Docker socket is mounted: `docker exec glasswing-forgejo-runner ls -la /var/run/docker.sock`

#### Rollback fails (no previous image)

- This means there was no prior release — nothing to roll back to
- Check the registry: `curl -sf http://192.168.68.62:5000/v2/glasswing/<stack>/tags/list | jq .`
- If `previous` is missing, do a fresh release instead

#### Runner job environment issues

Common pitfalls (all encountered during the pilot):

| Issue | Fix |
| --- | --- |
| `apk: command not found` | Each job is a fresh Alpine container — install tools per job: `apk add --no-cache docker-cli curl jq bash git` |
| `actions/checkout@v4` fails | Node.js is not available — use manual `git clone` with `CI_TOKEN` |
| `docker compose: unknown command` | Install the compose plugin to `/opt/runner/.docker/cli-plugins/` (runner HOME is `/opt/runner`, not `~`) |
| `--wait` fails | Some images have `healthcheck: test: [NONE]` — use `docker compose up -d` without `--wait` |
| `FORGEJO_TOKEN` rejected as secret name | Use `CI_TOKEN` instead |
| Bind mount permission denied | Use named volumes with `--user 0:0` in the scratch container |

### Expanding to new stacks

To add a new stack to the release pipeline:

1. **Create the stack directory** in `glasswing-apps`:
   ```
   stacks/<name>/
   ├── build.yaml       ← upstream image, registry name, deploy priority
   ├── compose.yaml     ← copied from project_glasswing
   ├── secrets.list     ← copied from project_glasswing
   └── pre-up.sh        ← copied from project_glasswing (if any)
   ```

2. **`build.yaml` format:**
   ```yaml
   name: <stack>
   tier: app
   build-type: external
   images:
     - name: <upstream-image>      # e.g. vikunja/vikunja
       tag: "<default-version>"
       registry-name: glasswing/<stack>
   deploy:
     priority: 50
     depends-on:
       - infisical
     pre-up: pre-up.sh
   secrets: secrets.list
   ```

3. **Push to Forgejo:**
   ```bash
   cd /tmp/glasswing-apps   # or wherever you have a clone
   git add stacks/<name>/
   git commit -m "add <name> to release pipeline"
   git push
   ```

4. **Trigger a release** with the new stack name.

5. **Verify** with the status action and the verification steps above.

### Development and testing

#### Option 1: Local dry-run (no Forgejo)

Run the CI scripts directly on the host:

```bash
# Clone the apps repo
git clone http://192.168.68.62:3011/glasswing/glasswing-apps.git /tmp/glasswing-apps
cd /tmp/glasswing-apps

# Set environment
export STACK=vikunja
export VERSION=2.7.1
export REGISTRY=192.168.68.62:5000
export GLASSWING_HOST_IP=192.168.68.62
export GLASSWING_NETWORK=glasswing

# Load Infisical credentials (local mode)
source .local/infisical/credentials.env   # from project_glasswing

# Run individual steps
bash scripts/ci/build.sh
bash scripts/ci/validate.sh
bash scripts/ci/promote.sh
```

#### Option 2: Forgejo workflow (full pipeline)

Trigger the workflow from the Forgejo UI or API (see above). This is the recommended path — it exercises the full runner environment.

#### Option 3: Scratch container only

Test a specific image version without touching the live stack:

```bash
docker run -d --name test-<stack> \
  --network glasswing \
  -e GLASSWING_HOST_IP=192.168.68.62 \
  -p 3031:3456 \
  192.168.68.62:5000/glasswing/vikunja:future

# Probe
curl -sf http://192.168.68.62:3031/health

# Clean up
docker rm -f test-<stack>
```

### Day-2 operations

#### Registry maintenance

```bash
# List all images and tags
curl -sf http://192.168.68.62:5000/v2/_catalog | jq .
curl -sf http://192.168.68.62:5000/v2/glasswing/vikunja/tags/list | jq .

# Check registry disk usage
docker system df

# Prune unused images (careful — only removes images not used by any container)
docker image prune -a -f
```

#### Forgejo maintenance

```bash
# Check Forgejo is running
make ps STACK=forgejo

# Check Actions are enabled
docker exec -u 1000 glasswing-forgejo forgejo admin config -l server | grep -i actions

# View workflow runs
curl -s "http://192.168.68.62:3011/api/v1/repos/glasswing/glasswing-apps/actions/runs?limit=10" \
  -H "Authorization: token <TOKEN>" | jq '.workflow_runs[] | {id, name, status, conclusion, created_at}'
```

#### Stack lifecycle (add/remove from pipeline)

**Add:** see "Expanding to new stacks" above.

**Remove:**
1. Delete the stack directory from `glasswing-apps`
2. Push to Forgejo
3. Optionally clean up registry tags:
   ```bash
   # List tags to identify what to remove
   curl -sf http://192.168.68.62:5000/v2/glasswing/<stack>/tags/list | jq .
   # Note: the registry API does not support tag deletion — use the registry UI or
   # delete the storage directly (risky, only if you know what you're doing)
   ```

### Quick reference

| Task | How |
| --- | --- |
| Release a new version | Forgejo UI → Run workflow → `release` + stack + version |
| Rollback | Forgejo UI → Run workflow → `rollback` + stack |
| Check status | Forgejo UI → Run workflow → `status` + stack |
| View run logs | Forgejo UI → Actions → click run → click job |
| Restart runner | `make up STACK=forgejo-runner` |
| Check runner status | Forgejo UI → Orgs → glasswing → Actions → Runners |
| Rotate runner token | Forgejo UI → delete runner → register new → update config → restart |
| Rotate CI secrets | Forgejo UI → Repos → glasswing-apps → Settings → Actions → Secrets |
| Local dry-run | `bash scripts/ci/build.sh` etc. (see Development and testing) |

---

## Secret management

### Adding a new secret

1. Add the key name to the stack's `secrets.list`:
   ```
   echo "MY_NEW_SECRET" >> stacks/<stack>/secrets.list
   ```

2. Register the value in Infisical (via UI or API). The wrapper takes the
   secret path first:
   ```bash
   ./scripts/infisical-register.sh /<stack> stacks/<stack>/<stack>.registry
   ```

3. Reference in compose.yaml:
   ```yaml
   environment:
     MY_NEW_SECRET: ${MY_NEW_SECRET:?Required from Infisical}
   ```

4. Deploy: `make up STACK=<stack>`

### Secrets inside URLs

A password placed in a connection URL (`postgresql://user:pass@host/db`) must be
percent-encoded: an `@`, `/`, `:`, `#` or `?` otherwise changes the URL. For every
key ending in `_PASSWORD`, `_SECRET` or `_TOKEN`, `scripts/with-infisical.sh`
also exports `<KEY>_URLENCODED` and leaves the original untouched. Use the
encoded form in the URL and the original everywhere else.

Bootstrap values that are not fetched by that wrapper (`stacks/infisical/.env`)
must themselves be URL-safe; use `openssl rand -hex 24` for
`POSTGRES_PASSWORD`.

### Changing a secret value

1. Update the value in Infisical (UI, or a local `KEY=value` file passed to
   `scripts/infisical-register.sh /<stack> <file>`)
2. Redeploy the stack: `make up STACK=<stack>`

`make secrets-plan` prints which keys are committed configuration and which ones
only exist in Infisical; keep the second list in your offline record.

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

## Docker network capacity

Docker takes every new bridge network from `default-address-pools`. The stock
pools yield roughly **16** networks, and this platform used to create **one per
stack** (27 stack networks on the host). The failure mode is:

```
Error response from daemon: all predefined address pools have been fully subnetted
```

Two layers prevent it.

### 1. One shared network instead of one per stack

Every published service joins the external `glasswing` bridge, created once with
an explicit subnet (`10.89.0.0/24` by default). An explicit subnet does not draw
from the pool, so the platform's own footprint is one shared network plus three
private per-stack networks:

| Network | Owner |
| --- | --- |
| `glasswing` | every front-end service |
| `glasswing-infisical_internal` | Infisical, PostgreSQL, Redis, gateway |
| `glasswing-open-notebook_internal` | Open Notebook and SurrealDB |

```bash
make network                      # create glasswing if missing
```

The name is a single knob: `GLASSWING_NETWORK` is exported by the Makefile and
every stack reads `${GLASSWING_NETWORK:-glasswing}`. Renaming it needs
`make network` **and** `make restart-all` with the same value exported, because
running containers stay attached to the old network.

Host-network stacks (`dagu`, `plex`) declare no network at all, so they create
none.

### 2. A wider address pool for the remaining networks

```bash
make docker-pool          # writes /etc/docker/daemon.json, restarts Docker
./scripts/docker-daemon-config.sh --check    # report drift only
```

The script merges `default-address-pools: [{base: 172.16.0.0/12, size: 24}]` into
`/etc/docker/daemon.json` (4096 networks, clear of the `192.168.68.0/24` LAN),
preserves every other key — including the NVIDIA runtime — and backs up the
previous file. `172.16.0.0/12` at `/24` is the durable fix; existing networks
keep the subnets they already have.

Restarting Docker drops every container for a few seconds; `restart: unless-stopped`
brings them back.

### Verify

```bash
make doctor
docker network ls | wc -l
docker info --format '{{.ServerVersion}}'
```

`make doctor` fails when the pool is unset or exhausted, when two stacks claim
the same host port, when a container is in a restart loop, and when Infisical is
not healthy enough for secret injection. It warns about services bound to
`0.0.0.0` and about networks no container is using.

Run it as your normal user. On Debian and Ubuntu `/etc/docker/daemon.json` is
root-only, so when the file cannot be read the script creates a throwaway
network and inspects the subnet the daemon hands out, which reports the pool
that is actually in effect instead of failing.

### Reclaim after a migration

Old per-stack networks are not deleted by `docker compose up`; they linger until
nothing references them:

```bash
docker network ls --filter dangling=true
docker network prune -f        # only removes unused networks
```

## Host address and access map

There is no internal DNS: every service is reached as `IP:port`. One variable,
`GLASSWING_HOST_IP`, decides that IP for the whole platform.

```bash
# resolution order used by the Makefile
make GLASSWING_HOST_IP=192.168.68.50 ...   # 1. command line or the shell
cat stacks/infisical/.env                  # 2. host-local bootstrap file (gitignored)
GLASSWING_HOST_IP=192.168.68.62
```

Infisical cannot provide its bootstrap configuration, so the value must exist in
`stacks/infisical/.env` (or the environment) before `make infisical`. Every
compose file then requires it:

```yaml
ports:
  - "${GLASSWING_HOST_IP:?GLASSWING_HOST_IP is required}:3006:3000"
```

The same value is registered in `/global`, so stacks started through
`with-infisical.sh` receive it as a runtime variable too. Nothing binds to
`0.0.0.0` except the Dagu and Plex host-network services, which expose their own
ports.

### The address reservation is mandatory

Because every binding is pinned, the host must always own that address. Configure it
as a router DHCP reservation (preferred) or a static address on the interface; the
platform treats anything else as a fault.

`stacks/infisical/.env` is the single place the address is written. Before starting
anything, `scripts/netcheck.sh` compares it against the live host addresses and stops
on a mismatch — strict, exact-address comparison, no subnet loosening:

```bash
./scripts/netcheck.sh                 # check the configured address
./scripts/netcheck.sh 192.168.68.62   # check an explicit address
```

`make up`, `make restart`, `make rebuild`, `make update`, and `make restart-all` run
this gate as a prerequisite; `make doctor` reports the same check. The guard exists
because the failure it prevents is silent: Docker stores the address in
`HostConfig.PortBindings`, so when the address is missing the endpoint is never
created, yet the container still reports as running with no network at all (the
2026-11-13 incident: the host booted on `192.168.29.97/24` and eleven stacks came up
networkless).

Changing the address is a three-step operation, in this order:

```bash
# 1. reserve the new address at the network level, then update the single file
vi stacks/infisical/.env              # GLASSWING_HOST_IP=<new address>
# 2. recreate every container (a restart reuses the stored binding)
make restart-all
# 3. regenerate the table and the certificates
make access
./scripts/04-certificates.sh --force
```

### ACCESS.md

`make access` regenerates [ACCESS.md](ACCESS.md) from the `ports:` entries, sorted
by host port, with the scheme (`http`, `https`, `dns`, `ssh`, `postgres`) each
binding needs. It reads the same variable, so the table always shows the address
the platform actually binds.

```bash
make access          # rewrite ACCESS.md
make access-check    # exit 1 with a diff when ACCESS.md is stale
```

Regenerate after adding, removing, or renumbering a port; `make access-check` is
the guard against a table that lies. `make doctor` also fails when a compose file
hardcodes an IPv4 address instead of `${GLASSWING_HOST_IP}`.

## Compose conventions

Every stack is one file, `stacks/<stack>/compose.yaml`; that path is what the
Makefile uses to discover stacks. Settings that must never drift live in
`stacks/base.yaml`:

| Base service | Provides |
| --- | --- |
| `base` | `restart: unless-stopped`, json-file logging rotated at 5 MB × 2 |
| `hardened` | `base` plus `security_opt: [no-new-privileges:true]` |

A service opts in with three lines:

```yaml
services:
  homepage:
    extends:
      file: ../base.yaml
      service: base
```

Rules:

- `base` is the default. `hardened` is used only where the stack already declared
  `no-new-privileges`, because it also blocks setuid and setgid helpers.
- `extends` merges the service block only. Each compose file still declares its
  own top-level `networks:` block, its ports, and everything stack-specific.
- A service keeps an explicit `restart`, `logging` or `security_opt` when it needs
  a different value: `init-permissions` sets `restart: "no"`, and Steel rotates
  at 10 MB × 3.
- Changing retention or the restart policy is one edit in `stacks/base.yaml` and a
  `make restart-all`; no stack lists it any more.
- Only the stack's public-facing service joins the shared `glasswing` network.
  Backend services (`postgres`, `redis`, `clickhouse`, `minio`) stay on the
  stack's own `internal` network. Docker DNS resolves a bare name to *any*
  container carrying it on a shared network, so a second `postgres` on
  `glasswing` sends `DATABASE_URL` to the wrong database — which is exactly how
  Langfuse ended up in a restart loop. `make doctor` now fails on duplicate
  service names across stacks on that network.

The refactor did not change any container's privileges. It did standardise log
rotation: 35 services that previously had no limit now rotate at 5 MB × 2, which
is what the disk-pressure incidents needed.

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
make restart-all          # Infisical, Ollama, then the rest JOBS at a time
make doctor               # confirm nothing came back unhealthy
```

`scripts/verify-stacks.sh` still exists for a slower, stack-by-stack
down/up cycle with a health check after each one; it takes the stack list from
the Makefile, so it cannot miss a newly added stack.

### TLS material

Three certificates are host-local and gitignored, so they are recreated on a
fresh clone rather than restored from Git:

| File | Purpose | Issuer |
| --- | --- | --- |
| `.local/ca/glasswing-ca.{key,crt}` | private CA for LAN services | self |
| `stacks/infisical/tls/{cert.pem,key.pem}` | nginx gateway on `:8095` | self-signed, deliberately |
| `stacks/portainer/certs/{portainer.crt,key}` | Portainer on `:9443` | Glasswing CA |

`make certificates` creates what is missing, `make certificates-check` fails when
a certificate does not cover `GLASSWING_HOST_IP` or expires within 21 days, and
`./scripts/04-certificates.sh --force` reissues everything after an IP change.

---

## Adding a new stack

1. Create directory: `mkdir stacks/<name>`
2. Create `stacks/<name>/compose.yaml` with `name: glasswing-<name>`
3. Create `stacks/<name>/secrets.list` (even if empty, with a comment)
4. If the stack needs secrets, create `stacks/<name>/<name>.registry` with `KEY=value` pairs
5. Register secrets: `./scripts/infisical-register.sh /<name> stacks/<name>/<name>.registry`
6. Deploy: `make up STACK=<name>`
7. Regenerate the access map: `make access` (doctor and ACCESS.md are the cross-checks)
8. Commit everything to git

`make restart-all` and `scripts/verify-stacks.sh` both enumerate
`stacks/*/compose.yaml`, so a new stack needs no central registration.

---

## Rebuilding or restoring

| Situation | Document |
| --- | --- |
| New hardware, no data to keep | [REBUILD.md](REBUILD.md) — fresh secrets, fresh volumes, verification checklist |
| Reinstall on the same disks, keep data | [DR_RUNBOOK.md](DR_RUNBOOK.md) — restore volumes and the repository from Restic |
| One stack is broken | [DR_RUNBOOK.md#partial-recovery](DR_RUNBOOK.md#partial-recovery) — restore that volume only |
| Not sure what the host needs | [REBUILD.md#phase-1--host-and-user](REBUILD.md#phase-1--host-and-user) — packages, GPU, Docker, storage |

---

## Telegram inbox (#file)

Send a photo or PDF to the Glasswing bot with a `#file` caption to ingest
it into Paperless-ngx. The situation listener handles this — no separate
service needed.

### Grammar

```
#file                          → ingest, tag=others, no title
#file tag=bills                → ingest, tag=bills
#file tag=cards subject=Oct   → ingest, tag=cards, subject="Oct"
#file tag=bills corr=HSBC     → ingest, tag=bills, correspondence="HSBC"
#file electricity bill Oct    → ingest, tag=others, title="electricity bill Oct"
#file tag=bills electricity  → ingest, tag=bills, title="electricity"
```

- `tag=` must be one of the valid tags (see below). Invalid tags are rejected.
- `corr=` or `correspondence=` sets the Paperless correspondence field.
- `subject=` sets the Paperless subject field.
- Remaining text becomes the document title.
- Omit `tag=` to default to `others`.

### Valid tags

Defined in `stacks/situation/paperless-tags.list` (one per line):

```
bills
cards
invites
others
```

To change the set: edit the file, rebuild the situation image
(`docker build -t glasswing/situation:latest stacks/situation/`), and restart
the listener (`docker compose -f stacks/situation/compose.yaml restart situation-listener`).
Tags are auto-created in Paperless on first use — no manual setup needed.

### Offline behavior

- Messages sent while the server is off are queued by Telegram (up to 24 hours).
- When the server returns, the listener sends a catch-up summary before
  processing the backlog.
- Photos older than 5 minutes at processing time are tagged `ingested_late`
  in addition to the user-chosen tag (e.g. `bills` + `ingested_late`).
- Paperless' built-in hash dedup prevents double-ingestion of identical files.
- If the server is off for more than 24 hours, Telegram drops the oldest
  updates — they are lost, not delayed.

### Liveness

Send `/ping` to check if the bot is alive and whether Paperless is reachable.

### Limits

- Max file size: 10 MB (Telegram Bot API cap is 20 MB; we enforce 10 MB).
- Allowed types: photos (JPG/HEIC), PDFs.
- One tag per document (v1). Multiple tags can be added later.

### Setup (one-time)

1. Create an API token in Paperless: **Settings → API tokens → Create token**.
2. Add the token to Infisical under `/situation` as `PAPERLESS_API_TOKEN`.
3. Rebuild and restart the situation listener.

## Quick reference

| Task | Command |
|---|---|
| Show all containers | `make status` |
| Start a stack | `make up STACK=name` |
| Stop a stack | `make down STACK=name` |
| Follow logs | `make logs STACK=name` |
| Validate config | `make check STACK=name` |
| Restart all stacks | `make restart-all` (`JOBS=n` for parallelism, default 4) |
| Check secret injection | `make secrets-check` |
| Plan/verify secrets | `make secrets-plan` |
| Recreate TLS material | `make certificates` / `make certificates-check` |
| Run backup | `make backup` |
| List snapshots | `make backup-list` |
| Check image updates | `./scripts/check-updates.sh` |
| Trigger automated updates | `./scripts/update-stacks.sh` |
| Bump image version | `./scripts/bump-image.sh <stack> <old> <new>` |
| Inspect running images | `./scripts/inspect-images.sh` |
| Verify all stacks | `make doctor` (fast) or `./scripts/verify-stacks.sh` (stack-by-stack) |
| Rebuild / restore | [REBUILD.md](REBUILD.md) / [DR_RUNBOOK.md](DR_RUNBOOK.md) |
| GPU preflight | `make ai-preflight` |
| Dagu Web UI | `http://192.168.68.62:3014` |
| Forgejo (CI control plane) | `http://192.168.68.62:3011` |
| Release a stack | Forgejo UI → glasswing-apps → Actions → Run workflow → `release` |
| Rollback a stack | Forgejo UI → glasswing-apps → Actions → Run workflow → `rollback` |
| Check release status | Forgejo UI → glasswing-apps → Actions → Run workflow → `status` |
| Restart CI runner | `make up STACK=forgejo-runner` |
| Local registry | `http://192.168.68.62:5000` |
