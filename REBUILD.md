# Rebuild from scratch — Glasswing

How to get from a fresh Ubuntu install to the full platform, using only this
repository plus the values you keep offline. This is the **clean install** path.
If you have a Restic snapshot and want the old data back instead, follow
[DR_RUNBOOK.md](DR_RUNBOOK.md) and use this document for the host preparation
steps.

**Assumed host:** `pathfinder` — Ryzen 9 7950X, 128 GB RAM, RTX 4090, Ubuntu
Server, three filesystems: OS on NVMe, `/mnt/storage` on NVMe, `/mnt/cold` on
HDD. Every stack binds its ports to one LAN address (`GLASSWING_HOST_IP`); there
is no internal DNS and no reverse proxy, so access is always `IP:port`.

**Before you begin, have these offline** (never in Git):

| Item | Why | Where it comes from |
| --- | --- | --- |
| Git remote access | clone the repository | your forge account |
| 25 secret values | Infisical has no copy on a fresh host | `make secrets-plan` lists every key; your password manager holds the values |
| Restic password | only needed on the restore path | `/etc/glasswing/backup/restic-password` offline copy |
| Glasswing CA key | only needed to keep existing client trust | `.local/ca/glasswing-ca.key` offline copy |

The rebuild is seven phases. Each one ends with a check; do not continue past a
failure.

---

## Phase 1 — Host and user

The stacks assume the login user is `ravik` with uid/gid `1000` (OpenCode mounts
`/home/ravik`, several containers run as `1000:1000`), and several scripts and
compose files assume the hostname `pathfinder`.

```bash
sudo hostnamectl set-hostname pathfinder
sudo adduser ravik                     # uid 1000 on a fresh install
sudo usermod -aG sudo ravik
```

Log in as `ravik`, clone nothing yet, and run the two host bootstrappers:

```bash
# baseline packages, Docker Engine, Compose plugin, docker group
./scripts/02-bootstrap.sh

# log out and back in so the docker group applies, then:
docker ps

# NVIDIA driver (if absent), Container Toolkit, docker runtime, GPU smoke test
./scripts/03-gpu-setup.sh
```

`03-gpu-setup.sh` refuses to continue without an RTX 4090 (`10de:2684`) and will
ask for a reboot if it installed the driver. Rerun it after the reboot.

**Check:** `docker info | grep -i runtime` lists `nvidia`, and
`docker run --rm --gpus all ubuntu:24.04 nvidia-smi -L` prints the GPU.

---

## Phase 2 — Storage

Both data disks must be mounted before any stack starts. `01-mount-drives.sh`
refuses to write `/etc/fstab` unless it finds ext4 filesystems with the expected
UUIDs, and it backs up `/etc/fstab` first.

```bash
sudo ./scripts/01-mount-drives.sh
```

The UUIDs are hardcoded at the top of that script:

| Mount | UUID | Contents |
| --- | --- | --- |
| `/mnt/storage` | `83259698-d2a6-45e7-b503-7f106b746b39` | Ollama models, experiments |
| `/mnt/cold` | `9070ff10-5016-4b6f-a148-b5ed1ad61ae6` | media, books, Restic repository |

If you are rebuilding with *different* disks, edit both the UUID **and** the
target arrays in the script; the same UUIDs also appear in `DR_RUNBOOK.md` and
`backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md`. The script never partitions,
formats, or moves data — the filesystems must already exist.

**Check:** `findmnt --mountpoint /mnt/cold -o TARGET,UUID` and
`findmnt --verify` agree with the table above.

---

## Phase 3 — Repository and bootstrap variables

```bash
mkdir -p ~/src_git
git clone <your-git-remote-url> ~/src_git/project_glasswing
cd ~/src_git/project_glasswing
```

Two kinds of configuration are *not* in Git: host-local secrets and TLS
material. Both are restored here or generated now.

### 3.1 Infisical bootstrap file

Infisical cannot read its own secrets, so it is configured from a gitignored
`.env`. The committed example lists every key:

```bash
cp stacks/infisical/.env.example stacks/infisical/.env
chmod 600 stacks/infisical/.env

IP=192.168.68.62          # your LAN address
sed -i "s|^GLASSWING_HOST_IP=.*|GLASSWING_HOST_IP=$IP|" stacks/infisical/.env
sed -i "s|^SITE_URL=.*|SITE_URL=https://$IP:8095|" stacks/infisical/.env
# hex, not base64: this password is embedded in Infisical's DB_CONNECTION_URI
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" stacks/infisical/.env
sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -hex 16)|" stacks/infisical/.env
sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$(openssl rand -base64 32)|" stacks/infisical/.env
```

`GLASSWING_HOST_IP` is the single source of truth for every published port: the
Makefile exports it, compose files require it, and `make access` renders it.
Generate the three secrets **once** — changing `POSTGRES_PASSWORD` after the
database exists locks you out, and changing `ENCRYPTION_KEY` makes stored
secrets unreadable.

