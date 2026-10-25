# Glasswing

A small private datacenter running on one workstation.

Glasswing is the platform that runs on **Pathfinder**, a repurposed desktop with an RTX 4090, 128 GB of RAM, and a Ryzen 9 7950X. It hosts local AI, developer tooling, media services, observability, and encrypted backups. Every service runs on hardware I own, on a network I control. Nothing is rented, and no application data leaves the LAN.

The design goal is not maximum service count. It is a platform that stays understandable after the twentieth application: predictable commands, visible boundaries, telemetry that actually arrives, and a recovery path that has been tested.

## Contents

- [Design principles](#design-principles)
- [Hardware](#hardware)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Everyday commands](#everyday-commands)
- [Stacks](#stacks)
- [Secrets](#secrets)
- [Observability](#observability)
- [Backups](#backups)
- [Verification](#verification)
- [Known limitations](#known-limitations)

## Design principles

1. **One application, one stack.** Each service owns a directory under `stacks/<name>/` with its own Compose file. Applications are not forced to share a database or cache layer.
2. **Git is the deployment interface.** The repository holds configuration and scripts. Docker volumes hold state.
3. **The Makefile discovers stacks.** Adding `stacks/newtool/compose.yaml` is enough for `make up STACK=newtool` to work. There is no central inventory to edit.
4. **Infisical owns secrets.** Compose files stay in Git. Passwords are injected at deploy time.
5. **Observability is layered.** Availability, host health, logs, and traces are separate signals with separate tools.
6. **Backups are cold and tested.** Services stop before the snapshot, and an isolated restore has been exercised.

## Hardware

| Role | Device | Purpose |
| --- | --- | --- |
| System | NVMe SSD | Ubuntu, Docker, application state |
| Storage | NVMe SSD | AI models and experiments |
| Cold | HDD | Media, books, backup repository |

## Repository layout

```
stacks/            One directory per application, each with compose.yaml
scripts/           Host bootstrap and the Infisical secret wrapper
backup/            Restic backup controller and recovery runbook
tests/             Secret injection fixtures
manual_steps/      Procedures that are intentionally not automated
Makefile           Stack lifecycle, secrets checks, backup targets
```

## Getting started

### Prerequisites

- Ubuntu server with Docker Engine and the Compose plugin
- NVIDIA driver and container toolkit if you want GPU workloads (Ollama, Plex transcoding)
- Mounted storage for models, media, and the backup disk
- An Infisical instance (the `infisical` stack provides one)

### Bootstrap

The scripts under `scripts/` are ordered and idempotent where possible. `02-bootstrap.sh` installs Docker from the official repository and does not touch disks.

```bash
./scripts/01-mount-drives.sh     # mount and verify storage
./scripts/02-bootstrap.sh        # Docker Engine and Compose plugin
./scripts/03-gpu-setup.sh        # NVIDIA container runtime
```

### Machine identity

Deployment secrets are read by `scripts/with-infisical.sh`, which expects a local machine identity that is never committed:

```
.local/infisical/credentials.env
```

Required keys:

```
INFISICAL_URL=
INFISICAL_PROJECT_ID=
INFISICAL_ENV=
INFISICAL_CLIENT_ID=
INFISICAL_CLIENT_SECRET=
```

The wrapper also expects the Infisical CA certificate at `stacks/infisical/tls/cert.pem`. It authenticates with universal auth, fetches only the keys listed in each stack's `secrets.list`, exports them for a single `docker compose` command, and exits.

### Start the core

```bash
make core                        # Infisical, then Homepage
make secrets-injection-check     # verify a test secret reaches the environment
```

Then bring up individual stacks, or reconcile everything:

```bash
make up STACK=ollama
make restart-all
```

## Everyday commands

| Command | Effect |
| --- | --- |
| `make help` | List available targets |
| `make up STACK=name` | Validate, inject secrets, start, wait for health |
| `make down STACK=name` | Stop and remove a stack's containers |
| `make restart STACK=name` | Restart a stack's containers |
| `make logs STACK=name` | Follow a stack's logs |
| `make ps STACK=name` | Show a stack's status |
| `make check STACK=name` | Validate Compose config, then show status |
| `make status` | Show every running container |
| `make list-stacks` | List discovered stacks |
| `make restart-all` | Redeploy every stack in order |

`make restart-all` uses `docker compose up`, not `docker restart`. Changed environment variables are applied, not ignored.

`INFISICAL_PATH` overrides the secret path for a stack. The default is `/<stack>`, and the collectors reuse `/openobserve`.

## Stacks

| Stack | Port(s) | Purpose |
| --- | --- | --- |
| `ollama` | 11434 | Local LLM inference on the RTX 4090 |
| `flowise` | 3002 | Visual agent flows |
| `uptime-kuma` | 3003 | Availability checks |
| `dbgate` | 3004 | Database client |
| `homepage` | 3006 | Dashboard and service map |
| `adguard` | 53, 3007, 3008 | DNS filtering |
| `excalidraw` | 3009 | Diagrams |
| `langfuse` | 3010, 9090 | LLM tracing and evaluation |
| `forgejo` | 3011, 2222 | Self-hosted Git and SSH |
| `anythingllm` | 3012 | Document chat over local models |
| `cyberchef` | 3013 | Data transformations |
| `it-tools` | 3015 | Small utilities |
| `stirling-pdf` | 3016 | PDF operations |
| `kavita` | 3017 | Book library |
| `openobserve` | 3018 | Logs, metrics, traces |
| `jupyterlab` | 8889 | GPU notebooks |
| `open-notebook` | 8502, 5055 | Research workflows |
| `beszel` | 8090 | Host health |
| `portainer` | 9443 | Container management |
| `plex` | 32400 (host network) | Media server |
| `otel-collector` | 4318, 13133 | Telemetry ingestion |
| `vector` | 8686 | Docker log shipping |
| `infisical` | 8095 | Secrets management |

Ports in the Compose files are bound to `192.168.68.62`, the LAN address of Pathfinder. Change them for your own host, or parameterize them with `HOST_IP` the way the Infisical stack does.

## Secrets

Each stack declares the secret names it needs in its own `secrets.list` (one key per line, comments allowed):

```
ZO_ROOT_USER_EMAIL
ZO_ROOT_USER_PASSWORD
```

Compose fails fast when a value is missing:

```yaml
environment:
  ZO_ROOT_USER_PASSWORD: ${ZO_ROOT_USER_PASSWORD:?Required from Infisical}
```

This is deliberate. A service should refuse to start with a blank password rather than run with an insecure default.

## Observability

Three layers, each answering a different question:

- **Availability:** Uptime Kuma. Is the endpoint reachable?
- **Host health:** Beszel. Is the machine under pressure?
- **Telemetry:** OpenObserve, fed by OpenTelemetry Collector (container metrics and application traces) and Vector (Docker stdout and stderr).

The collector reads container metrics from the Docker socket without a sidecar in every stack. Vector discovers containers and forwards their logs into an OpenObserve stream. Retention is set to 10 days in `stacks/openobserve/compose.yaml`.

Langfuse is separate from OpenObserve on purpose. OpenObserve covers infrastructure and application telemetry. Langfuse inspects LLM calls for applications that are instrumented to send them.

## Backups

One Restic repository covers application state: the Glasswing repository, Docker volumes, relevant host configuration, and certificates. Model downloads and media libraries are excluded because they can be recreated.

The job is cold. It records which containers were running, stops them, snapshots, and starts only what was running before.

```bash
make backup              # run the backup
make backup-list         # list snapshots
make backup-check        # verify repository integrity
make backup-retention    # apply the retention policy
```

The script verifies the backup filesystem UUID before writing, so a missing mount cannot silently fill the root disk. The repository currently lives on the COLD disk, which is not protection against losing the machine. An off-host copy is the next step.

Encryption credentials are held outside Infisical with an offline recovery copy. Losing Infisical must not lock you out of the backup needed to restore it.

Read [backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md](backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md) before relying on any of this. It documents scope, retention, restore procedures, and known risks.

## Verification

```bash
make check STACK=name     # Compose config validation and status
make secrets-injection-check
make ps STACK=name
```

A green container is not proof a service works. Check the destination too: telemetry must arrive in OpenObserve, and a backup must actually restore.

## Known limitations

- Ports are bound to a single hardcoded LAN address. Parameterizing `HOST_IP` across every stack is pending.
- There is no off-host backup copy yet.
- Backup scheduling is manual; systemd timers are planned.
- A full application-state restore has not been attempted end to end. An isolated configuration restore has.
- `make secrets-check` calls `scripts/04-infisical-check.sh`, which is not in the repository yet.
- Remote access is LAN-only. A VPN or tunnel is not configured.
- Infisical serves a self-signed certificate, so clients need the CA explicitly.

## License

See [LICENSE](LICENSE).

## Writing

The build is described in more detail in the blog post [I Built a Private Datacenter on a Powerful Workstation](https://new-dev.in/entries/glasswing-pathfinder-private-server).
