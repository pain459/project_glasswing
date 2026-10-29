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
- [Reverse proxy](#reverse-proxy)
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
make core                        # Infisical, proxy, then Homepage
make secrets-check               # verify authentication and secret injection
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
| `make up STACK=name` | Validate, inject secrets, start, run stack hooks, wait for health |
| `make down STACK=name` | Stop and remove a stack's containers |
| `make restart STACK=name` | Restart a stack's containers |
| `make logs STACK=name` | Follow a stack's logs |
| `make ps STACK=name` | Show a stack's status |
| `make check STACK=name` | Validate Compose config, then show status |
| `make status` | Show every running container |
| `make proxy` | Start the nginx reverse proxy |
| `make proxy-migrate` | Push proxy-era public URLs into Infisical |
| `make list-stacks` | List discovered stacks |
| `make ollama-model` | Rebuild the coding model from its checked-in Modelfile |
| `make ai-preflight` | Validate GPU access, Ollama settings, model limits, and OpenCode connectivity |
| `make restart-all` | Redeploy every stack in order |

`make restart-all` uses `docker compose up`, not `docker restart`. Changed environment variables are applied, not ignored.

Every lifecycle target calls the same `run_compose` macro. It validates the stack name, decides whether the stack declares secrets, injects them through `scripts/with-infisical.sh`, and runs one Compose command. Secret injection is therefore not something a target can forget.

`up` also runs optional hooks owned by the stack: `stacks/<name>/pre-up.sh` before the Compose command and `stacks/<name>/post-up.sh` once the stack is healthy. Setup and validation live next to the stack instead of in extra top-level commands:

- `make up STACK=ollama` starts Ollama, pulls the base model if it is missing, applies the checked-in Modelfile, and validates GPU access, runtime flags, model limits, and a non-truncated coding response.
- `make up STACK=opencode` reconciles the Ollama stack first, starts OpenCode, and validates the full Ollama-to-OpenCode path.

`make ollama-model` and `make ai-preflight` remain available for re-running one step without a redeploy.

`INFISICAL_PATH` overrides the secret path for a stack. The default is `/<stack>`, and the collectors reuse `/openobserve`.

## Stacks

| Stack | URL / direct port | Purpose |
| --- | --- | --- |
| `proxy` | `https://glasswing.lan` (`:80`, `:443`) | nginx reverse proxy and TLS termination |
| `ollama` | `https://ollama.glasswing.lan` (API `:11434`) | Local LLM inference on the RTX 4090 |
| `flowise` | `https://flowise.glasswing.lan` | Visual agent flows |
| `uptime-kuma` | `https://uptime.glasswing.lan` | Availability checks |
| `dbgate` | `https://dbgate.glasswing.lan` | Database client |
| `homepage` | `https://homepage.glasswing.lan` | Dashboard and service map |
| `adguard` | `https://adguard.glasswing.lan` (DNS `:53`) | DNS filtering |
| `excalidraw` | `https://excalidraw.glasswing.lan` | Diagrams |
| `langfuse` | `https://langfuse.glasswing.lan` (media `https://minio.glasswing.lan`) | LLM tracing and evaluation |
| `forgejo` | `https://forgejo.glasswing.lan` (SSH `:2222`) | Self-hosted Git and SSH |
| `anythingllm` | `https://anythingllm.glasswing.lan` | Document chat over local models |
| `cyberchef` | `https://cyberchef.glasswing.lan` | Data transformations |
| `calculators` | `https://calculators.glasswing.lan` | Math, finance, and conversion calculators |
| `it-tools` | `https://it-tools.glasswing.lan` | Small utilities |
| `stirling-pdf` | `https://stirling.glasswing.lan` | PDF operations |
| `kavita` | `https://kavita.glasswing.lan` | Book library |
| `openobserve` | `https://openobserve.glasswing.lan` (ingestion `:3018`) | Logs, metrics, traces |
| `jupyterlab` | `https://jupyter.glasswing.lan` | GPU notebooks |
| `open-notebook` | `https://notebook.glasswing.lan` (API `https://notebook-api.glasswing.lan`) | Research workflows |
| `opencode` | `https://opencode.glasswing.lan` | Web coding agent with Ollama and Open Notebook RAG |
| `beszel` | `https://beszel.glasswing.lan` | Host health |
| `glances` | `https://glances.glasswing.lan` | Host system monitor (feeds Homepage widgets) |
| `portainer` | `https://portainer.glasswing.lan` | Container management |
| `plex` | `http://192.168.68.62:32400/web` (host network) | Media server |
| `otel-collector` | `https://otel.glasswing.lan` (OTLP `:4318`) | Telemetry ingestion |
| `vector` | `https://vector.glasswing.lan` | Docker log shipping |
| `infisical` | `https://infisical.glasswing.lan` (bootstrap `:8095`) | Secrets management |
| `steel` | `https://steel.glasswing.lan` (API `:3100`, CDP `:9223`) | Cloud browser automation |
| `dagu` | `https://dagu.glasswing.lan` (host `:3014`) | Workflow orchestrator (scheduled DAGs for updates, health checks) |

Web traffic uses one entry point: `https://<service>.glasswing.lan`. Ports that
remain direct are protocols or fixed endpoints that cannot move cleanly (DNS,
SSH, Plex, OTLP, PostgreSQL, the Ollama API used by host-side tooling, Steel
API/CDP), plus the Infisical bootstrap gateway and Dagu's host-network
coordinator. See [stacks/proxy/README.md](stacks/proxy/README.md) for the full
routing and exception table.

`opencode` uses Open Notebook as a retrieval layer for context beyond the model window. See `stacks/opencode/README.md` for the required secrets, access details, and RAG workflow.

That stack also mounts `/home/ravik`, `/mnt/storage` and `/mnt/cold` read-write at their real paths. The container runs as `1000:1000`, the same uid and gid as `ravik` on Pathfinder, so the agent works on the repositories and files in place instead of a copy. Anything `ravik` can change, the agent can change; see the security notes in `stacks/opencode/README.md`.

`ollama` and `opencode` share one inference baseline: 131k context, 32k
generation, temperature 0.3, thinking disabled, and a `q8_0` KV cache with
flash attention. The numbers must agree in both stacks; see
`stacks/ollama/README.md` and
`stacks/opencode/README.md#inference-baseline`. `make up STACK=opencode`
reconciles Ollama first and runs the preflight automatically, including GPU
residency.

## Reverse proxy

Every web UI now sits behind one nginx container, `glasswing-proxy`, on ports
**80** and **443**. Services join the shared `glasswing-proxy` Docker network
and drop their published HTTP ports; the exceptions are listed below. nginx
routes by hostname:

```
https://glasswing.lan          -> Homepage
https://forgejo.glasswing.lan  -> Forgejo
https://opencode.glasswing.lan -> OpenCode
```

Hostname routing is deliberate. Path prefixes break the SPAs in the stack
(Excalidraw, CyberChef, IT-Tools, Calculators), so each service keeps its
natural root path.

**DNS:** add two rewrites in AdGuard Home (a wildcard does not match the apex):
`glasswing.lan -> 192.168.68.62` and `*.glasswing.lan -> 192.168.68.62`.
Clients that do not use AdGuard need a hosts entry.

**TLS:** `scripts/gen-proxy-cert.sh` issues a certificate for `glasswing.lan`
and `*.glasswing.lan` from the existing Glasswing CA in `.local/ca`. Trust
`.local/ca/glasswing-ca.crt` on client devices. The certificate and key live in
`stacks/proxy/certs/` and are git-ignored.

**First deployment or migration:**

```bash
make up STACK=proxy     # create the shared network and certificate, start nginx
make proxy-migrate      # push new public URLs into Infisical
# add the AdGuard rewrites now, while AdGuard still has its old port
make restart-all        # recreate every stack on the shared network
```

Add both rewrites before `make restart-all`: AdGuard's own UI moves
behind the proxy in that step, so the rewrite must already resolve. Then open
`https://glasswing.lan`. Until a stack has been recreated on the shared
network, its route returns `502`.

**Ports that stay direct:** DNS (`53`), Forgejo SSH (`2222`), Plex (`32400`,
host network), PostgreSQL (`5432`), OTLP ingestion (`4318`), OpenObserve
ingestion (`3018`), Ollama API (`11434`), Steel API/CDP (`3100`, `9223`),
Infisical bootstrap (`8095`), and Dagu (`3014`, host network). Everything else
is behind `:443`.

The full routing table, certificate renewal, adding a new service, and
troubleshooting are in [stacks/proxy/README.md](stacks/proxy/README.md).

## Image management

Most Docker images are pinned to explicit version tags. A few stacks use mutable tags (`:latest`, `:public`, `:4`, etc.) for automatic updates.

### Automated updates (Dagu)

The **Dagu** workflow orchestrator at `https://dagu.glasswing.lan` runs a scheduled DAG every Sunday at 05:00 that safely updates images with health verification and rollback:

- **Mutable tags** (`:latest`, `:public`, `:lts`, `:2`, `:4`, etc.) — pull new image, restart the stack, verify health for ~5 minutes, roll back automatically if broken.
- **Pinned tags** (`:2.24.0`, `:v2.7.0`, etc.) — check for newer version in the registry and report if available. No automatic update (compose.yaml must be edited and committed).
- **Critical infrastructure** (Infisical, OTel Collector, Vector, Postgres, Dagu itself) — excluded entirely. Update those manually.

The DAG always succeeds even when individual stacks fail; partial failures are reported in the logs and summary. Review Dagu run history at `https://dagu.glasswing.lan` or trigger a manual run from the UI.

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

# UI: browse Portainer at https://portainer.glasswing.lan
# The Images tab shows orange badges for containers with newer images available

# UI: Dagu at https://dagu.glasswing.lan
# The staged-image-update DAG run logs show per-stack update results
```

### Inspecting running images

```bash
# Show what image each stack container is actually running
./scripts/inspect-images.sh

# Show a specific stack
./scripts/inspect-images.sh ollama
```

Portainer at `https://portainer.glasswing.lan` serves as a read-only dashboard. It monitors containers and detects available updates, but does not manage stacks. Git remains the source of truth for all configuration.

## Secrets and Configuration

All 25 stacks load their secrets and configuration from Infisical at startup. No hardcoded passwords, API keys, or configuration values remain in compose files.

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

The Infisical instance exposes a REST API. The bootstrap endpoint remains
`https://192.168.68.62:8095` because `make` secret injection and the wrapper's
CA pinning depend on it; the UI is also available at
`https://infisical.glasswing.lan`. All operations use universal auth with the
machine identity credentials.

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
./scripts/infisical-register.sh stacks/opencode/opencode.registry
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

- `GLASSWING_HOST_IP` is registered in Infisical `/global`. The proxy uses it for `:80`/`:443`; some direct-port stacks still hardcode `192.168.68.62`. Full parameterization is pending.
- Plex and Dagu use host networking, so their native ports (`32400`, `3014`) stay direct; the proxy also reaches them through `host.docker.internal`.
- The DNS rewrites (`glasswing.lan` and `*.glasswing.lan`) are manual AdGuard Home steps.
- Homepage widgets and site monitors use internal container names (plain HTTP where the service allows it), so the dashboard does not depend on the DNS rewrites or on the proxy being up. Public links still use HTTPS.
- There is no off-host backup copy yet.
- Backup scheduling is manual; systemd timers are planned.
- A full application-state restore has not been attempted end to end. An isolated configuration restore has.
- Remote access is LAN-only. A VPN or tunnel is not configured.
- Infisical serves a self-signed certificate, so clients need the CA explicitly.
- `steel-browser` has no versioned image tags; it remains on `:latest`. The Dagu update DAG handles rollback for mutable-tag stacks automatically.
- Some mutable-tag stacks (langfuse, steel) have slow startup times that exceed the 120s healthcheck timeout, causing unnecessary rollbacks. The timeout may need adjustment per-stack.

## Related documents

- **[MAINTENANCE.md](MAINTENANCE.md)** — Daily, weekly, and monthly maintenance tasks. Image updates, secret management, backup operations, troubleshooting, and adding new stacks.
- **[DR_RUNBOOK.md](DR_RUNBOOK.md)** — Disaster recovery procedures for hardware failure, OS reinstall, or complete data loss. Step-by-step recovery from a fresh Ubuntu install.
- **[backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md](backup/GLASSWING_RESTIC_BACKUP_RUNBOOK.md)** — Restic backup scope, encryption, restore procedures, and known risks.
- **Dagu Web UI** (`https://dagu.glasswing.lan`) — Workflow orchestrator for scheduled image updates and health checks.
- **[stacks/proxy/README.md](stacks/proxy/README.md)** — Reverse proxy routing table, DNS rewrite, TLS certificate renewal, and troubleshooting.

## License

See [LICENSE](LICENSE).

## Writing

The build is described in more detail in the blog post [I Built a Private Datacenter on a Powerful Workstation](https://new-dev.in/entries/glasswing-pathfinder-private-server).
