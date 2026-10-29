# Infisical Migration Plan — Glasswing Stack

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

12 stacks have `secrets.list` files and are fully Infisical-managed for their secrets.
The remaining 13 stacks either have no secrets, or have secrets/config that should move to Infisical.

---

## Current State: Per-Stack Variable Inventory

### Legend

| Marker | Meaning |
|--------|---------|
| 🔒 | **SECRET** — password, token, key, credential |
| ⚙️ | **CONFIG** — port, IP, path, feature flag, user setting |
| ✅ | Already in Infisical via `secrets.list` |
| 📋 | Should be moved to Infisical |
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
| `HOME` | ⚙️ | hardcoded `/home/opencode` | 📋 Move to Infisical |
| `OPENCODE_DISABLE_AUTOUPDATE` | ⚙️ | hardcoded `"1"` | 📋 Move to Infisical |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |
| `OPEN_NOTEBOOK_URL` | ⚙️ | hardcoded `http://192.168.68.62:5055` | 📋 Move to Infisical |
| `HOST` (MCP) | ⚙️ | hardcoded `0.0.0.0` | 📋 Move to Infisical |
| `PORT` (MCP) | ⚙️ | hardcoded `8000` | 📋 Move to Infisical |
| `MCP_PATH` | ⚙️ | hardcoded `/mcp` | 📋 Move to Infisical |
| `STATELESS_HTTP` | ⚙️ | hardcoded `"1"` | 📋 Move to Infisical |
| `JSON_RESPONSE` | ⚙️ | hardcoded `"1"` | 📋 Move to Infisical |
| `MCP_ALLOWED_HOSTS` | ⚙️ | hardcoded list | 📋 Move to Infisical |
| `STEEL_LOCAL` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `STEEL_BASE_URL` | ⚙️ | hardcoded `http://192.168.68.62:3100` | 📋 Move to Infisical |
| `STEEL_CONNECT_URL` | ⚙️ | hardcoded `ws://192.168.68.62:3100` | 📋 Move to Infisical |

---

### `open-notebook` — Knowledge Retrieval

**Status:** ✅ Secrets managed. ⚙️ Config still hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `OPEN_NOTEBOOK_ENCRYPTION_KEY` | 🔒 | ✅ Infisical `/open-notebook` | ✅ Done |
| `OPEN_NOTEBOOK_PASSWORD` | 🔒 | ✅ Infisical `/open-notebook` | ✅ Done |
| `SURREAL_PASSWORD` | 🔒 | ✅ Infisical `/open-notebook` | ✅ Done |
| `SURREAL_EXPERIMENTAL_GRAPHQL` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `SURREAL_URL` | ⚙️ | hardcoded `ws://surrealdb:8000/rpc` | 📋 Move to Infisical |
| `SURREAL_USER` | ⚙️ | hardcoded `root` | 📋 Move to Infisical |
| `SURREAL_NAMESPACE` | ⚙️ | hardcoded `open_notebook` | 📋 Move to Infisical |
| `SURREAL_DATABASE` | ⚙️ | hardcoded `open_notebook` | 📋 Move to Infisical |
| `OPEN_NOTEBOOK_WORKER_MAX_TASKS` | ⚙️ | hardcoded `"2"` | 📋 Move to Infisical |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `ollama` — Local LLM Inference

**Status:** No secrets. All config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `OLLAMA_HOST` | ⚙️ | hardcoded `0.0.0.0:11434` | 📋 Move to Infisical |
| `OLLAMA_KEEP_ALIVE` | ⚙️ | hardcoded `30m` | 📋 Move to Infisical |
| `OLLAMA_MODELS` | ⚙️ | hardcoded `/root/.ollama` | 📋 Move to Infisical |
| `OLLAMA_FLASH_ATTENTION` | ⚙️ | hardcoded `"1"` | 📋 Move to Infisical |
| `OLLAMA_KV_CACHE_TYPE` | ⚙️ | hardcoded `q8_0` | 📋 Move to Infisical |
| `OLLAMA_NUM_PARALLEL` | ⚙️ | hardcoded `"1"` | 📋 Move to Infisical |
| `OLLAMA_MAX_LOADED_MODELS` | ⚙️ | hardcoded `"1"` | 📋 Move to Infisical |
| `OTEL_SERVICE_NAME` | ⚙️ | hardcoded `glasswing-ollama` | 🔁 Global — see §6 |

