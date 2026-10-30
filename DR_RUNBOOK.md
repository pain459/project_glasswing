# Disaster Recovery — Glasswing

Step-by-step procedures for recovering the Glasswing platform after a total failure: hardware replacement, OS reinstall, or complete data loss.

For a **clean install with nothing to restore**, use [REBUILD.md](REBUILD.md)
instead. This document assumes you have a Restic snapshot and want the old data
back.

**Host:** `pathfinder` (Ubuntu Server)  
**Repository:** `/home/ravik/src_git/project_glasswing`  
**Backup repository:** `/mnt/cold/glasswing-backups/restic`  
**Restic password:** `/etc/glasswing/backup/restic-password` (offline copy required)

---

## Table of Contents

- [Recovery scenarios](#recovery-scenarios)
- [Prerequisites](#prerequisites)
- [Phase 1 — Restore the host](#phase-1--restore-the-host)
- [Phase 2 — Restore storage](#phase-2--restore-storage)
- [Phase 3 — Restore the repository](#phase-3--restore-the-repository)
- [Phase 4 — Restore credentials](#phase-4--restore-credentials)
- [Phase 5 — Restore application state](#phase-5--restore-application-state)
- [Phase 6 — Bring up the platform](#phase-6--bring-up-the-platform)
- [Phase 7 — Verify](#phase-7--verify)
- [Partial recovery](#partial-recovery)
- [Known risks](#known-risks)

---

## Recovery scenarios

| Scenario | What's lost | Recovery path |
|---|---|---|
| **OS crash / reinstall** | OS, Docker, config | Phases 1–7 |
| **System disk failure** | OS, Docker, repo, volumes | Phases 1–7 + Restic restore |
| **Full machine replacement** | Everything | Phases 1–7 + Restic restore + new hardware setup |
| **Single stack failure** | One service | [Partial recovery](#partial-recovery) |
| **Infisical data loss** | Secrets | Restore from backup or re-enter manually |

**Critical assumption:** The Restic backup repository on the COLD disk is intact, and you have an offline copy of the Restic password. If the COLD disk is also lost, recovery depends on an off-host backup copy (not yet configured).

---

## Prerequisites

Before starting recovery, gather:

1. **Restic password** — offline copy of the password used to encrypt the backup repository
2. **Infisical machine identity** — `INFISICAL_CLIENT_ID` and `INFISICAL_CLIENT_SECRET` (if Infisical data was lost)
3. **Glasswing CA private key** — `.local/ca/glasswing-ca.key` (for TLS certificates)
4. **Git access** — ability to clone the Glasswing repository
5. **Replacement hardware** — or the same machine with a new system disk

---

## Phase 1 — Restore the host

### 1.1 Install Ubuntu Server

Install the same Ubuntu Server release that was running. Minimal installation is fine.

```bash
# Create the working user
sudo adduser ravik
sudo usermod -aG sudo ravik
```

### 1.2 Install baseline tools

```bash
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl gnupg git jq rsync unzip zip \
  vim nano tree htop btop tmux lsof \
  dnsutils iproute2 pciutils nvme-cli smartmontools \
  python3 python3-venv python3-pip openssh-server ufw acl
sudo systemctl enable --now ssh
```

### 1.3 Install Docker Engine

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")"

printf 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: %s\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n' "$CODENAME" "$ARCH" | \
  sudo tee /etc/apt/sources.list.d/docker.sources

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now containerd docker

# Add user to docker group
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker ravik
```

**Reconnect the SSH session** after docker group change for it to take effect.

### 1.4 Install Restic

```bash
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y restic
restic version
```

### 1.5 Install NVIDIA driver and GPU toolkit

```bash
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ubuntu-drivers-common pciutils
sudo ubuntu-drivers install
sudo reboot
```

After reboot, verify:
```bash
nvidia-smi
```

Then install the NVIDIA Container Toolkit:
```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Verify GPU access from containers:
```bash
docker run --rm --gpus all nvidia/cuda:12.6.0-base-ubuntu22.04 nvidia-smi
```

---

## Phase 2 — Restore storage

### 2.1 Identify disks

```bash
# List all block devices and their UUIDs
sudo blkid

# Expected UUIDs:
# COLD:  9070ff10-5016-4b6f-a148-b5ed1ad61ae6  → /mnt/cold
# STORAGE: 83259698-d2a6-45e7-b503-7f106b746b39  → /mnt/storage
```

### 2.2 Mount disks

```bash
sudo mkdir -p /mnt/storage /mnt/cold

# Mount COLD disk (has backups)
sudo mount /dev/disk/by-uuid/9070ff10-5016-4b6f-a148-b5ed1ad61ae6 /mnt/cold

# Mount STORAGE disk (has application data)
sudo mount /dev/disk/by-uuid/83259698-d2a6-45e7-b503-7f106b746b39 /mnt/storage

# Verify
findmnt --mountpoint /mnt/cold -o TARGET,SOURCE,UUID,FSTYPE
findmnt --mountpoint /mnt/storage -o TARGET,SOURCE,UUID,FSTYPE
```

### 2.3 Make mounts persistent

```bash
# Add to /etc/fstab if not present
sudo bash -c 'cat >> /etc/fstab'
UUID=9070ff10-5016-4b6f-a148-b5ed1ad61ae6 /mnt/cold ext4 defaults,noatime 0 2
UUID=83259698-d2a6-45e7-b503-7f106b746b39 /mnt/storage ext4 defaults,noatime 0 2
```

### 2.4 Verify backup repository is accessible

```bash
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic snapshots
```

If the password file doesn't exist yet, see [Phase 4](#phase-4--restore-credentials).

---

## Phase 3 — Restore the repository

### 3.1 Clone the repository

```bash
cd ~/src_git
git clone <your-git-remote-url> project_glasswing
cd project_glasswing
```

### 3.2 Check the latest commit

```bash
git log --oneline -5
```

If the repository was not pushed before the failure, you may need to restore it from Restic (see Phase 5).

---

## Phase 4 — Restore credentials

### 4.1 Restic password

Place the Restic password file where the backup scripts expect it:

```bash
sudo mkdir -p /etc/glasswing/backup
# Copy your offline Restic password to this file:
# /etc/glasswing/backup/restic-password
sudo chmod 600 /etc/glasswing/backup/restic-password
```

Verify:
```bash
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic snapshots
```

### 4.2 Infisical machine identity

The file `.local/infisical/credentials.env` contains Infisical API credentials. This is git-ignored and must be restored from your offline copy or re-created.

```bash
mkdir -p .local/infisical
# Copy credentials.env from offline backup
# It should contain INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET
chmod 600 .local/infisical/credentials.env
```

If Infisical data was lost and you need to re-register the machine, use the Infisical admin UI to generate new credentials.

### 4.3 Glasswing CA key

The file `.local/ca/glasswing-ca.key` is the private CA key used to sign TLS certificates. This is git-ignored and must be restored from your offline copy.

```bash
mkdir -p .local/ca
# Copy glasswing-ca.key and glasswing-ca.crt from offline backup
chmod 600 .local/ca/glasswing-ca.key
```

If the CA key is lost, you must regenerate it and re-issue every leaf
certificate. One command does both:

```bash
./scripts/04-certificates.sh --force   # new CA + Infisical + Portainer
make certificates-check
```

If the platform is already running, restart the two services that mount the
certificates (`up` is a no-op: the Compose config did not change, only the
mounted files):

```bash
make restart STACK=infisical
make restart STACK=portainer
```

On a fresh restore you are still in Phase 4; Phase 6 starts both with the new
certificates.

Clients that trusted the old CA must install the new
`.local/ca/glasswing-ca.crt` (fingerprint and trust steps in
[stacks/portainer/certificate_instructions.md](stacks/portainer/certificate_instructions.md#step-4--trust-the-glasswing-ca-on-your-workstation)).

### 4.4 Infisical bootstrap file

`stacks/infisical/.env` is gitignored and holds the values Infisical cannot read
from itself: `GLASSWING_HOST_IP`, `SITE_URL`, `POSTGRES_PASSWORD`,
`ENCRYPTION_KEY`, `AUTH_SECRET`. Restore it from the snapshot — never generate
new values for an existing database, because the password and encryption key
must match it:

```bash
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore <snapshot-id> \
    --target /tmp/glasswing-restore-env \
    --include /home/ravik/src_git/project_glasswing/stacks/infisical/.env

install -m 600 /tmp/glasswing-restore-env/home/ravik/src_git/project_glasswing/stacks/infisical/.env \
  stacks/infisical/.env
```

If this is a **new** deployment rather than a restore, copy
`stacks/infisical/.env.example` and follow [REBUILD.md](REBUILD.md#31-infisical-bootstrap-file).

### 4.5 TLS material

The CA key and the two stack certificate directories are gitignored; they come
back with the repository snapshot, or you regenerate them:

```bash
./scripts/04-certificates.sh --force
make certificates-check
```

The Infisical certificate is self-signed on purpose: `with-infisical.sh` and the
documented `curl` calls verify it with `--cacert stacks/infisical/tls/cert.pem`.
A new CA also changes Portainer's issuer, so clients must trust the new
`.local/ca/glasswing-ca.crt`.

---

## Phase 5 — Restore application state

### 5A. If STORAGE disk is intact

If the STORAGE disk (`/mnt/storage`) survived, Docker volumes are already in place. Skip to Phase 6.

### 5B. If Docker volumes need restoration from Restic

Restore into a staging directory first. Never restore straight over
`/var/lib/docker/volumes` while Docker is running: a partial or
version-mismatched volume is worse than a missing one.

```bash
make backup-list          # pick an explicit snapshot ID, not `latest`

sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore <snapshot-id> \
    --target /mnt/storage/glasswing-restore \
    --include /var/lib/docker/volumes
```

Inspect the restored tree, then copy it into place with Docker stopped:

```bash
sudo find /mnt/storage/glasswing-restore/var/lib/docker/volumes -maxdepth 1 | head
sudo systemctl stop docker docker.socket
sudo rsync -aHAX --info=progress2 \
  /mnt/storage/glasswing-restore/var/lib/docker/volumes/ /var/lib/docker/volumes/
sudo systemctl start docker
```

`restic restore` drops the absolute path beneath the target, which is why the
source ends in `/var/lib/docker/volumes/`. Staging on `/mnt/storage` keeps the
copy off the (possibly small) root filesystem.

### 5C. If the repository and its host-local files need restoration

```bash
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore <snapshot-id> \
    --target /mnt/storage/glasswing-restore \
    --include /home/ravik/src_git/project_glasswing
```

The restored tree contains `.local/infisical/credentials.env`, `.local/ca/`,
`stacks/infisical/.env`, `stacks/infisical/tls/` and `stacks/portainer/certs/`.
If you already cloned a fresh copy, copy those host-local paths into it instead
of replacing the directory:

```bash
RESTORED=/mnt/storage/glasswing-restore/home/ravik/src_git/project_glasswing
rsync -a "$RESTORED/.local/" .local/
rsync -a "$RESTORED/stacks/infisical/tls/" stacks/infisical/tls/
rsync -a "$RESTORED/stacks/portainer/certs/" stacks/portainer/certs/
cp -a "$RESTORED/stacks/infisical/.env" stacks/infisical/.env
```

## Phase 6 — Bring up the platform

### 6.1 Start in dependency order

```bash
cd /home/ravik/src_git/project_glasswing

make docker-pool     # only if /etc/docker/daemon.json was not restored
make network         # shared 'glasswing' bridge with its explicit subnet
make restart-all     # Infisical, Ollama, then the other stacks JOBS at a time
```

`make restart-all` encodes the only ordering that matters: Infisical first
(every other stack needs its secrets), Ollama second (the native coding agent's
inference backend), everything else in parallel. `scripts/verify-stacks.sh`
is the slow alternative — one stack at a time with a health check after each.

OpenCode itself is not restored by Compose. Restore or reinstall
`/home/ravik/.opencode/bin/opencode`, restore
`/home/ravik/.config/opencode/opencode.json` with mode `0600` (or seed it from
`config/opencode/opencode.example.json`), then validate:

```bash
make up STACK=open-notebook-mcp
make up STACK=steel-mcp
make up STACK=serena
make mcp-preflight
/home/ravik/.opencode/bin/opencode service restart
/home/ravik/.opencode/bin/opencode mcp list
make ai-preflight
```

All MCP listeners and Serena's dashboard must remain on `127.0.0.1`. For an
emergency rollback, restore the archived host config before restarting the
OpenCode service; do not expose the MCP ports on the LAN as a workaround.

### 6.2 If Infisical was restored from backup

Infisical needs its PostgreSQL and Redis data volumes intact. If they were restored from Restic, start Infisical first and wait for it to be healthy before starting other stacks:

```bash
make up STACK=infisical
# Wait for PostgreSQL and Infisical app to be ready
docker ps --filter "label=com.docker.compose.project=glasswing-infisical"
```

### 6.3 If secrets need re-registration

If Infisical secrets were lost and need to be re-entered:

1. Log into Infisical at `https://192.168.68.62:8095`
2. Navigate to Project → Environment → Secrets
3. Enter secrets for each stack (refer to each stack's `secrets.list` for required keys)
4. Or use the registry files: `./scripts/infisical-register.sh stacks/<stack>/<stack>.registry`

---

## Phase 7 — Verify

### 7.1 Host preflight

```bash
make doctor              # pool, shared network, ports, hardcoded IPs, restart loops, Infisical
make certificates-check  # TLS covers the host IP and is not expiring
make access-check        # ACCESS.md matches the compose files
make mcp-preflight       # initialize and list tools on all MCP endpoints
make ai-preflight        # verify native OpenCode and Ollama end to end
```

### 7.2 Containers and secrets

```bash
make status
make secrets-check
```

`make status` should show every `glasswing-*` container `Up`; a restarting
container is a failure even if the stack reported success earlier.

### 7.3 Observability pipeline

Open `http://192.168.68.62:3018` and confirm recent logs from at least one other
stack. Vector and the OTel collector read from the Docker socket, so an empty
explorer usually means the socket group ID changed (`DOCKER_GID` is read at
`make` time).

### 7.4 Backup

```bash
make backup
make backup-list
```

A restore is not proven until a backup of the recovered host succeeds.

## Partial recovery

### Single stack failure

```bash
cd /home/ravik/src_git/project_glasswing

# Check logs
make logs STACK=<stack>

# Validate config
make check STACK=<stack>

# Restart
make down STACK=<stack>
make up STACK=<stack>

# If a data volume is corrupted, restore only that stack's volumes
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore <snapshot-id> \
    --target /mnt/storage/glasswing-restore \
    --include '/var/lib/docker/volumes/glasswing-<stack>*'

# Stop the stack, copy the volume across, start it again
make down STACK=<stack>
sudo rsync -aHAX /mnt/storage/glasswing-restore/var/lib/docker/volumes/ /var/lib/docker/volumes/
make up STACK=<stack>
```

### Infisical data loss

If the Infisical PostgreSQL volume is corrupted:

1. Restore the volume from Restic (see above)
2. Start Infisical: `make up STACK=infisical`
3. If secrets are lost, re-enter them via the Infisical UI or registry files
4. Redeploy all dependent stacks: `make restart-all`

---

## Known risks

1. **COLD disk failure** — If the COLD disk containing the Restic repository fails, there is no off-host backup. **Mitigation:** configure periodic sync of the Restic repository to an off-site location.
2. **Restic password loss** — Without the password, the encrypted repository is unrecoverable. **Mitigation:** store the password in a password manager or physical safe.
3. **CA key loss** — Without the Glasswing CA key, TLS certificates cannot be re-signed. **Mitigation:** keep an offline copy of `.local/ca/glasswing-ca.key`.
4. **Infisical credentials loss** — Without `credentials.env`, secret injection fails. **Mitigation:** keep an offline copy or re-register via Infisical admin UI.
5. **Image tag drift** — if a pinned image version is deprecated or removed from the registry, `make up` will fail. **Mitigation:** pin to versions that are still available, or use image digests for critical services.
6. **Dagu update DAG failures** — the automated image update DAG rolls back broken updates automatically, but if a new image is fundamentally broken, the stack reverts to the previously cached image. **Mitigation:** review Dagu run logs after each scheduled run, especially after long gaps.

---

## Recovery checklist

Print this and keep it near the machine:

- [ ] Ubuntu Server installed, user `ravik` created
- [ ] Docker Engine installed and running
- [ ] NVIDIA driver + Container Toolkit installed
- [ ] Restic installed
- [ ] COLD disk mounted at `/mnt/cold` (UUID `9070ff10...`)
- [ ] STORAGE disk mounted at `/mnt/storage` (UUID `83259698...`)
- [ ] Restic password file at `/etc/glasswing/backup/restic-password`
- [ ] Repository cloned to `/home/ravik/src_git/project_glasswing`
- [ ] `.local/infisical/credentials.env` restored
- [ ] `.local/ca/glasswing-ca.key` restored (or `make certificates` rerun)
- [ ] `stacks/infisical/.env` restored (IP, SITE_URL, DB password, encryption key, auth secret)
- [ ] `stacks/infisical/tls/` and `stacks/portainer/certs/` present (`make certificates-check`)
- [ ] Docker pool widened and `glasswing` network present (`make doctor`)
- [ ] Infisical started and healthy
- [ ] `make restart-all` finished with every stack `[PASS]`
- [ ] `make secrets-check` and `make access-check` pass
- [ ] Backup runs successfully
- [ ] Restic password stored offline
- [ ] CA key stored offline
