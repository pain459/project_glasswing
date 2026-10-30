# Glasswing

A small private datacenter running on one workstation.

Glasswing is the platform that runs on **Pathfinder**, a repurposed desktop with an RTX 4090, 128 GB of RAM, and a Ryzen 9 7950X. It hosts local AI, developer tooling, media services, observability, and encrypted backups. Every service runs on hardware I own, on a network I control. Nothing is rented, and no application data leaves the LAN.

The design goal is not maximum service count. It is a platform that stays understandable after the twentieth application: predictable commands, visible boundaries, telemetry that actually arrives, and a recovery path that has been tested.

## Contents

- [Design principles](#design-principles)
- [Hardware](#hardware)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
  - [Rebuild from scratch](#rebuild-from-scratch)
- [Everyday commands](#everyday-commands)
- [Stacks](#stacks)
- [Image management](#image-management)
- [Secrets and Configuration](#secrets-and-configuration)
  - [How secret injection works](#how-secret-injection-works)
  - [Global variables](#global-variables)
  - [Per-stack secrets](#per-stack-secrets)
  - [Variables intentionally excluded](#variables-intentionally-excluded)
  - [Managing secrets via the Infisical API](#managing-secrets-via-the-infisical-api)
- [Observability](#observability)
- [Backups](#backups)
- [Verification](#verification)
- [Known limitations](#known-limitations)
- [Related documents](#related-documents)

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
./scripts/02-bootstrap.sh        # packages, Docker Engine, Compose plugin, docker group
./scripts/03-gpu-setup.sh        # NVIDIA driver, Container Toolkit, docker runtime
./scripts/01-mount-drives.sh     # mount and verify /mnt/storage and /mnt/cold (sudo)
```

Run `02` first (it installs the tools the others use), reconnect after the
`docker` group change, and mount storage before any stack starts.

### Rebuild from scratch

[REBUILD.md](REBUILD.md) is the complete procedure: host preparation, storage,
the gitignored bootstrap file and TLS material, the first Infisical start, the
operator secret values you must supply, the parallel rollout, and a verification
checklist. Everything below assumes those phases are done.

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

The wrapper also expects the Infisical certificate at
`stacks/infisical/tls/cert.pem` and verifies it with `--cacert`. It authenticates
with universal auth, fetches only the keys listed in each stack's `secrets.list`,
exports them for a single `docker compose` command, and exits.

Two more artefacts are host-local and gitignored: `stacks/infisical/.env` (the
bootstrap values Infisical cannot read from itself — copy
`stacks/infisical/.env.example`) and the TLS material created by
`make certificates`. See [REBUILD.md](REBUILD.md) for the exact commands.

### Host address

Every published port binds to a single LAN address, `GLASSWING_HOST_IP`. Because
Infisical cannot supply its own bootstrap configuration, that value also lives in
the gitignored `stacks/infisical/.env`:

```
GLASSWING_HOST_IP=192.168.68.62
```

The Makefile exports it to every stack and the compose files require it
(`"${GLASSWING_HOST_IP:?GLASSWING_HOST_IP is required}:3006:3000"`), so `make up`
fails loudly instead of silently binding the wrong interface. `/global` in
Infisical holds the same value for runtime use. `make access` writes
[ACCESS.md](ACCESS.md) with the resulting IP:port URL for every service.

The certificates cover that address too: after changing it, run
`./scripts/04-certificates.sh --force` and redeploy Infisical and Portainer.

### Start the core

```bash
make core                        # Infisical, then Homepage
make secrets-check               # verify authentication and secret injection
```

On a fresh host, register the secrets first ([REBUILD.md](REBUILD.md) phases 5–6):
`make core` fails fast when Infisical has no values to inject.

Then bring up individual stacks, or reconcile everything:

```bash
make up STACK=ollama
make restart-all
```

## Everyday commands

| Command | Effect |
| --- | --- |
| `make help` | List available targets |
| `make up STACK=name` | Validate, inject secrets, start, run stack hooks, wait for health |
| `make down STACK=name` | Stop and remove a stack's containers |
| `make restart STACK=name` | Restart a stack's containers |
| `make logs STACK=name` | Follow a stack's logs |
| `make ps STACK=name` | Show a stack's status |
| `make check STACK=name` | Validate Compose config, then show status |
| `make status` | Show every running container |
| `make list-stacks` | List discovered stacks |
| `make ollama-model` | Rebuild the coding model from its checked-in Modelfile |
| `make ai-preflight` | Validate GPU access, Ollama settings, model limits, and OpenCode connectivity |
| `make mcp-preflight` | Complete an MCP handshake and list tools on all three host-only endpoints |
| `make doctor` | Preflight host IP, Docker pool headroom, port collisions, hardcoded IPs, orphan networks, restart loops, Infisical |
| `make network` | Create the shared `glasswing` bridge (explicit subnet, no pool slot) |
| `make docker-pool` | Widen Docker's address pool to 4096 networks (sudo; restarts Docker) |
| `make access` | Regenerate `ACCESS.md` from the compose port bindings |
| `make secrets-plan` | List the keys still to supply, or emit blank registries (`--template`) |
| `make certificates` | Create the local CA, Infisical and Portainer certificates |
| `make certificates-check` | Verify the certificates cover the host IP and are current |
| `make access-check` | Fail if `ACCESS.md` is out of date |
| `make restart-all [JOBS=n]` | Redeploy every stack; Infisical and Ollama first, then n at a time |

`make restart-all` uses `docker compose up`, not `docker restart`. Changed environment variables are applied, not ignored.

It starts Infisical first (every other stack needs its secrets), then Ollama
(the host coding agent's inference backend), then deploys the rest
`JOBS` at a time (default 4) with per-stack logs. A failing stack prints its log
and makes the target exit non-zero without stopping the other deploys.

Every lifecycle target calls the same `run_compose` macro. It validates the stack name, decides whether the stack declares secrets, injects them through `scripts/with-infisical.sh`, and runs one Compose command. Secret injection is therefore not something a target can forget.

`up` also runs optional hooks owned by the stack: `stacks/<name>/pre-up.sh` before the Compose command and `stacks/<name>/post-up.sh` once the stack is healthy. Setup and validation live next to the stack instead of in extra top-level commands:

- `make up STACK=ollama` starts Ollama, pulls the base model if it is missing, applies the checked-in Modelfile, and validates GPU access, runtime flags, model limits, and a non-truncated coding response.
- `make up STACK=open-notebook-mcp`, `make up STACK=steel-mcp`, and `make up STACK=serena` each start one MCP service and run a protocol-level post-up check.

`make ollama-model` and `make ai-preflight` remain available for re-running one step without a redeploy.

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
| `calculators` | 3021 | Math, finance, and conversion calculators |
| `datetime` | 3022 | World clock & time zones (self-hosted datetime.app) |
| `it-tools` | 3015 | Small utilities |
| `stirling-pdf` | 3016 | PDF operations |
| `kavita` | 3017 | Book library |
| `openobserve` | 3018 | Logs, metrics, traces |
| `jupyterlab` | 8889 | GPU notebooks |
| `open-notebook` | 8502, 5055 | Research workflows |
| `open-notebook-mcp` | 127.0.0.1:8001 | Host-only Open Notebook MCP |
| `steel-mcp` | 127.0.0.1:8002 | Host-only browser MCP |
| `serena` | 127.0.0.1:9121, 127.0.0.1:24282 | Host-only code intelligence MCP and dashboard |
| `beszel` | 8090 | Host health |
| `glances` | 61208 | Host system monitor (feeds Homepage widgets) |
| `portainer` | 9443 | Container management |
| `plex` | 32400 (host network) | Media server |
| `otel-collector` | 4318, 13133 | Telemetry ingestion |
| `vector` | 8686 | Docker log shipping |
| `infisical` | 8095 | Secrets management |
| `steel` | 3100, 9223 | Cloud browser automation (UI and CDP) |
| `dagu` | 3014 | Workflow orchestrator (scheduled DAGs for updates, health checks) |
| `postgres` | 5432 | Shared PostgreSQL used by DBGate and ad-hoc tooling |

LAN services bind to `GLASSWING_HOST_IP`, not to `0.0.0.0`. The four MCP-related
ports shown with `127.0.0.1` are deliberately host-only. [ACCESS.md](ACCESS.md)
is the generated, complete list of URLs: `make access` rebuilds it from the
compose files and `make access-check` fails when it is stale.

Shared service defaults — restart policy, log rotation, and the opt-in
`no-new-privileges` setting — live in `stacks/base.yaml` and reach each service
through `extends`. See [Compose conventions](MAINTENANCE.md#compose-conventions).

The host-installed OpenCode binary is `/home/ravik/.opencode/bin/opencode`; there is
no OpenCode container or web UI. Its global configuration at
`/home/ravik/.config/opencode/opencode.json` selects the local Ollama model and
connects to three remote MCP servers on loopback. The non-secret, restorable
reference is `config/opencode/opencode.example.json`.

| MCP | Endpoint | Lifecycle | Infisical path |
| --- | --- | --- | --- |
| Open Notebook | `http://127.0.0.1:8001/mcp` | `make up STACK=open-notebook-mcp` | `/open-notebook` |
| Steel | `http://127.0.0.1:8002/mcp` | `make up STACK=steel-mcp` | `/steel` (global values only for the gateway) |
| Serena | `http://127.0.0.1:9121/mcp` | `make up STACK=serena` | `/serena` (global values only) |

Serena maps `/home/ravik/src_git` at `/workspace/repos`. Copy
`stacks/serena/compose.override.example.yaml` to `compose.override.yaml` to add
other repository roots without editing the base stack. Run `make mcp-preflight`
after changing any MCP stack and `make ai-preflight` after changing the native
OpenCode or Ollama configuration.

Ollama and host OpenCode share one inference baseline: 131k context, 32k
generation, temperature 0.3, thinking disabled, and a `q8_0` KV cache with
flash attention. `make ai-preflight` validates the container settings, effective
host OpenCode model configuration, and a real standalone prompt.

## Image management

Most Docker images are pinned to explicit version tags. A few stacks use mutable tags (`:latest`, `:public`, `:4`, etc.) for automatic updates.

### Automated updates (Dagu)

The **Dagu** workflow orchestrator at `http://192.168.68.62:3014` runs a scheduled DAG every Sunday at 05:00 that safely updates images with health verification and rollback:

- **Mutable tags** (`:latest`, `:public`, `:lts`, `:2`, `:4`, etc.) — pull new image, restart the stack, verify health for ~5 minutes, roll back automatically if broken.
- **Pinned tags** (`:2.24.0`, `:v2.7.0`, etc.) — check for newer version in the registry and report if available. No automatic update (compose.yaml must be edited and committed).
- **Critical infrastructure** (Infisical, OTel Collector, Vector, Postgres, Dagu itself) — excluded entirely. Update those manually.

The DAG always succeeds even when individual stacks fail; partial failures are reported in the logs and summary. Review Dagu run history at `http://192.168.68.62:3014` or trigger a manual run from the UI.

The update logic lives in `scripts/update-stacks.sh`. It can also be run standalone:

```bash
# Full run
./scripts/update-stacks.sh

# Report only, no changes
./scripts/update-stacks.sh --dry-run

# Single stack
./scripts/update-stacks.sh STACK_NAME
```

### Manual updates

For pinned-tag stacks, or when you want controlled, reviewed updates:

```bash
# 1. Bump the tag in compose.yaml (shows diff before applying)
./scripts/bump-image.sh ollama 0.40.11 0.40.12

# 2. Commit the change
git add stacks/ollama/compose.yaml
git commit -m "bump: ollama to 0.40.12"

# 3. Deploy and verify
make up STACK=ollama
make check STACK=ollama

# 4. Rollback if needed
git revert HEAD
make up STACK=ollama
```

### Checking for updates

```bash
# Terminal: compare running images against registry
./scripts/check-updates.sh

# UI: browse Portainer at https://192.168.68.62:9443
# The Images tab shows orange badges for containers with newer images available

# UI: Dagu at http://192.168.68.62:3014
# The staged-image-update DAG run logs show per-stack update results
```

### Inspecting running images

```bash
# Show what image each stack container is actually running
./scripts/inspect-images.sh

# Show a specific stack
./scripts/inspect-images.sh ollama
```

Portainer at `:9443` serves as a read-only dashboard. It monitors containers and detects available updates, but does not manage stacks. Git remains the source of truth for all configuration.

## Secrets and Configuration

Every ordinary stack loads its secrets and configuration from Infisical at
startup. Infisical itself uses its bootstrap file, and host OpenCode uses the
non-secret host configuration described above.

### How secret injection works

```
.local/infisical/credentials.env  →  with-infisical.sh  →  secrets.list  →  docker compose
       (git-ignored)                    (fetches by name)    (per stack)      (receives env)
```

1. `scripts/with-infisical.sh` reads the machine identity from `.local/infisical/credentials.env`
2. It authenticates to the Infisical API using universal auth
3. It fetches global secrets from the `/global` Infisical path (listed in `stacks/global-secrets.list`)
4. It fetches stack-specific secrets from `/<stack>` (or the path overridden by `INFISICAL_PATH`)
5. All fetched values are exported as environment variables for a single `docker compose` command, then the wrapper exits

Every `make` lifecycle target (`up`, `down`, `restart`, `logs`, `ps`, `check`) runs through the same `run_compose` macro, which validates the stack name, decides whether the stack declares secrets, and injects them through the wrapper. Secret injection cannot be forgotten.

### Global variables

The `/global` Infisical path holds variables shared by all stacks. They are loaded automatically before any stack-specific secrets:

| Variable | Purpose |
| --- | --- |
| `GLASSWING_TZ` | Timezone (used as `TZ` in all stacks) |
| `GLASSWING_HOST_IP` | LAN IP address for port bindings |
| `GLASSWING_PUID` | Host user ID for container mappings |
| `GLASSWING_PGID` | Host group ID for container mappings |
| `OTEL_*` (6 variables) | OpenTelemetry collector configuration |

Global variables are registered via `stacks/global-secrets.registry` and managed through `scripts/infisical-register.sh`.

### Per-stack secrets

Each stack declares its needed keys in `stacks/<name>/secrets.list` (one key per line, `#` for comments). The corresponding values are stored in Infisical under the `/<stack>` path, or a custom path when `INFISICAL_PATH` is set in the Makefile.

Compose files reference variables with `${VAR:?Required from Infisical}` so they fail fast if a value is missing:

```yaml
environment:
  ZO_ROOT_USER_PASSWORD: ${ZO_ROOT_USER_PASSWORD:?Required from Infisical}
```

This is deliberate. A service should refuse to start with a blank password rather than run with an insecure default.

Secret values are registered via `stacks/<name>/*.registry` files and managed through `scripts/infisical-register.sh`, which uses POST to create and PATCH to update (upsert semantics).

### Variables intentionally excluded

A small number of variables are kept outside Infisical by design:

- **`DOCKER_GID`** — Host-specific, set at Makefile runtime via `$(getent group docker | cut -d: -f3)`
- **`OTEL_SERVICE_NAME`** — Varies per stack, set inline in each compose file
- **Bootstrap files** — Infisical's own `.env`, TLS certificates, CA key, and Restic password are host bootstrap artifacts, not runtime secrets

### Managing secrets via the Infisical API

The Infisical instance at `https://192.168.68.62:8095` exposes a REST API. All operations use universal auth with the machine identity credentials.

#### Authentication

```bash
INFISICAL_URL="https://192.168.68.62:8095"
INFISICAL_PROJECT_ID="4e0e2d1e-8e10-4a5f-8487-cdae84daaf6c"
INFISICAL_ENV="prod"

# Login and get access token
TOKEN=$(curl -s -k "$INFISICAL_URL/api/v1/auth/universal-auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'"$(grep INFISICAL_CLIENT_ID .local/infisical/credentials.env | cut -d= -f2)"'",
    "clientSecret": "'"$(grep INFISICAL_CLIENT_SECRET .local/infisical/credentials.env | cut -d= -f2)"'"
  }' | jq -r '.data.accessToken')
```

#### Create a secret (POST)

```bash
curl -s -k "$INFISICAL_URL/api/v4/secrets/my-secret-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"secretKey\": \"MY_SECRET_KEY\",
    \"secretValue\": \"my-secret-value\",
    \"projectId\": \"$INFISICAL_PROJECT_ID\",
    \"environmentId\": \"$(curl -s -k \"$INFISICAL_URL/api/v1/project/environments?projectId=$INFISICAL_PROJECT_ID\" -H \"Authorization: Bearer $TOKEN\" | jq -r '.data[] | select(.name==\"prod\") | ._id')\",
    \"pathId\": \"$(curl -s -k \"$INFISICAL_URL/api/v1/path?projectId=$INFISICAL_PROJECT_ID\" -H \"Authorization: Bearer $TOKEN\" | jq -r '.data[] | select(.pathName==\"/my-stack\") | ._id')\"
  }"
```

#### Update a secret (PATCH)

```bash
curl -s -k -X PATCH "$INFISICAL_URL/api/v4/secrets/my-secret-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"secretValue\": \"updated-value\"
  }"
```

#### Read a secret (GET)

```bash
curl -s -k "$INFISICAL_URL/api/v4/secrets/my-secret-key" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
```

#### Delete a secret (DELETE)

```bash
curl -s -k -X DELETE "$INFISICAL_URL/api/v4/secrets/my-secret-key" \
  -H "Authorization: Bearer $TOKEN"
```

#### Batch upsert with the helper script

For convenience, `scripts/infisical-register.sh` reads a `.registry` file and upserts all entries:

```bash
./scripts/infisical-register.sh /open-notebook stacks/open-notebook/open-notebook-config.registry
```

The script uses POST to create new secrets and PATCH to update existing ones, so it is safe to re-run.

`make secrets-check` proves the injection pipeline works end to end. It verifies the wrapper is executable, reads `tests/infisical-secrets.list`, and asserts that a known test value arrives in the command environment.

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
make secrets-check        # Infisical auth, test secret list, and injection
make secrets-injection-check
make ps STACK=name
```

A green container is not proof a service works. Check the destination too: telemetry must arrive in OpenObserve, and a backup must actually restore.

## Known limitations

- There is no off-host backup copy yet.
- Backup scheduling is manual; systemd timers are planned.
- A full application-state restore has not been attempted end to end. An isolated configuration restore has.
- Remote access is LAN-only. A VPN or tunnel is not configured.
- Infisical serves a self-signed certificate, so clients need the CA explicitly (`make certificates` writes it to `.local/ca/`).
- The hand-entered secret values listed by `make secrets-plan` exist only in Infisical and your offline record. A rebuild without that record means new passwords.
- `steel-browser` has no versioned image tags; it remains on `:latest`. The Dagu update DAG handles rollback for mutable-tag stacks automatically.
- Some mutable-tag stacks (langfuse, steel) have slow startup times that exceed the 120s healthcheck timeout, causing unnecessary rollbacks. The timeout may need adjustment per-stack.

## Related documents

- [ACCESS.md](ACCESS.md) — generated IP:port map for every stack (`make access`)
- **[REBUILD.md](REBUILD.md)** — clean rebuild from a fresh Ubuntu install, phase by phase, with the secrets you must supply.

- **[MAINTENANCE.md](MAINTENANCE.md)** — Daily, weekly, and monthly maintenance tasks. Image updates, secret management, backup operations, troubleshooting, and adding new stacks.
- **[DR_RUNBOOK.md](DR_RUNBOOK.md)** — Disaster recovery procedures for hardware failure, OS reinstall, or complete data loss. Step-by-step recovery from a fresh Ubuntu install.
- **[backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md](backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md)** — Restic backup scope, encryption, restore procedures, and known risks.
- **Dagu Web UI** (`http://192.168.68.62:3014`) — Workflow orchestrator for scheduled image updates and health checks.

## License

See [LICENSE](LICENSE).

## Writing

The build is described in more detail in the blog post [I Built a Private Datacenter on a Powerful Workstation](https://new-dev.in/entries/glasswing-pathfinder-private-server).
