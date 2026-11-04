# Core Infrastructure

The backbone of Glasswing — secrets, monitoring, logging, DNS, and orchestration.

---

## Infisical

> **Secrets & credentials management for all stacks**

- **URL:** [https://192.168.68.62:8095](https://192.168.68.62:8095)
- **Port:** `:8095`
- **Containers:** `glasswing-infisical`, `glasswing-infisical-gateway`, `glasswing-infisical-postgres`, `glasswing-infisical-redis`
- **Stack:** `stacks/infisical/`

### How it works

Infisical is the central secrets vault. Every stack's `compose.yaml` references secrets via environment variables that Infisical injects at deploy time through the Makefile.

```
Infisical (hosted)
    │
    ├── /global  → TZ, PUID, PGID, OTEL_ENDPOINT, GLASSWING_HOST_IP, etc.
    ├── /<stack> → Per-service credentials (DB passwords, API keys)
    │
    └── make up STACK=<name>
            │
            ▼
        Secrets injected as env vars → Docker Compose
```

### Key details

- PostgreSQL backend for secret persistence
- Redis for caching
- Gateway container handles auth
- Per-stack `secrets.list` files declare which secrets each stack needs

---

## Uptime Kuma

> **Availability monitoring with alerts for all services**

- **URL:** [http://192.168.68.62:3003](http://192.168.68.62:3003)
- **Port:** `:3003`
- **Container:** `glasswing-uptime-kuma`
- **Stack:** `stacks/uptime-kuma/`

### How it works

Monitors every service via HTTP/TCP checks. Each stack's `compose.yaml` defines a `siteMonitor` URL that Uptime Kuma polls. Alerts on downtime.

### Monitored services

All 40+ services have uptime monitors configured. Health check intervals range from 30s to 5min depending on service criticality.

---

## Beszel

> **Host telemetry — CPU, GPU, RAM, disk, network metrics**

- **URL:** [http://192.168.68.62:8090](http://192.168.68.62:8090)
- **Port:** `:8090`
- **Container:** `glasswing-beszel`
- **Stack:** `stacks/beszel/`

### How it works

Runs a lightweight agent on the host that collects system metrics and exposes them via web UI. Tracks:
- CPU usage per core
- GPU utilization (RTX 4090)
- RAM usage per container
- Disk I/O and temperature
- Network throughput

---

## Glances

> **Real-time host system monitor**

- **URL:** [http://192.168.68.62:61208](http://192.168.68.62:61208)
- **Port:** `:61208`
- **Container:** `glasswing-glances`
- **Stack:** `stacks/glances/`

### How it works

Python-based system monitor with REST API. Provides real-time views of:
- CPU, memory, disk, network
- Per-container resource usage
- Docker stats integration
- Sensor temperatures

---

## Portainer

> **Container management dashboard**

- **URL:** [https://192.168.68.62:9443](https://192.168.68.62:9443)
- **Port:** `:9443`
- **Container:** `glasswing-portainer`
- **Stack:** `stacks/portainer/`

### How it works

Web UI for Docker management. Used for:
- Viewing container logs
- Starting/stopping containers
- Inspecting images and volumes
- Managing Docker networks

---

## AdGuard Home

> **DNS sinkhole, network-wide ad blocking & security**

- **URL:** [http://192.168.68.62:3007](http://192.168.68.62:3007)
- **Ports:** `:3007` (web), `:53` (DNS TCP+UDP), `:3008` (DNS-over-HTTPS)
- **Container:** `glasswing-adguard`
- **Stack:** `stacks/adguard/`

### How it works

Acts as the network DNS resolver. All LAN devices point to `192.168.68.62:53`. Blocks:
- Advertisements and trackers
- Malicious domains
- Phishing sites

Also provides DNS query logging and per-device filtering.

---

## Homepage

> **Operations dashboard — service tiles, status, quick links**

- **URL:** [http://192.168.68.62:3006](http://192.168.68.62:3006)
- **Port:** `:3006`
- **Container:** `glasswing-homepage`
- **Stack:** `stacks/homepage/`

### How it works

[Homepage v2](https://gethomepage.dev/) serves as the main dashboard. Configuration in `stacks/homepage/config/services.yaml` defines:
- Service categories and layout
- Container health monitoring via Docker socket
- Site monitors for each service
- Custom icons and descriptions

---

## OpenObserve

> **Centralized logs, metrics, and traces**

- **URL:** [http://192.168.68.62:3018](http://192.168.68.62:3018)
- **Port:** `:3018`
- **Container:** `glasswing-openobserve`
- **Stack:** `stacks/openobserve/`

### How it works

OpenTelemetry-native observability platform. Receives:
- **Logs** from Vector (Docker log collector)
- **Metrics** from OTel Collector (Docker stats, custom metrics)
- **Traces** from OTel Collector (service-to-service traces)

Replaces the ELK/Loki/Grafana stack with a single binary. Supports S3-compatible storage for retention.

### Data pipeline

```
Docker containers ──logs──→ Vector ──→ OpenObserve
Docker containers ──OTLP──→ OTel Collector ──→ OpenObserve
```

---

## OpenTelemetry Collector

> **Collects Docker metrics & traces from all containers**

- **Ports:** `:4318` (OTLP HTTP), `:13133` (Prometheus metrics)
- **Container:** `glasswing-otel-collector`
- **Stack:** `stacks/otel-collector/`

### How it works

Receives OTLP data from all services (via `OTEL_SERVICE_NAME` env var). Exports to OpenObserve. Also exposes Prometheus metrics on `:13133`.

---

## Vector

> **High-performance log collector**

- **Port:** `:8686` (health)
- **Container:** `glasswing-vector`
- **Stack:** `stacks/vector/`

### How it works

Rust-based log aggregator. Collects Docker container logs via the Docker socket and forwards to OpenObserve. Replaces Fluentd/Fluentbit.

---

## Dagu

> **Workflow scheduler & cron runner**

- **URL:** [http://192.168.68.62:3014](http://192.168.68.62:3014)
- **Port:** `:3014`
- **Container:** `glasswing-dagu`
- **Stack:** `stacks/dagu/`

### How it works

Visual workflow orchestrator. Defines DAGs (Directed Acyclic Graphs) for:
- Scheduled data pipelines
- Backup jobs
- Health check sequences
- Multi-step deployment tasks

---

## WUD (What's Up Docker)

> **Docker image update intelligence — detection-only monitoring**

- **URL:** [http://192.168.68.62:3031](http://192.168.68.62:3031)
- **Port:** `:3031`
- **Containers:** `glasswing-wud`, `glasswing-docker-proxy`
- **Stack:** `stacks/wud/`

### How it works

WUD v9.7.0 monitors all Docker Compose-managed containers for available image updates. It is configured in **detection-only** mode: no auto-update, no image pull, no container restart.

```
Docker containers ──discovered──→ docker-proxy (read-only API) ──→ WUD
                                                              │
                                                              ▼
                                                          SQLite store
```

### Configuration

- **Docker access:** Via `tecnativa/docker-socket-proxy` (read-only: containers, images, events, version, info, ping)
- **Watcher scope:** Docker Compose containers only (`label:^com.docker.compose`)
- **Scan schedule:** Twice daily at ~02:00 and ~14:00 IST
- **Digest monitoring:** Disabled by default for Docker Hub (rate limit safety)
- **Authentication:** Basic Auth with admin user, password managed in Infisical (`/wud`)
- **Storage:** Persistent SQLite at `/store` (named Docker volume `glasswing-wud-store`)

### Container categories

| Category | Tags | Monitoring | Example |
|----------|------|------------|---------|
| A (Versioned) | Semver (`:1.2.3`) | Tag comparison | `postgres:16`, `redis:7.2` |
| B (Mutable) | Non-semver (`:latest`) | Digest comparison (opt-in) | `nginx:latest` |
| C (Local) | No registry | Not monitorable | `glasswing/sky-web:latest` |

---

## PostgreSQL

> **Shared database server**

- **Port:** `:5432`
- **Container:** `glasswing-postgres`
- **Stack:** `stacks/postgres/`

### How it works

Central PostgreSQL instance used by multiple stacks:
- **Sky** (astronomy data)
- **Paperless** (document metadata)
- **Infisical** (secrets storage)
- **Langfuse** (LLM traces)

Each stack gets its own database. Managed via DBGate for administration.