---

## 2. AI & Development Tools

### `anythingllm` — Document Chat

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `JWT_SECRET` | 🔒 | ✅ Infisical `/anythingllm` | ✅ Done |
| `STORAGE_DIR` | ⚙️ | hardcoded `/app/server/storage` | 📋 Move to Infisical |
| `LLM_PROVIDER` | ⚙️ | hardcoded `ollama` | 📋 Move to Infisical |
| `OLLAMA_BASE_PATH` | ⚙️ | hardcoded `http://192.168.68.62:11434` | 📋 Move to Infisical |
| `EMBEDDING_ENGINE` | ⚙️ | hardcoded `ollama` | 📋 Move to Infisical |
| `EMBEDDING_BASE_PATH` | ⚙️ | hardcoded `http://192.168.68.62:11434` | 📋 Move to Infisical |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `flowise` — AI Workflow Builder

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `FLOWISE_SECRETKEY_OVERWRITE` | 🔒 | ✅ Infisical `/flowise` | ✅ Done |
| `JWT_AUTH_TOKEN_SECRET` | 🔒 | ✅ Infisical `/flowise` | ✅ Done |
| `JWT_REFRESH_TOKEN_SECRET` | 🔒 | ✅ Infisical `/flowise` | ✅ Done |
| `PORT` | ⚙️ | hardcoded `3000` | 📋 Move to Infisical |
| `APP_URL` | ⚙️ | hardcoded `http://192.168.68.62:3002` | 📋 Move to Infisical |
| `DATABASE_TYPE` | ⚙️ | hardcoded `sqlite` | 📋 Move to Infisical |
| `DATABASE_PATH` | ⚙️ | hardcoded `/home/node/.flowise` | 📋 Move to Infisical |
| `SECRETKEY_PATH` | ⚙️ | hardcoded `/home/node/.flowise` | 📋 Move to Infisical |
| `LOG_PATH` | ⚙️ | hardcoded `/home/node/.flowise/logs` | 📋 Move to Infisical |
| `BLOB_STORAGE_PATH` | ⚙️ | hardcoded `/home/node/.flowise/storage` | 📋 Move to Infisical |
| `DISABLE_FLOWISE_TELEMETRY` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
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
| `HOSTNAME` | ⚙️ | hardcoded `0.0.0.0` | 📋 Move to Infisical |
| `NEXTAUTH_URL` | ⚙️ | hardcoded `http://192.168.68.62:3010` | 📋 Move to Infisical |
| `CLICKHOUSE_URL` | ⚙️ | hardcoded `http://clickhouse:8123` | 📋 Move to Infisical |
| `CLICKHOUSE_MIGRATION_URL` | ⚙️ | hardcoded `clickhouse://clickhouse:9000` | 📋 Move to Infisical |
| `CLICKHOUSE_USER` | ⚙️ | hardcoded `langfuse` | 📋 Move to Infisical |
| `CLICKHOUSE_CLUSTER_ENABLED` | ⚙️ | hardcoded `"false"` | 📋 Move to Infisical |
| `REDIS_HOST` | ⚙️ | hardcoded `redis` | 📋 Move to Infisical |
| `REDIS_PORT` | ⚙️ | hardcoded `6379` | 📋 Move to Infisical |
| `LANGFUSE_S3_*` (event upload) | ⚙️ | hardcoded bucket/region/endpoint | 📋 Move to Infisical |
| `LANGFUSE_S3_*` (media upload) | ⚙️ | hardcoded bucket/region/endpoint | 📋 Move to Infisical |
| `TELEMETRY_ENABLED` | ⚙️ | hardcoded `"false"` | 📋 Move to Infisical |
| `POSTGRES_USER` | ⚙️ | hardcoded `langfuse` | 📋 Move to Infisical |
| `POSTGRES_DB` | ⚙️ | hardcoded `langfuse` | 📋 Move to Infisical |
| `CLICKHOUSE_DB` | ⚙️ | hardcoded `default` | 📋 Move to Infisical |
| `MINIO_ROOT_USER` | ⚙️ | hardcoded `langfuse` | 📋 Move to Infisical |