### 3.2 TLS

`stacks/infisical/tls/` and `stacks/portainer/certs/` are gitignored, so a fresh
clone cannot start either service until the certificates exist:

```bash
make certificates         # CA, Infisical (self-signed), Portainer (CA-signed)
make certificates-check   # covers the host IP, not expiring
```

The Infisical certificate is deliberately self-signed: `scripts/with-infisical.sh`
and every documented `curl` verify it with `--cacert stacks/infisical/tls/cert.pem`,
which only works while that file is its own issuer. Rerun
`./scripts/04-certificates.sh --force` when the host address changes, then
`make restart STACK=infisical` and `make restart STACK=portainer` if they are
already running (`make up` is a no-op there: only mounted files changed).

**Check:** `make certificates-check` passes for all three certificates.

---

## Phase 4 — Docker network capacity

Before the platform starts, widen Docker's address pool and create the shared
bridge. The pool edit merges into `/etc/docker/daemon.json` (keeping the NVIDIA
runtime) and restarts Docker.

```bash
make docker-pool     # sudo; 172.16.0.0/12 split into /24 networks (4096)
make network         # shared 'glasswing' bridge on 10.89.0.0/24
```

The shared bridge has an explicit subnet, so it does not consume a pool slot;
the pool only covers the few private networks that stacks create for their
backends (Infisical, Langfuse, Open Notebook).

**Check:** `make doctor` prints `[PASS] Widened address pool in effect` and
`[PASS] Shared network 'glasswing' exists`. Doctor will still warn about
Infisical being unhealthy until Phase 5 — that is expected.

---

## Phase 5 — First boot of Infisical

```bash
make up STACK=infisical
docker ps --filter label=com.docker.compose.project=glasswing-infisical
```

Four containers start: PostgreSQL, Redis, the Infisical app, and the nginx
gateway on `https://<ip>:8095`. Wait for `healthy` on all four.

Then, in the browser at `https://<ip>:8095` (accept the self-signed
certificate):

1. **Create the first account.** On an empty database Infisical sends you to its
   first-run setup; that account is the instance administrator.
2. **Create a project** named `glasswing-infrastructure`. Open the project and
   note its **Project ID** (Project settings) — it goes into the credentials file
   below.
3. **Confirm the environment slug.** The platform reads `prod`; create it under
   the project's environment settings if it is missing.
4. **Create a machine identity.** In the project: Access Control → Machine
   Identities → create one (e.g. `pathfinder`), enable **Universal Auth**, create
   a **Client Secret**, and grant the identity access to the project with a role
   that can read *and* write secrets (Admin). Copy the client ID and secret once
   — the UI will not show the secret again.

Write the machine identity where `with-infisical.sh` expects it:

```bash
install -d -m 700 .local/infisical
cat > .local/infisical/credentials.env <<EOF
INFISICAL_URL=https://192.168.68.62:8095
INFISICAL_PROJECT_ID=<project-id>
INFISICAL_ENV=prod
INFISICAL_CLIENT_ID=<client-id>
INFISICAL_CLIENT_SECRET=<client-secret>
EOF
chmod 600 .local/infisical/credentials.env
```

**Check (before secrets exist):** `./scripts/with-infisical.sh /test tests/infisical-secrets.list -- true`
must authenticate and fail only because the key is missing. Authentication
errors here mean the identity, project ID, or environment slug is wrong.

---

## Phase 6 — Load the secrets

There are two layers, and only the first one is in Git.

### 6.1 Configuration values (committed)

```bash
for f in stacks/global-secrets.registry stacks/*/*.registry; do
  stack=$(basename "$(dirname "$f")")
  case "$f" in
    *global-secrets.registry) path=/global ;;
    */otel-collector/*|*/vector/*) path=/openobserve ;;
    *) path=/$stack ;;
  esac
  ./scripts/infisical-register.sh "$path" "$f"
done
```

These registries contain non-secret configuration only (timezone, ports, URLs,
feature flags), which is why they can live in Git. `scripts/infisical-register.sh`
upserts, so the loop is safe to rerun.

### 6.2 Values only you have (25 keys)

`make secrets-plan` prints the split: which keys are covered by the registries
above and which ones you must supply. To turn the second list into fillable
files:

```bash
./scripts/secrets-plan.sh --template     # writes .local/secrets-templates/*.registry
$EDITOR .local/secrets-templates/*.registry
for f in .local/secrets-templates/*.registry; do
  ./scripts/infisical-register.sh "/$(basename "${f%.registry}")" "$f"
done
```

The 25 keys are credentials for DBGate (2), Flowise (3), AnythingLLM (1),
JupyterLab (1), Langfuse (7), OpenCode (1), Open Notebook (3, one of them shared
with OpenCode), OpenObserve (2, shared with the collector and Vector), Postgres
(3) and Stirling PDF (2). `OPEN_NOTEBOOK_PASSWORD` appears under both
`/open-notebook` and `/opencode` and **must be the same value** in both. Use
random values for anything new; reuse your recorded values when restoring an
existing deployment.

