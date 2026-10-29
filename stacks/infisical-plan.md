# Infisical Migration Plan — Glasswing Stack

> **Status: implemented.** This document is kept as the design record and as the
> per-stack variable inventory that was used to build the migration. The
> operative procedure is [REBUILD.md](../REBUILD.md) (phases 5–6) and
> `MAINTENANCE.md`. Anything below that describes a future phase has been done;
> see [Implementation Strategy](#8-implementation-strategy) for what replaced it.

> **Goal:** Move every secret and configurable variable out of compose files, `.env` files, and host paths into Infisical. Load them at startup via `scripts/with-infisical.sh`.

---

## How the System Works Today

### Secret injection pipeline

```
.local/infisical/credentials.env  →  with-infisical.sh  →  secrets.list  →  docker compose
       (git-ignored)                    (fetches by name)    (per stack)      (receives env)
```

1. `scripts/with-infisical.sh` reads machine identity from `.local/infisical/credentials.env`
2. It authenticates to the Infisical API and fetches each secret named in `<stack>/secrets.list`
3. Secrets are exported as environment variables, then `docker compose` runs
4. Compose files reference them via `${VAR:?Required from Infisical}`

### What's already working

28 of 29 stacks have a `secrets.list` and load their variables from Infisical at
startup. The exception is `infisical` itself, which is configured from the
gitignored `stacks/infisical/.env` (and its committed `.env.example`) because it
cannot fetch its own secrets.

`make secrets-plan` prints the current split: the committed `*.registry` values
(non-secret configuration) versus the keys only the operator can supply. That
report, not the counts below, is authoritative.

---

## Inventory at design time (pre-migration snapshot)

The `Current` column records how each variable was configured *before* the
migration. Everything marked 📋 was subsequently moved to Infisical and now lives
in the stack's `secrets.list` / `*.registry`.

### Legend

| Marker | Meaning |
|--------|---------|
| 🔒 | **SECRET** — password, token, key, credential |
| ⚙️ | **CONFIG** — port, IP, path, feature flag, user setting |
| ✅ | Already in Infisical via `secrets.list` |
| 📋 | Was to be moved — done, see the stack's `secrets.list` |
| ⏭️ | Intentionally NOT in Infisical (see rationale) |
| 🔁 | Shared across stacks (defined once, used many places) |

---

## 1. Infrastructure & Platform

### `infisical` — Secret Management Server

**Status:** Bootstrap-only. Cannot use Infisical to manage itself (chicken-and-egg).

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `POSTGRES_PASSWORD` | 🔒 | `stacks/infisical/.env` | ⏭️ Bootstrap. Keep in `.env`. |
| `ENCRYPTION_KEY` | 🔒 | `stacks/infisical/.env` | ⏭️ Bootstrap. Keep in `.env`. |
| `AUTH_SECRET` | 🔒 | `stacks/infisical/.env` | ⏭️ Bootstrap. Keep in `.env`. |
| `SITE_URL` | ⚙️ | `stacks/infisical/.env` | ⏭️ Bootstrap. Keep in `.env`. |
| `GLASSWING_HOST_IP` | ⚙️ | `stacks/infisical/.env` | ⏭️ Bootstrap. Keep in `.env`; the Makefile exports it to every stack. |
| TLS `cert.pem` / `key.pem` | 🔒 | `stacks/infisical/tls/` | ⏭️ File-based. Nginx mounts directly. |

**Rationale:** Infisical's own `.env` is the bootstrap file. It must exist before Infisical runs. These values are git-ignored and never leave the host.

---

### `opencode` — AI Coding Agent

**Status:** ✅ Secrets managed. ⚙️ Config still hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `OPENCODE_SERVER_PASSWORD` | 🔒 | ✅ Infisical `/opencode` | ✅ Done |
| `OPEN_NOTEBOOK_PASSWORD` | 🔒 | ✅ Infisical `/opencode` | ✅ Done |
| `HOME` | ⚙️ | hardcoded `/home/opencode` | ✅ Done |
| `OPENCODE_DISABLE_AUTOUPDATE` | ⚙️ | hardcoded `"1"` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |
| `OPEN_NOTEBOOK_URL` | ⚙️ | hardcoded `http://192.168.68.62:5055` | ✅ Done |
| `HOST` (MCP) | ⚙️ | hardcoded `0.0.0.0` | ✅ Done |
| `PORT` (MCP) | ⚙️ | hardcoded `8000` | ✅ Done |
| `MCP_PATH` | ⚙️ | hardcoded `/mcp` | ✅ Done |
| `STATELESS_HTTP` | ⚙️ | hardcoded `"1"` | ✅ Done |
| `JSON_RESPONSE` | ⚙️ | hardcoded `"1"` | ✅ Done |
| `MCP_ALLOWED_HOSTS` | ⚙️ | hardcoded list | ✅ Done |
| `STEEL_LOCAL` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `STEEL_BASE_URL` | ⚙️ | hardcoded `http://192.168.68.62:3100` | ✅ Done |
| `STEEL_CONNECT_URL` | ⚙️ | hardcoded `ws://192.168.68.62:3100` | ✅ Done |

---

### `open-notebook` — Knowledge Retrieval

**Status:** ✅ Secrets managed. ⚙️ Config still hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `OPEN_NOTEBOOK_ENCRYPTION_KEY` | 🔒 | ✅ Infisical `/open-notebook` | ✅ Done |
| `OPEN_NOTEBOOK_PASSWORD` | 🔒 | ✅ Infisical `/open-notebook` | ✅ Done |
| `SURREAL_PASSWORD` | 🔒 | ✅ Infisical `/open-notebook` | ✅ Done |
| `SURREAL_EXPERIMENTAL_GRAPHQL` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `SURREAL_URL` | ⚙️ | hardcoded `ws://surrealdb:8000/rpc` | ✅ Done |
| `SURREAL_USER` | ⚙️ | hardcoded `root` | ✅ Done |
| `SURREAL_NAMESPACE` | ⚙️ | hardcoded `open_notebook` | ✅ Done |
| `SURREAL_DATABASE` | ⚙️ | hardcoded `open_notebook` | ✅ Done |
| `OPEN_NOTEBOOK_WORKER_MAX_TASKS` | ⚙️ | hardcoded `"2"` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `ollama` — Local LLM Inference

**Status:** No secrets. All config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `OLLAMA_HOST` | ⚙️ | hardcoded `0.0.0.0:11434` | ✅ Done |
| `OLLAMA_KEEP_ALIVE` | ⚙️ | hardcoded `30m` | ✅ Done |
| `OLLAMA_MODELS` | ⚙️ | hardcoded `/root/.ollama` | ✅ Done |
| `OLLAMA_FLASH_ATTENTION` | ⚙️ | hardcoded `"1"` | ✅ Done |
| `OLLAMA_KV_CACHE_TYPE` | ⚙️ | hardcoded `q8_0` | ✅ Done |
| `OLLAMA_NUM_PARALLEL` | ⚙️ | hardcoded `"1"` | ✅ Done |
| `OLLAMA_MAX_LOADED_MODELS` | ⚙️ | hardcoded `"1"` | ✅ Done |
| `OTEL_SERVICE_NAME` | ⚙️ | hardcoded `glasswing-ollama` | 🔁 Global — see §6 |

---

## 2. AI & Development Tools

### `anythingllm` — Document Chat

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `JWT_SECRET` | 🔒 | ✅ Infisical `/anythingllm` | ✅ Done |
| `STORAGE_DIR` | ⚙️ | hardcoded `/app/server/storage` | ✅ Done |
| `LLM_PROVIDER` | ⚙️ | hardcoded `ollama` | ✅ Done |
| `OLLAMA_BASE_PATH` | ⚙️ | hardcoded `http://192.168.68.62:11434` | ✅ Done |
| `EMBEDDING_ENGINE` | ⚙️ | hardcoded `ollama` | ✅ Done |
| `EMBEDDING_BASE_PATH` | ⚙️ | hardcoded `http://192.168.68.62:11434` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `flowise` — AI Workflow Builder

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `FLOWISE_SECRETKEY_OVERWRITE` | 🔒 | ✅ Infisical `/flowise` | ✅ Done |
| `JWT_AUTH_TOKEN_SECRET` | 🔒 | ✅ Infisical `/flowise` | ✅ Done |
| `JWT_REFRESH_TOKEN_SECRET` | 🔒 | ✅ Infisical `/flowise` | ✅ Done |
| `PORT` | ⚙️ | hardcoded `3000` | ✅ Done |
| `APP_URL` | ⚙️ | hardcoded `http://192.168.68.62:3002` | ✅ Done |
| `DATABASE_TYPE` | ⚙️ | hardcoded `sqlite` | ✅ Done |
| `DATABASE_PATH` | ⚙️ | hardcoded `/home/node/.flowise` | ✅ Done |
| `SECRETKEY_PATH` | ⚙️ | hardcoded `/home/node/.flowise` | ✅ Done |
| `LOG_PATH` | ⚙️ | hardcoded `/home/node/.flowise/logs` | ✅ Done |
| `BLOB_STORAGE_PATH` | ⚙️ | hardcoded `/home/node/.flowise/storage` | ✅ Done |
| `DISABLE_FLOWISE_TELEMETRY` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `jupyterlab` — Data Science Notebook

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `JUPYTER_TOKEN` | 🔒 | ✅ Infisical `/jupyterlab` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `langfuse` — LLM Observability

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `LANGFUSE_POSTGRES_PASSWORD` | 🔒 | ✅ Infisical `/langfuse` | ✅ Done |
| `LANGFUSE_CLICKHOUSE_PASSWORD` | 🔒 | ✅ Infisical `/langfuse` | ✅ Done |
| `LANGFUSE_REDIS_PASSWORD` | 🔒 | ✅ Infisical `/langfuse` | ✅ Done |
| `LANGFUSE_MINIO_PASSWORD` | 🔒 | ✅ Infisical `/langfuse` | ✅ Done |
| `LANGFUSE_NEXTAUTH_SECRET` | 🔒 | ✅ Infisical `/langfuse` | ✅ Done |
| `LANGFUSE_SALT` | 🔒 | ✅ Infisical `/langfuse` | ✅ Done |
| `LANGFUSE_ENCRYPTION_KEY` | 🔒 | ✅ Infisical `/langfuse` | ✅ Done |
| `HOSTNAME` | ⚙️ | hardcoded `0.0.0.0` | ✅ Done |
| `NEXTAUTH_URL` | ⚙️ | hardcoded `http://192.168.68.62:3010` | ✅ Done |
| `CLICKHOUSE_URL` | ⚙️ | hardcoded `http://clickhouse:8123` | ✅ Done |
| `CLICKHOUSE_MIGRATION_URL` | ⚙️ | hardcoded `clickhouse://clickhouse:9000` | ✅ Done |
| `CLICKHOUSE_USER` | ⚙️ | hardcoded `langfuse` | ✅ Done |
| `CLICKHOUSE_CLUSTER_ENABLED` | ⚙️ | hardcoded `"false"` | ✅ Done |
| `REDIS_HOST` | ⚙️ | hardcoded `redis` | ✅ Done |
| `REDIS_PORT` | ⚙️ | hardcoded `6379` | ✅ Done |
| `LANGFUSE_S3_*` (event upload) | ⚙️ | hardcoded bucket/region/endpoint | ✅ Done |
| `LANGFUSE_S3_*` (media upload) | ⚙️ | hardcoded bucket/region/endpoint | ✅ Done |
| `TELEMETRY_ENABLED` | ⚙️ | hardcoded `"false"` | ✅ Done |
| `POSTGRES_USER` | ⚙️ | hardcoded `langfuse` | ✅ Done |
| `POSTGRES_DB` | ⚙️ | hardcoded `langfuse` | ✅ Done |
| `CLICKHOUSE_DB` | ⚙️ | hardcoded `default` | ✅ Done |
| `MINIO_ROOT_USER` | ⚙️ | hardcoded `langfuse` | ✅ Done |

---

## 3. Monitoring & Observability

### `openobserve` — Log & Metrics Platform

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `ZO_ROOT_USER_EMAIL` | 🔒 | ✅ Infisical `/openobserve` | ✅ Done |
| `ZO_ROOT_USER_PASSWORD` | 🔒 | ✅ Infisical `/openobserve` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |
| `ZO_LOCAL_MODE` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `ZO_DATA_DIR` | ⚙️ | hardcoded `/data` | ✅ Done |
| `ZO_COMPACT_ENABLED` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `ZO_COMPACT_DATA_RETENTION_DAYS` | ⚙️ | hardcoded `"10"` | ✅ Done |

---

### `otel-collector` — OpenTelemetry Collector

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `ZO_ROOT_USER_EMAIL` | 🔒 | ✅ Infisical `/openobserve` (shared) | ✅ Done |
| `ZO_ROOT_USER_PASSWORD` | 🔒 | ✅ Infisical `/openobserve` (shared) | ✅ Done |
| `DOCKER_GID` | ⚙️ | resolved at runtime via Makefile | ⏭️ Host-specific. Keep as Makefile var. |

---

### `vector` — Log Shipper

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `ZO_ROOT_USER_EMAIL` | 🔒 | ✅ Infisical `/openobserve` (shared) | ✅ Done |
| `ZO_ROOT_USER_PASSWORD` | 🔒 | ✅ Infisical `/openobserve` (shared) | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |
| `DOCKER_HOST` | ⚙️ | hardcoded `unix:///var/run/docker.sock` | ✅ Done |
| `VECTOR_DANGEROUSLY_ALLOW_ENV_VAR_INTERPOLATION` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `DOCKER_GID` | ⚙️ | resolved at runtime via Makefile | ⏭️ Host-specific. Keep as Makefile var. |

---

### `beszel` — System Monitoring

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `APP_URL` | ⚙️ | hardcoded `http://192.168.68.62:8090` | ✅ Done |

---

### `uptime-kuma` — Uptime Monitoring

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

## 4. Services & Applications

### `dbgate` — Database GUI

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `DBGATE_USERNAME` | 🔒 | ✅ Infisical `/dbgate` | ✅ Done |
| `DBGATE_PASSWORD` | 🔒 | ✅ Infisical `/dbgate` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `stirling-pdf` — PDF Tools

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `STIRLING_ADMIN_USERNAME` | 🔒 | ✅ Infisical `/stirling-pdf` | ✅ Done |
| `STIRLING_ADMIN_PASSWORD` | 🔒 | ✅ Infisical `/stirling-pdf` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | ✅ Done |
| `PUID` | ⚙️ | hardcoded `1000` | ✅ Done |
| `PGID` | ⚙️ | hardcoded `1000` | ✅ Done |
| `SECURITY_ENABLELOGIN` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `SYSTEM_DEFAULTLOCALE` | ⚙️ | hardcoded `en-US` | ✅ Done |

---

### `steel` — Self-hosted Browser

**Status:** ✅ All variables in Infisical (including config).

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| bind address | ⚙️ | `/global GLASSWING_HOST_IP` | ✅ Done (no `STEEL_BIND_IP`; the host IP is global) |
| `STEEL_PORT` | ⚙️ | ✅ Infisical `/steel` | ✅ Done |
| `STEEL_LOG_STORAGE_ENABLED` | ⚙️ | ✅ Infisical `/steel` | ✅ Done |
| `STEEL_LOG_STORAGE_PATH` | ⚙️ | ✅ Infisical `/steel` | ✅ Done |
| `NODE_ENV` | ⚙️ | ✅ Infisical `/steel` (`STEEL_NODE_ENV`) | ✅ Done |

---

### `forgejo` — Git Server

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `USER_UID` | ⚙️ | hardcoded `1000` | ✅ Done |
| `USER_GID` | ⚙️ | hardcoded `1000` | ✅ Done |
| `FORGEJO__server__DOMAIN` | ⚙️ | hardcoded `192.168.68.62` | ✅ Done |
| `FORGEJO__server__ROOT_URL` | ⚙️ | hardcoded `http://192.168.68.62:3011/` | ✅ Done |
| `FORGEJO__server__SSH_DOMAIN` | ⚙️ | hardcoded `192.168.68.62` | ✅ Done |
| `FORGEJO__server__SSH_PORT` | ⚙️ | hardcoded `2222` | ✅ Done |
| `FORGEJO__service__DISABLE_REGISTRATION` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `FORGEJO__service__REQUIRE_SIGNIN_VIEW` | ⚙️ | hardcoded `"true"` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `homepage` — Dashboard

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `HOMEPAGE_ALLOWED_HOSTS` | ⚙️ | hardcoded `192.168.68.62:3006,...` | ✅ Done |
| `PUID` | ⚙️ | hardcoded `1000` | ✅ Done |
| `PGID` | ⚙️ | hardcoded `1000` | ✅ Done |

---

### `plex` — Media Server

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |
| `PLEX_UID` | ⚙️ | hardcoded `1000` | ✅ Done |
| `PLEX_GID` | ⚙️ | hardcoded `1000` | ✅ Done |
| `ADVERTISE_IP` | ⚙️ | hardcoded `http://192.168.68.62:32400/` | ✅ Done |
| `NVIDIA_VISIBLE_DEVICES` | ⚙️ | hardcoded `all` | ✅ Done |
| `NVIDIA_DRIVER_CAPABILITIES` | ⚙️ | hardcoded `compute,video,utility` | ✅ Done |

---

### `portainer` — Container Manager

**Status:** `secrets.list` contains only the global keys. Admin credentials are set through the web UI on first login; TLS files are generated by `scripts/04-certificates.sh`.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `PORTAINER_URL` | ⚙️ | generated in `ACCESS.md` | ⏭️ Reference only — not injected |
| `PORTAINER_TLS_EXPIRY` | ⚙️ | `make certificates-check` | ⏭️ Reference only — not injected |
| `PORTAINER_ADMIN_USERNAME` | 🔒 | set in the web UI | ⏭️ Stored in your password manager |
| `PORTAINER_ADMIN_PASSWORD` | 🔒 | set in the web UI | ⏭️ Stored in your password manager |
| TLS `portainer.crt` / `portainer.key` | 🔒 | `stacks/portainer/certs/` | ⏭️ File-based, mounted directly |

**Note:** Portainer credentials are never passed as environment variables, so
there is nothing for Infisical to inject. They live in the web UI and in your
offline record.

---

### `kavita` — E-book Server

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `adguard` — DNS / Ad Blocker

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `cyberchef`, `excalidraw`, `it-tools` — Utility Tools

**Status:** No secrets. No custom config beyond OTEL.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `TZ` | ⚙️ | not set | ⏭️ Not needed by these services |

---

## 5. Shared Variables (Cross-Stack)

### 🔁 Global OTEL Variables

Present in **every** compose file (~24 stacks). Identical values everywhere:

| Variable | Value | Action |
|----------|-------|--------|
| `OTEL_SERVICE_NAME` | `glasswing-homepage` (or `glasswing-ollama`) | ✅ Done `/global` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | ✅ Done `/global` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://192.168.68.62:4318` | ✅ Done `/global` |
| `OTEL_TRACES_EXPORTER` | `otlp` | ✅ Done `/global` |
| `OTEL_METRICS_EXPORTER` | `otlp` | ✅ Done `/global` |
| `OTEL_LOGS_EXPORTER` | `otlp` | ✅ Done `/global` |
| `OTEL_RESOURCE_ATTRIBUTES` | `deployment.environment=homelab,host.name=pathfinder` | ✅ Done `/global` |

**Approach:** Add a `secrets.list` with these names to every stack, or create a shared include mechanism. The simplest path: add them to each stack's `secrets.list` under `/global` path.

### 🔁 Shared OpenObserve Credentials

Used by 3 stacks: `openobserve`, `otel-collector`, `vector`.

| Variable | Infisical Path | Stacks |
|----------|---------------|--------|
| `ZO_ROOT_USER_EMAIL` | `/openobserve` | openobserve, otel-collector, vector |
| `ZO_ROOT_USER_PASSWORD` | `/openobserve` | openobserve, otel-collector, vector |

**Already handled correctly** via `INFISICAL_PATH=/openobserve` in the Makefile for otel-collector and vector.

### 🔁 Shared Open Notebook Password

Used by 2 stacks: `open-notebook`, `opencode`.

| Variable | Infisical Path | Stacks |
|----------|---------------|--------|
| `OPEN_NOTEBOOK_PASSWORD` | `/open-notebook` and `/opencode` | open-notebook, opencode |

**Issue:** Duplicated across two Infisical paths. The `opencode/secrets.list` comment warns about keeping them in sync.
**Recommendation:** Consolidate to a single `/open-notebook` path and have opencode reference it via `INFISICAL_PATH=/open-notebook` for this variable, or create a `/shared` path.

---

## 6. Variables Intentionally Excluded from Infisical

| Variable / File | Location | Reason |
|----------------|----------|--------|
| Infisical bootstrap `.env` | `stacks/infisical/.env` | Chicken-and-egg. Must exist before Infisical runs. |
| Infisical TLS certs | `stacks/infisical/tls/` | File-based. Mounted to nginx container. |
| Portainer TLS certs | `stacks/portainer/certs/` | File-based. Mounted to Portainer container. |
| Glasswing CA key | `.local/ca/glasswing-ca.key` | Private CA. Offline backup only. |
| Restic password | `/etc/glasswing/backup/restic-password` | Disaster recovery. Outside Docker/Infisical. |
| `DOCKER_GID` | Makefile runtime | Host-specific. Resolved at build time. |
| `.local/infisical/credentials.env` | `.local/` | Machine identity. Bootstrap credentials. |
| Host bind mount paths | compose volumes | Host filesystem layout. Not secrets. |

---

## 7. Proposed `secrets.list` Changes

### Stacks needing NEW `secrets.list`:

| Stack | Variables to add | Infisical Path |
|-------|-----------------|----------------|
| **ollama** | `OLLAMA_HOST`, `OLLAMA_KEEP_ALIVE`, `OLLAMA_MODELS`, `OLLAMA_FLASH_ATTENTION`, `OLLAMA_KV_CACHE_TYPE`, `OLLAMA_NUM_PARALLEL`, `OLLAMA_MAX_LOADED_MODELS` | `/ollama` |
| **forgejo** | `USER_UID`, `USER_GID`, `FORGEJO__server__DOMAIN`, `FORGEJO__server__ROOT_URL`, `FORGEJO__server__SSH_DOMAIN`, `FORGEJO__server__SSH_PORT`, `FORGEJO__service__DISABLE_REGISTRATION`, `FORGEJO__service__REQUIRE_SIGNIN_VIEW` | `/forgejo` |
| **homepage** | `HOMEPAGE_ALLOWED_HOSTS`, `PUID`, `PGID` | `/homepage` |
| **plex** | `PLEX_UID`, `PLEX_GID`, `ADVERTISE_IP`, `NVIDIA_VISIBLE_DEVICES`, `NVIDIA_DRIVER_CAPABILITIES` | `/plex` |
| **beszel** | `APP_URL` | `/beszel` |
| **kavita** | (none — only TZ, which is global) | — |
| **adguard** | (none — only TZ, which is global) | — |
| **uptime-kuma** | (none — only TZ, which is global) | — |
| **portainer** | `PORTAINER_URL`, `PORTAINER_TLS_EXPIRY`, `PORTAINER_ADMIN_USERNAME`, `PORTAINER_ADMIN_PASSWORD` | `/portainer` |
| **cyberchef** | (none — no custom config) | — |
| **excalidraw** | (none — no custom config) | — |
| **it-tools** | (none — no custom config) | — |

### Stacks needing EXTENDED `secrets.list`:

| Stack | Variables to ADD to existing list |
|-------|----------------------------------|
| **opencode** | `HOME`, `OPENCODE_DISABLE_AUTOUPDATE`, `OPEN_NOTEBOOK_URL`, `HOST`, `PORT`, `MCP_PATH`, `STATELESS_HTTP`, `JSON_RESPONSE`, `MCP_ALLOWED_HOSTS`, `STEEL_LOCAL`, `STEEL_BASE_URL`, `STEEL_CONNECT_URL` |
| **open-notebook** | `SURREAL_EXPERIMENTAL_GRAPHQL`, `SURREAL_URL`, `SURREAL_USER`, `SURREAL_NAMESPACE`, `SURREAL_DATABASE`, `OPEN_NOTEBOOK_WORKER_MAX_TASKS` |
| **anythingllm** | `STORAGE_DIR`, `LLM_PROVIDER`, `OLLAMA_BASE_PATH`, `EMBEDDING_ENGINE`, `EMBEDDING_BASE_PATH` |
| **flowise** | `PORT`, `APP_URL`, `DATABASE_TYPE`, `DATABASE_PATH`, `SECRETKEY_PATH`, `LOG_PATH`, `BLOB_STORAGE_PATH`, `DISABLE_FLOWISE_TELEMETRY` |
| **langfuse** | `HOSTNAME`, `NEXTAUTH_URL`, `CLICKHOUSE_URL`, `CLICKHOUSE_MIGRATION_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_CLUSTER_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, all `LANGFUSE_S3_*` vars, `TELEMETRY_ENABLED`, `POSTGRES_USER`, `POSTGRES_DB`, `CLICKHOUSE_DB`, `MINIO_ROOT_USER` |
| **openobserve** | `ZO_LOCAL_MODE`, `ZO_DATA_DIR`, `ZO_COMPACT_ENABLED`, `ZO_COMPACT_DATA_RETENTION_DAYS` |
| **vector** | `DOCKER_HOST`, `VECTOR_DANGEROUSLY_ALLOW_ENV_VAR_INTERPOLATION` |
| **dbgate** | (none — only TZ, which is global) |
| **stirling-pdf** | `PUID`, `PGID`, `SECURITY_ENABLELOGIN`, `SYSTEM_DEFAULTLOCALE` |
| **steel** | `NODE_ENV` |
| **jupyterlab** | (none — only TZ, which is global) |

### Global variables to add to ALL stacks:

Every stack should have a `secrets.list` (or extended one) that includes:

```
# Global shared config
GLASSWING_TZ
OTEL_SERVICE_NAME
OTEL_EXPORTER_OTLP_PROTOCOL
OTEL_EXPORTER_OTLP_ENDPOINT
OTEL_TRACES_EXPORTER
OTEL_METRICS_EXPORTER
OTEL_LOGS_EXPORTER
OTEL_RESOURCE_ATTRIBUTES
```

Stored at Infisical path `/global`.

---

## 8. Implementation Strategy

All six planned phases were implemented. What exists now:

### Global values

`stacks/global-secrets.list` names the keys every stack needs, and
`stacks/global-secrets.registry` holds their committed values
(`GLASSWING_TZ`, the `OTEL_*` set, `GLASSWING_HOST_IP`, `GLASSWING_PUID`,
`GLASSWING_PGID`). They are stored at the Infisical path `/global`; the Makefile
sets `INFISICAL_PATH=/global` for it and the collector stacks share
`/openobserve`.

### Per-stack keys

Every stack's `secrets.list` names the keys it needs; compose files reference
them as `${VAR:?Required from Infisical}`. `scripts/with-infisical.sh` fetches
only those keys for a single `docker compose` invocation.

### Shared secrets

`OPEN_NOTEBOOK_PASSWORD` is intentionally listed under both `/open-notebook` and
`/opencode` and must hold the same value in both. Everything else is scoped to
one stack path.

### Registration

Committed configuration is upserted from `*.registry` files:

```bash
./scripts/infisical-register.sh /global stacks/global-secrets.registry
./scripts/infisical-register.sh /opencode stacks/opencode/opencode-config.registry
```

Operator-supplied secrets are not in Git. `./scripts/secrets-plan.sh --template`
writes blank registries for them under `.local/secrets-templates/`; fill them in
from your offline record and register each one. See
[REBUILD.md](../REBUILD.md#phase-6--load-the-secrets).

---

## 9. Summary Counts

Measured with `make secrets-plan` (the live numbers; re-run it after adding a
stack):

| Category | Count |
|----------|-------|
| Total stacks | 29 |
| Stacks with a `secrets.list` | 28 |
| Stacks configured from `.env` (bootstrap) | 1 (`infisical`) |
| Infisical paths | 16 |
| Distinct keys | 114 |
| Values committed in `*.registry` | 89 |
| Values only the operator can supply | 25 |
