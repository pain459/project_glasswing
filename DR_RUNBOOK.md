# Disaster Recovery — Glasswing

Step-by-step procedures for recovering the Glasswing platform after a total failure: hardware replacement, OS reinstall, or complete data loss.

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

If the CA key is lost, you must regenerate it and re-issue all TLS certificates:
```bash
# Regenerate CA (only if original is lost)
openssl req -x509 -newkey rsa:4096 -sha256 \
  -noenc -days 3650 \
  -keyout .local/ca/glasswing-ca.key \
  -out .local/ca/glasswing-ca.crt \
  -subj "/CN=Glasswing Home CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# Re-sign Portainer certificate (see stacks/portainer/certificate_instructions.md)
# Re-sign Infisical certificate
```

### 4.4 Infisical TLS certificate

```bash
# If stacks/infisical/tls/cert.pem is missing, regenerate:
# See stacks/infisical/ for certificate generation instructions
```

---

## Phase 5 — Restore application state

### 5A. If STORAGE disk is intact

If the STORAGE disk (`/mnt/storage`) survived, Docker volumes are already in place. Skip to Phase 6.

### 5B. If Docker volumes need restoration from Restic

```bash
# List available snapshots
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic snapshots

# Restore to the expected location
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore latest \
    --target / \
    --iinclude /var/lib/docker/volumes \
    --exclude '**'
```

This restores only Docker volumes to their original paths. The `--iinclude/--exclude` pattern limits restoration to the volumes directory.

### 5C. If the repository itself needs restoration

```bash
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore latest \
    --target / \
    --iinclude /home/ravik/src_git/project_glasswing \
    --exclude '**'
```

Then re-clone or copy the restored directory.

---

## Phase 6 — Bring up the platform

### 6.1 Start in dependency order

```bash
cd /home/ravik/src_git/project_glasswing

# Option A: Use the verify script (restarts each stack and checks health)
./scripts/verify-stacks.sh

# Option B: Manual, step by step
make up STACK=infisical
make up STACK=proxy
make up STACK=otel-collector
make up STACK=vector
make up STACK=openobserve
make up STACK=ollama
# ... continue with remaining stacks
```

The stack restart order (defined in `scripts/verify-stacks.sh`) is:

1. **Proxy:** proxy (creates `glasswing-proxy` and the wildcard certificate)
2. **Infrastructure:** otel-collector, vector, openobserve
3. **AI platform:** ollama, open-notebook, steel, opencode, anythingllm, flowise, langfuse
4. **Services:** homepage, stirling-pdf, forgejo, plex, beszel, adguard, kavita
5. **Monitoring:** uptime-kuma, portainer, dagu
6. **Tools:** cyberchef, excalidraw, it-tools, jupyterlab, dbgate

**Note:** Dagu is started after the monitored services so its health-check and update DAGs have targets to reach. Dagu uses `network_mode: host` and does not require port mapping; the proxy reaches it through `host.docker.internal:3014`.

Every other web UI joins the external `glasswing-proxy` network and has no
published host port. If a stack starts before the proxy network exists, start
the proxy first (`make up STACK=proxy`).

### 6.2 If Infisical was restored from backup

Infisical needs its PostgreSQL and Redis data volumes intact. If they were restored from Restic, start Infisical first and wait for it to be healthy before starting other stacks:

```bash
make up STACK=infisical
# Wait for PostgreSQL and Infisical app to be ready
docker ps --filter "label=com.docker.compose.project=glasswing-infisical"
```

### 6.3 If secrets need re-registration

If Infisical secrets were lost and need to be re-entered:

1. Log into Infisical at `https://192.168.68.62:8095` (self-signed certificate)
2. Navigate to Project → Environment → Secrets
3. Enter secrets for each stack (refer to each stack's `secrets.list` for required keys)
4. Or use the registry files: `./scripts/infisical-register.sh stacks/<stack>/<stack>.registry`

---

## Phase 7 — Verify

### 7.1 All containers running

```bash
make status
docker ps --format '{{.Names}}\t{{.Status}}' | grep glasswing
```

All `glasswing-*` containers should show `Up` with a reasonable uptime.

### 7.2 Secret injection works

```bash
make secrets-check
```

### 7.3 Observability pipeline

```bash
# Check OpenObserve has recent data
# Visit http://192.168.68.62:3018
```

### 7.4 Run a backup

```bash
make backup
make backup-list
```

### 7.5 Full stack verification

```bash
./scripts/verify-stacks.sh
```

---

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

# If data volume is corrupted, restore from backup
sudo env \
  RESTIC_REPOSITORY=/mnt/cold/glasswing-backups/restic \
  RESTIC_PASSWORD_FILE=/etc/glasswing/backup/restic-password \
  restic restore latest \
    --target / \
    --iinclude "/var/lib/docker/volumes/glasswing-<stack>*" \
    --exclude '**'
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
7. **Proxy certificate or DNS loss** — only affects the optional proxy; direct IP:port access is unaffected. Without the wildcard certificate or the AdGuard rewrite, browsers fail before reaching a service. **Mitigation:** the CA key is backed up with the rest of the recovery material; run `./scripts/gen-proxy-cert.sh --force` after restoring it, and recreate both AdGuard rewrites.
8. **Shared proxy network missing** — stacks that join `glasswing-proxy` fail to start if the external network does not exist. **Mitigation:** any `make up STACK=<name>` creates it; `docker network create glasswing-proxy` is the manual equivalent.

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
- [ ] `.local/ca/glasswing-ca.key` restored
- [ ] Infisical started and healthy
- [ ] Reverse proxy started (`make up STACK=proxy`), wildcard certificate issued
- [ ] AdGuard rewrites `glasswing.lan` and `*.glasswing.lan` -> `192.168.68.62` recreated
- [ ] Client devices trust `.local/ca/glasswing-ca.crt`
- [ ] All stacks started in order
- [ ] `http://192.168.68.62:3006` loads
- [ ] `make secrets-check` passes
- [ ] Backup runs successfully
- [ ] Restic password stored offline
- [ ] CA key stored offline