### 6.3 The injection test secret

`make secrets-check` asserts a known value arrives in the command environment:

```bash
printf 'GLASSWING_TEST_SECRET=pathfinder-ready\n' > .local/test.registry
./scripts/infisical-register.sh /test .local/test.registry
make secrets-check
```

**Check:** `make secrets-check` prints `[PASS] Infisical authentication and
secret injection operational`.

---

## Phase 7 — Start the platform

```bash
make network
make restart-all JOBS=4
```

`restart-all` deploys Infisical first, then Ollama, then the remaining 27 stacks
four at a time with per-stack logs. The first Ollama start pulls
`qwen3.6:27b` (about 17 GB) and builds the checked-in coding model, so allow
time and disk on `/mnt/storage`; `make up STACK=ollama` reports progress.

Then generate and verify the access map and preflight the host:

```bash
make access           # rewrite ACCESS.md from the compose port bindings
make access-check
make doctor
make ai-preflight
```

**Check:** `make doctor` ends with `No failures, 0 warning(s)`, and every URL in
[ACCESS.md](ACCESS.md) answers.

---

## Phase 8 — First-run setup inside the applications

These are per-application accounts, not platform configuration; the data volumes
hold them after the first run.

| Service | What to do | Notes |
| --- | --- | --- |
| Portainer (`:9443`) | create the admin user immediately | Portainer locks the instance if no admin is created within a few minutes; load the CA first (`.local/ca/glasswing-ca.crt`) to avoid warnings |
| Forgejo (`:3011`, SSH `:2222`) | complete the installer, create the admin account | repository data lives in the Forgejo volume |
| AdGuard Home (`:3008` admin UI) | set the admin password | DNS itself listens on `:53` |
| Homepage (`:3006`) | none; configuration is committed | `HOMEPAGE_ALLOWED_HOSTS` comes from Infisical |
| Open Notebook (`:8502`) | sign in with `OPEN_NOTEBOOK_PASSWORD` | MCP bridge stays internal to the stack network |
| JupyterLab (`:8889`) | use `JUPYTER_TOKEN` from Infisical | |
| Dagu (`:3014`) | none | host network; DAGs and run history are bind-mounted from the repo volume |

If you want the CA trusted on your workstation, follow
`stacks/portainer/certificate_instructions.md` (step "Trust the Glasswing CA").

---

## Verification checklist

```bash
make doctor              # pool, shared network, ports, hardcoded IPs, restart loops, Infisical
make certificates-check  # TLS covers the host IP and is current
make access-check        # ACCESS.md matches the compose files
make secrets-check       # Infisical auth + injection
make ai-preflight        # GPU, Ollama flags, model limits, OpenCode path
make status              # every glasswing-* container Up
```

Manual spot checks that automation cannot prove:

- [ ] `https://<ip>:8095` logs in and lists the project's secrets
- [ ] `https://<ip>:9443` serves a certificate your client trusts
- [ ] OpenObserve (`:3018`) shows fresh logs and metrics from at least one other stack
- [ ] Homepage (`:3006`) tiles render and its widget APIs answer
- [ ] `docker inspect -f '{{json .HostConfig.LogConfig}}' glasswing-homepage` shows `max-size 5m`, `max-file 2`
- [ ] A note written through the Open Notebook MCP server appears in its UI

---

## Rebuild versus restore

| Situation | Path |
| --- | --- |
| New hardware, no data to keep | this document (fresh secrets, fresh volumes) |
| Reinstall on the same disks, keep data | [DR_RUNBOOK.md](DR_RUNBOOK.md) — restore Docker volumes and the repo, skip Phases 5–6 because the Infisical database and `.local/` come back with the snapshot |
| One stack is broken | `make logs STACK=<name>`, `make check STACK=<name>`, restore that volume only ([DR_RUNBOOK.md](DR_RUNBOOK.md#partial-recovery)) |

The backup job covers the repository (including `.local/` and the stack TLS
directories), all Docker volumes, and selected `/etc` paths. It does **not**
cover the OS, images, or model files, which is why the host preparation above is
always required. See
[backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md](backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md)
for scope and risks.

---

## Known rebuild risks

- **The 25 manual secret values have no second copy on the host.** Without your
  offline record, a rebuild means new passwords, which means re-initialising the
  services that store them (Infisical project, Langfuse keys, DBGate logins).
- **The Infisical `ENCRYPTION_KEY` is unrecoverable.** Restoring a backup with a
  different key leaves the stored secrets unreadable even though the database
  starts.
- **The Restic repository is on the same machine.** A full loss needs the
  off-host copy that is still not configured.
- **Model downloads are not backed up.** `make up STACK=ollama` re-pulls about
  17 GB.
- **The host IP is baked into `ACCESS.md`, Homepage config, and the certificates.**
  Changing it means `./scripts/04-certificates.sh --force`, `make access`, and a review of
  `stacks/homepage/config`.
