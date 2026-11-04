# Architecture Overview

Glasswing runs on a single Docker host (**Pathfinder**) with ~60 containers organized into ~40 stacks. All stacks share common conventions defined in `stacks/base.yaml`.

---

## Host Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Pathfinder (Docker Host)                      │
│  CPU: AMD Ryzen          GPU: NVIDIA RTX 4090                    │
│  IP: 192.168.68.62       Network: glasswing (10.89.0.0/24)       │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐   │
│  │  AdGuard   │  │  Vector    │  │  OpenTelemetry Collector │   │
│  │  DNS :53   │  │  Logs      │  │  Metrics :4318           │   │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬───────────────┘   │
│        │               │                     │                   │
│        ▼               ▼                     ▼                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OpenObserve :3018                            │   │
│  │         Logs + Metrics + Traces (central)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Docker Containers (60+)                      │   │
│  │                                                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │   │
│  │  │  AI      │  │ DevOps   │  │ Research │  │ Home   │   │   │
│  │  │ Platform │  │ Tools    │  │ & Intel  │  │ Mgmt   │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐   │
│  │ Infisical  │  │ PostgreSQL │  │     Docker Volumes        │   │
│  │ Secrets    │  │  DB :5432  │  │  (persistent data)        │   │
│  │ :8095      │  │            │  │                           │   │
│  └────────────┘  └────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack Conventions

Every stack follows the same pattern:

```
stacks/<name>/
├── compose.yaml          # Docker Compose definition
├── Dockerfile.*          # Custom images (if needed)
├── config/               # Service-specific configuration
├── pre-up.sh             # Pre-deploy hooks (clone, validate)
├── secrets.list          # Infisical secret references
└── .gitignore            # Exclude cloned source / local data
```

### Common Rules

| Rule | Detail |
|------|--------|
| **Base extends** | All stacks extend `stacks/base.yaml` for consistent restart, logging, and security policies |
| **Networks** | External `glasswing` network (`10.89.0.0/24`) for inter-service communication |
| **Ports** | Published on `192.168.68.62` via `${GLASSWING_HOST_IP}` |
| **Secrets** | Managed through Infisical (`/global` + per-stack paths) |
| **Health checks** | Every stack defines health checks for Uptime Kuma monitoring |
| **OTel** | `OTEL_SERVICE_NAME` label on every service for trace correlation |
| **Hardened** | Most stacks use `hardened` base (`no-new-privileges:true`) |

---

## Data Flow

### Telemetry Pipeline

```
Containers ──┐
              │  Docker logs
              ▼
          Vector ──→ OpenObserve (logs)
              │
              │  OTLP metrics
              ▼
      OTel Collector ──→ OpenObserve (metrics + traces)
```

### Secrets Pipeline

```
Infisical (hosted)
    │
    ├── /global secrets (TZ, PUID, PGID, OTEL, etc.)
    │
    └── /<stack> secrets (per-service credentials)
              │
              ▼
        compose.yaml (env vars injected at runtime)
```

### AI Pipeline

```
Ollama (RTX 4090)
    │
    ├── Flowise (agent workflows)
    │
    ├── AnythingLLM (RAG workspaces)
    │
    └── Langfuse (observability & tracing)
```

---

## Network Architecture

| Network | Purpose | Subnet |
|---------|---------|--------|
| `glasswing` | External shared network for all stacks | `10.89.0.0/24` |
| `<stack>_internal` | Stack-private network (per-stack) | Docker-managed |

Services publish ports on `192.168.68.62` for LAN access. Internal-only services (databases, engines) have no published ports.

---

## See Also

- [Deploying Stacks](/guides/deploying-stacks.md) — How to add a new service
- [Troubleshooting](/guides/troubleshooting.md) — Common issues and fixes
- [Service Directory](/services/overview.md) — Full list of all services