---

## 3. Monitoring & Observability

### `openobserve` — Log & Metrics Platform

**Status:** ✅ Secrets managed. ⚙️ Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `ZO_ROOT_USER_EMAIL` | 🔒 | ✅ Infisical `/openobserve` | ✅ Done |
| `ZO_ROOT_USER_PASSWORD` | 🔒 | ✅ Infisical `/openobserve` | ✅ Done |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |
| `ZO_LOCAL_MODE` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `ZO_DATA_DIR` | ⚙️ | hardcoded `/data` | 📋 Move to Infisical |
| `ZO_COMPACT_ENABLED` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `ZO_COMPACT_DATA_RETENTION_DAYS` | ⚙️ | hardcoded `"10"` | 📋 Move to Infisical |

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
| `DOCKER_HOST` | ⚙️ | hardcoded `unix:///var/run/docker.sock` | 📋 Move to Infisical |
| `VECTOR_DANGEROUSLY_ALLOW_ENV_VAR_INTERPOLATION` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `DOCKER_GID` | ⚙️ | resolved at runtime via Makefile | ⏭️ Host-specific. Keep as Makefile var. |

---

### `beszel` — System Monitoring

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `APP_URL` | ⚙️ | hardcoded `http://192.168.68.62:8090` | 📋 Move to Infisical |

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
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 📋 Move to Infisical |
| `PUID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |
| `PGID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |
| `SECURITY_ENABLELOGIN` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `SYSTEM_DEFAULTLOCALE` | ⚙️ | hardcoded `en-US` | 📋 Move to Infisical |

---

### `steel` — Self-hosted Browser

**Status:** ✅ All variables in Infisical (including config).

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `STEEL_BIND_IP` | ⚙️ | ✅ Infisical `/steel` | ✅ Done |
| `STEEL_PORT` | ⚙️ | ✅ Infisical `/steel` | ✅ Done |
| `STEEL_LOG_STORAGE_ENABLED` | ⚙️ | ✅ Infisical `/steel` | ✅ Done |
| `STEEL_LOG_STORAGE_PATH` | ⚙️ | ✅ Infisical `/steel` | ✅ Done |
| `NODE_ENV` | ⚙️ | hardcoded `production` | 📋 Move to Infisical |

---

### `forgejo` — Git Server

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `USER_UID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |
| `USER_GID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |
| `FORGEJO__server__DOMAIN` | ⚙️ | hardcoded `192.168.68.62` | 📋 Move to Infisical |
| `FORGEJO__server__ROOT_URL` | ⚙️ | hardcoded `http://192.168.68.62:3011/` | 📋 Move to Infisical |
| `FORGEJO__server__SSH_DOMAIN` | ⚙️ | hardcoded `192.168.68.62` | 📋 Move to Infisical |
| `FORGEJO__server__SSH_PORT` | ⚙️ | hardcoded `2222` | 📋 Move to Infisical |
| `FORGEJO__service__DISABLE_REGISTRATION` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `FORGEJO__service__REQUIRE_SIGNIN_VIEW` | ⚙️ | hardcoded `"true"` | 📋 Move to Infisical |
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |

---

### `homepage` — Dashboard

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `HOMEPAGE_ALLOWED_HOSTS` | ⚙️ | hardcoded `192.168.68.62:3006,...` | 📋 Move to Infisical |
| `PUID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |
| `PGID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |

---

### `plex` — Media Server

