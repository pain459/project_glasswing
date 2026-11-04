# Service Directory

Complete list of all Glasswing services organized by category. Click any service name to see details.

---

## Core Infrastructure

| Service | Port | Container | Description |
|---------|------|-----------|-------------|
| [Infisical](/services/infrastructure.md#infisical) | `:8095` | `glasswing-infisical` | Secrets & credentials management |
| [Uptime Kuma](/services/infrastructure.md#uptime-kuma) | `:3003` | `glasswing-uptime-kuma` | Availability monitoring |
| [Beszel](/services/infrastructure.md#beszel) | `:8090` | `glasswing-beszel` | Host telemetry |
| [Glances](/services/infrastructure.md#glances) | `:61208` | `glasswing-glances` | Real-time system monitor |
| [Portainer](/services/infrastructure.md#portainer) | `:9443` | `glasswing-portainer` | Container dashboard |
| [AdGuard Home](/services/infrastructure.md#adguard-home) | `:3007`, DNS `:53` | `glasswing-adguard` | DNS sinkhole & ad blocking |
| [Homepage](/services/infrastructure.md#homepage) | `:3006` | `glasswing-homepage` | Operations dashboard |
| [OpenObserve](/services/infrastructure.md#openobserve) | `:3018` | `glasswing-openobserve` | Centralized logs, metrics, traces |
| [OTel Collector](/services/infrastructure.md#otel-collector) | `:4318`, `:13133` | `glasswing-otel-collector` | Docker metrics collection |
| [Vector](/services/infrastructure.md#vector) | `:8686` | `glasswing-vector` | Log collector |
| [Dagu](/services/infrastructure.md#dagu) | `:3014` | `glasswing-dagu` | Workflow scheduler |
| [PostgreSQL](/services/infrastructure.md#postgresql) | `:5432` | `glasswing-postgres` | Shared database server |

## AI Platform

| Service | Port | Container | Description |
|---------|------|-----------|-------------|
| [Ollama](/services/ai-platform.md#ollama) | `:11434` | `glasswing-ollama` | Local LLM inference (RTX 4090) |
| [Flowise](/services/ai-platform.md#flowise) | `:3002` | `glasswing-flowise` | AI agent & workflow builder |
| [Langfuse](/services/ai-platform.md#langfuse) | `:3010` | `glasswing-langfuse` | LLM observability |
| [AnythingLLM](/services/ai-platform.md#anythingllm) | `:3012` | `glasswing-anythingllm` | Local RAG workspaces |
| [SearXNG](/services/ai-platform.md#searxng) | `:3028` | `glasswing-searxng` | Private metasearch |

## MCP Servers

| Service | Port | Container | Description |
|---------|------|-----------|-------------|
| [Open Notebook MCP](/services/mcp-servers.md#open-notebook-mcp) | `:8502` | `glasswing-open-notebook-mcp` | Knowledge base |
| [Steel MCP](/services/mcp-servers.md#steel-mcp) | `:3100` | `glasswing-steel-mcp` | Browser automation |
| [Serena MCP](/services/mcp-servers.md#serena-mcp) | `:24282` | `glasswing-serena` | Code intelligence |
| [REA MCP](/services/mcp-servers.md#rea-mcp) | `:8003` | `glasswing-rea-mcp` | Reverse engineering |
| [Sequential Thinking MCP](/services/mcp-servers.md#sequential-thinking-mcp) | `:8004` | `glasswing-sequential-thinking-mcp` | Working memory |
| [SearXNG MCP](/services/mcp-servers.md#searxng-mcp) | `:8005` | `glasswing-searxng-mcp` | Search MCP |

## Developer Workbench

| Service | Port | Container | Description |
|---------|------|-----------|-------------|
| [Forgejo](/services/developer.md#forgejo) | `:3011`, SSH `:2222` | `glasswing-forgejo` | Private Git hosting |
| [JupyterLab](/services/developer.md#jupyterlab) | `:8889` | `glasswing-jupyterlab` | Python notebooks |
| [DBGate](/services/developer.md#dbgate) | `:3004` | `glasswing-dbgate` | Database admin |
| [Excalidraw](/services/developer.md#excalidraw) | `:3009` | `glasswing-excalidraw` | Whiteboarding |
| [CyberChef](/services/developer.md#cyberchef) | `:3013` | `glasswing-cyberchef` | Data analysis |
| [IT-Tools](/services/developer.md#it-tools) | `:3015` | `glasswing-it-tools` | Developer utilities |
| [Calculators](/services/developer.md#calculators) | `:3021` | `glasswing-calculators` | Math & conversion |
| [Stirling-PDF](/services/developer.md#stirling-pdf) | `:3016` | `glasswing-stirling-pdf` | PDF processing |

## Other Categories

| Category | Services | Details |
|----------|----------|---------|
| [World Clock](/services/world-clock.md) | Datetime, Panchangam | Time zones & Telugu calendar |
| [Home Management](/services/home-management.md) | HomeBox, Paperless-ngx | Inventory & documents |
| [Astronomy](/services/astronomy.md) | Skytoday | Solar/lunar/planetary data |
| [Research & Intelligence](/services/research.md) | ATLAS, Catalog | Disaster intelligence |
| [News Centre](/services/news-centre.md) | Glance, FreshRSS | News dashboard & feeds |
| [Entertainment](/services/entertainment.md) | Plex, Kavita | Media & digital library |
