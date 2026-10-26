# AGENTS.md

## Repository shape

Glasswing is homelab infrastructure, not an application: one Docker Compose stack per `stacks/<name>/compose.yaml`, driven entirely by the root `Makefile`. Runtime state lives in Docker volumes and host bind mounts, never in this repo. There is no test suite, linter, codegen, or CI.

The deployment target is the Ubuntu host `pathfinder` at `/home/ravik/src_git/project_glasswing`. A checkout on macOS can edit files but cannot deploy: the Makefile uses GNU `stat -c`, and targets need Docker, `/mnt/cold`, and `/var/run/docker.sock`. Run lifecycle and backup targets on the host only.

## Commands

From the repo root on `pathfinder`:

- `make help`, `make list-stacks`
- `make up STACK=<name>` — validates, injects secrets if declared, runs `docker compose up -d --wait --wait-timeout 180`
- `make check STACK=<name>` — the verification target: Compose config validation plus status. For a stack with `secrets.list`, it needs running Infisical and local credentials.
- `make ps|logs|down|restart STACK=<name>`
- `make core` — Infisical, then Homepage
- `make restart-all` — starts Infisical first, then every discovered stack
- `make secrets-check` — live end-to-end injection check; asserts `GLASSWING_TEST_SECRET=pathfinder-ready` at path `/test`
- `make backup`, `make backup-list`, `make backup-check`, `make backup-retention`

`make restart` runs `docker compose restart` and does **not** apply changed environment or Compose config. Use `make up STACK=<name>` after editing a stack. Because `make up` waits on healthchecks, slow services need a suitable `healthcheck.start_period`.

## Adding or changing a stack

- Discovery is the `stacks/*/compose.yaml` wildcard; there is no central inventory to edit.
- Every Compose file must set `name: glasswing-<stack>`. `make ps` filters on that project label, and `backup/scripts/backup.sh` only handles containers named `glasswing-*`.
- Other stacks bind ports explicitly to `192.168.68.62:<host>:<container>`; `infisical` is the only stack parameterized via `HOST_IP` from `stacks/infisical/.env`, and `plex` uses host networking. Follow the existing pattern rather than binding `0.0.0.0`.
- `otel-collector` and `vector` mount the Docker socket and require `DOCKER_GID`, which the Makefile derives from `/var/run/docker.sock`.
- Most services export OTLP to `http://192.168.68.62:4318` and set the `glasswing-homepage` OTEL service name; copy a neighboring stack when adding one.
- The Homepage dashboard is hand-maintained under `stacks/homepage/config/` (`services.yaml`, `settings.yaml`, `bookmarks.yaml`); a new Compose stack does not appear there automatically. Icons are vendored in `stacks/homepage/icons/`.

## Secrets

- A stack opts in by adding `stacks/<name>/secrets.list` (one key per line, `#` comments). All lifecycle targets then route through `scripts/with-infisical.sh`; no target can forget injection.
- The secret path defaults to `/<stack>`. `otel-collector` and `vector` reuse `/openobserve`; override with `INFISICAL_PATH`.
- Keys must match `^[A-Z][A-Z0-9_]*$`; `INFISICAL_*` and `COMPOSE_*` are rejected.
- Every `${VAR:?...}` in a Compose file must be listed in that stack's `secrets.list` and exist in Infisical at the resolved path. Missing values fail closed deliberately; do not replace them with defaults or hardcoded secrets.
- `scripts/with-infisical.sh` uses universal auth over the self-signed CA at `stacks/infisical/tls/cert.pem` and requires `curl` and `jq`. Do not disable CA verification.
- Gitignored local inputs: `.local/infisical/credentials.env` (URL, project ID, environment, client ID/secret) and `stacks/infisical/tls/`. A fresh clone cannot run secret-backed stacks until these exist.
- First boot is chicken-and-egg: Infisical has no `secrets.list` and reads `stacks/infisical/.env` (`HOST_IP`, `SITE_URL`, `POSTGRES_PASSWORD`, `ENCRYPTION_KEY`, `AUTH_SECRET`). Create it and the TLS pair per `manual_steps`, then `make up STACK=infisical` before any secret-backed stack.

## Host bootstrap

In order: `./scripts/01-mount-drives.sh` (root, existing disks only), `./scripts/02-bootstrap.sh` (normal user; installs Docker and `jq`), `./scripts/03-gpu-setup.sh` (normal user; RTX 4090 and NVIDIA container runtime). The scripts intentionally refuse the wrong user.

## Backups and observability

- Backup is cold and interrupts service: `backup/scripts/backup.sh` records running `glasswing-*` containers, stops them, snapshots `/home/ravik/src_git/project_glasswing` and `/var/lib/docker/volumes`, then restarts only what was running. Read `backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md` before touching it; never use it as a routine verification step.
- The backup script and Makefile targets hardcode the repo path, `/mnt/cold`, and `/etc/glasswing/backup/restic-password`. The script runs as root and fails unless `/mnt/cold` has UUID `9070ff10-5016-4b6f-a148-b5ed1ad61ae6`. Update script and runbook together if those move.
- OpenObserve retains telemetry for 10 days. A green container is not proof of success: verify telemetry arrives in OpenObserve, and verify a backup by restoring it.

## Not authoritative

- `Makefile.bak` is a stale copy; edit `Makefile` only.
- `manual_steps` is a setup procedure, not a script; `scripts/phase_0_disk.txt` is a historical terminal transcript.
- When `README.md` disagrees with a Compose file or the Makefile, trust the executable source.