**Status:** No secrets. Config hardcoded.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `TZ` | ⚙️ | hardcoded `Asia/Kolkata` | 🔁 Global — see §6 |
| `PLEX_UID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |
| `PLEX_GID` | ⚙️ | hardcoded `1000` | 📋 Move to Infisical |
| `ADVERTISE_IP` | ⚙️ | hardcoded `http://192.168.68.62:32400/` | 📋 Move to Infisical |
| `NVIDIA_VISIBLE_DEVICES` | ⚙️ | hardcoded `all` | 📋 Move to Infisical |
| `NVIDIA_DRIVER_CAPABILITIES` | ⚙️ | hardcoded `compute,video,utility` | 📋 Move to Infisical |

---

### `portainer` — Container Manager

**Status:** No secrets.list. Admin credentials not in compose (set via web UI). TLS certs file-based.

| Variable | Type | Current | Action |
|----------|------|---------|--------|
| `PORTAINER_URL` | ⚙️ | documented in instructions.md | 📋 Register in Infisical `/portainer` |
| `PORTAINER_TLS_EXPIRY` | ⚙️ | documented in instructions.md | 📋 Register in Infisical `/portainer` |
| `PORTAINER_ADMIN_USERNAME` | 🔒 | documented in instructions.md | 📋 Register in Infisical `/portainer` |
| `PORTAINER_ADMIN_PASSWORD` | 🔒 | documented in instructions.md | 📋 Register in Infisical `/portainer` |
| TLS `portainer.crt` / `portainer.key` | 🔒 | `stacks/portainer/certs/` | ⏭️ File-based. Mounted directly. |

**Note:** Portainer admin credentials are set through the web UI on first login, not via env vars. Registering them in Infisical is for reference/documentation, not injection.

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
| `OTEL_SERVICE_NAME` | `glasswing-homepage` (or `glasswing-ollama`) | 📋 Move to Infisical `/global` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | 📋 Move to Infisical `/global` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://192.168.68.62:4318` | 📋 Move to Infisical `/global` |
| `OTEL_TRACES_EXPORTER` | `otlp` | 📋 Move to Infisical `/global` |
| `OTEL_METRICS_EXPORTER` | `otlp` | 📋 Move to Infisical `/global` |
| `OTEL_LOGS_EXPORTER` | `otlp` | 📋 Move to Infisical `/global` |
| `OTEL_RESOURCE_ATTRIBUTES` | `deployment.environment=homelab,host.name=pathfinder` | 📋 Move to Infisical `/global` |

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

### Phase 1: Create `/global` secrets in Infisical

Register these platform-wide values:
- `GLASSWING_TZ` = `Asia/Kolkata`
- All 7 `OTEL_*` variables
- Common values like `GLASSWING_HOST_IP` = `192.168.68.62`
- Common values like `GLASSWING_PUID` = `1000`, `GLASSWING_PGID` = `1000`

### Phase 2: Extend existing `secrets.list` files

Add config variables to stacks that already have secrets. Update compose files to reference them via `${VAR:?Required}`.

### Phase 3: Create new `secrets.list` files

For stacks without any `secrets.list`, create one with their config variables.

### Phase 4: Update compose files

Replace every hardcoded `environment:` value with `${VAR:?Required}` references.

### Phase 5: Handle shared secrets

Resolve the `OPEN_NOTEBOOK_PASSWORD` duplication. Consider a `/shared` Infisical path for cross-stack secrets.

### Phase 6: Makefile enhancements

Consider adding a `INFISICAL_GLOBAL_PATH` that is always loaded in addition to the stack-specific path, so OTEL and TZ variables don't need to be listed in every `secrets.list`.

---

## 9. Summary Counts

| Category | Count |
|----------|-------|
| Total stacks | 25 |
| Stacks with secrets.list already | 12 |
| Stacks needing new secrets.list | 8 |
| Stacks needing extended secrets.list | 11 |
| Stacks with no changes needed (no custom env) | 4 |
| Stacks intentionally excluded (bootstrap) | 1 |
| 🔒 Secrets already in Infisical | ~28 |
| ⚙️ Config variables to move to Infisical | ~80+ |
| 🔁 Global/shared variables | ~10 |
| Total variables to register in Infisical | ~120 |
