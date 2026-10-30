# Access map

Every published service is reached as `IP:port`; there is no internal DNS.
LAN services bind the Pathfinder address, while host-only services bind loopback.
These are the canonical addresses. `make access` regenerates this file from the `ports:`
entries in `stacks/*/compose.yaml` — change the compose file, not this table.

Host IP: `192.168.68.62` (from `GLASSWING_HOST_IP`, else `stacks/infisical/.env`).

| Stack | Service | URL | Container port | Network | Access |
| --- | --- | --- | --- | --- | --- |
| `adguard` | `adguard` | dns://192.168.68.62:53 | 53/tcp | glasswing | LAN |
| `adguard` | `adguard` | dns://192.168.68.62:53 | 53/udp | glasswing | LAN |
| `forgejo` | `forgejo` | ssh://192.168.68.62:2222 | 22/tcp | glasswing | LAN |
| `flowise` | `flowise` | http://192.168.68.62:3002 | 3000/tcp | glasswing | LAN |
| `uptime-kuma` | `uptime-kuma` | http://192.168.68.62:3003 | 3001/tcp | glasswing | LAN |
| `dbgate` | `dbgate` | http://192.168.68.62:3004 | 3000/tcp | glasswing | LAN |
| `homepage` | `homepage` | http://192.168.68.62:3006 | 3000/tcp | glasswing | LAN |
| `adguard` | `adguard` | http://192.168.68.62:3007 | 80/tcp | glasswing | LAN |
| `adguard` | `adguard` | http://192.168.68.62:3008 | 3000/tcp | glasswing | LAN |
| `excalidraw` | `excalidraw` | http://192.168.68.62:3009 | 80/tcp | glasswing | LAN |
| `langfuse` | `langfuse-web` | http://192.168.68.62:3010 | 3000/tcp | internal | LAN |
| `forgejo` | `forgejo` | http://192.168.68.62:3011 | 3000/tcp | glasswing | LAN |
| `anythingllm` | `anythingllm` | http://192.168.68.62:3012 | 3001/tcp | glasswing | LAN |
| `cyberchef` | `cyberchef` | http://192.168.68.62:3013 | 8080/tcp | glasswing | LAN |
| `dagu` | `dagu` | http://192.168.68.62:3014 | 3014/tcp | host | LAN |
| `it-tools` | `it-tools` | http://192.168.68.62:3015 | 80/tcp | glasswing | LAN |
| `stirling-pdf` | `stirling-pdf` | http://192.168.68.62:3016 | 8080/tcp | glasswing | LAN |
| `kavita` | `kavita` | http://192.168.68.62:3017 | 5000/tcp | glasswing | LAN |
| `openobserve` | `openobserve` | http://192.168.68.62:3018 | 5080/tcp | glasswing | LAN |
| `calculators` | `calculators` | http://192.168.68.62:3021 | 80/tcp | glasswing | LAN |
| `datetime` | `datetime` | http://192.168.68.62:3022 | 3000/tcp | glasswing | LAN |
| `panchangam` | `panchangam` | http://192.168.68.62:3023 | 80/tcp | glasswing | LAN |
| `homebox` | `homebox` | http://192.168.68.62:3024 | 7745/tcp | glasswing | LAN |
| `paperless` | `webserver` | http://192.168.68.62:3025 | 8000/tcp | glasswing+internal | LAN |
| `steel` | `steel` | http://192.168.68.62:3100 | 3000/tcp | glasswing | LAN |
| `otel-collector` | `otel-collector` | http://192.168.68.62:4318 | 4318/tcp | glasswing | LAN |
| `open-notebook` | `open_notebook` | http://192.168.68.62:5055 | 5055/tcp | internal+glasswing | LAN |
| `postgres` | `postgres` | postgres://192.168.68.62:5432 | 5432/tcp | glasswing | LAN |
| `open-notebook-mcp` | `open-notebook-mcp` | http://127.0.0.1:8001 | 8000/tcp | glasswing | host-only |
| `steel-mcp` | `steel-mcp` | http://127.0.0.1:8002 | 8000/tcp | glasswing | host-only |
| `beszel` | `beszel` | http://192.168.68.62:8090 | 8090/tcp | glasswing | LAN |
| `infisical` | `gateway` | https://192.168.68.62:8095 | 443/tcp | internal | LAN |
| `open-notebook` | `open_notebook` | http://192.168.68.62:8502 | 8502/tcp | internal+glasswing | LAN |
| `vector` | `vector` | http://192.168.68.62:8686 | 8686/tcp | glasswing | LAN |
| `jupyterlab` | `jupyterlab` | http://192.168.68.62:8889 | 8888/tcp | glasswing | LAN |
| `langfuse` | `minio` | http://192.168.68.62:9090 | 9000/tcp | internal | LAN |
| `serena` | `serena` | http://127.0.0.1:9121 | 9121/tcp | glasswing | host-only |
| `steel` | `steel` | http://192.168.68.62:9223 | 9223/tcp | glasswing | LAN |
| `portainer` | `portainer` | https://192.168.68.62:9443 | 9443/tcp | glasswing | LAN |
| `ollama` | `ollama` | http://192.168.68.62:11434 | 11434/tcp | glasswing | LAN |
| `otel-collector` | `otel-collector` | http://192.168.68.62:13133 | 13133/tcp | glasswing | LAN |
| `serena` | `serena` | http://192.168.68.62:24282 | 24282/tcp | glasswing | LAN |
| `plex` | `plex` | http://192.168.68.62:32400 | 32400/tcp | host | LAN |
| `glances` | `glances` | http://192.168.68.62:61208 | 61208/tcp | glasswing | LAN |

`dns`, `postgres`, `ssh` rows are not web UIs.

`network_mode: host` stacks (`dagu`, `plex`) publish outside Compose; their ports come from the stack defaults.

