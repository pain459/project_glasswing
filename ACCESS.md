# Access map

Every service is reached as `IP:port`; there is no internal DNS, so these are
the canonical addresses. `make access` regenerates this file from the `ports:`
entries in `stacks/*/compose.yaml` — change the compose file, not this table.

Host IP: `192.168.68.62` (from `GLASSWING_HOST_IP`, else `stacks/infisical/.env`).

| Stack | Service | URL | Container port | Network |
| --- | --- | --- | --- | --- |
| `adguard` | `adguard` | dns://192.168.68.62:53 | 53/tcp | glasswing |
| `adguard` | `adguard` | dns://192.168.68.62:53 | 53/udp | glasswing |
| `forgejo` | `forgejo` | ssh://192.168.68.62:2222 | 22/tcp | glasswing |
| `flowise` | `flowise` | http://192.168.68.62:3002 | 3000/tcp | glasswing |
| `uptime-kuma` | `uptime-kuma` | http://192.168.68.62:3003 | 3001/tcp | glasswing |
| `dbgate` | `dbgate` | http://192.168.68.62:3004 | 3000/tcp | glasswing |
| `homepage` | `homepage` | http://192.168.68.62:3006 | 3000/tcp | glasswing |
| `adguard` | `adguard` | http://192.168.68.62:3007 | 80/tcp | glasswing |
| `adguard` | `adguard` | http://192.168.68.62:3008 | 3000/tcp | glasswing |
| `excalidraw` | `excalidraw` | http://192.168.68.62:3009 | 80/tcp | glasswing |
| `langfuse` | `langfuse-web` | http://192.168.68.62:3010 | 3000/tcp | internal+glasswing |
| `forgejo` | `forgejo` | http://192.168.68.62:3011 | 3000/tcp | glasswing |
| `anythingllm` | `anythingllm` | http://192.168.68.62:3012 | 3001/tcp | glasswing |
| `cyberchef` | `cyberchef` | http://192.168.68.62:3013 | 8080/tcp | glasswing |
| `dagu` | `dagu` | http://192.168.68.62:3014 | 3014/tcp | host |
| `it-tools` | `it-tools` | http://192.168.68.62:3015 | 80/tcp | glasswing |
| `stirling-pdf` | `stirling-pdf` | http://192.168.68.62:3016 | 8080/tcp | glasswing |
| `kavita` | `kavita` | http://192.168.68.62:3017 | 5000/tcp | glasswing |
| `openobserve` | `openobserve` | http://192.168.68.62:3018 | 5080/tcp | glasswing |
| `opencode` | `opencode` | http://192.168.68.62:3019 | 4096/tcp | glasswing |
| `calculators` | `calculators` | http://192.168.68.62:3021 | 80/tcp | glasswing |
| `otel-collector` | `otel-collector` | http://192.168.68.62:4318 | 4318/tcp | glasswing |
| `open-notebook` | `open_notebook` | http://192.168.68.62:5055 | 5055/tcp | internal+glasswing |
| `postgres` | `postgres` | postgres://192.168.68.62:5432 | 5432/tcp | glasswing |
| `beszel` | `beszel` | http://192.168.68.62:8090 | 8090/tcp | glasswing |
| `infisical` | `gateway` | https://192.168.68.62:8095 | 443/tcp | internal |
| `open-notebook` | `open_notebook` | http://192.168.68.62:8502 | 8502/tcp | internal+glasswing |
| `vector` | `vector` | http://192.168.68.62:8686 | 8686/tcp | glasswing |
| `jupyterlab` | `jupyterlab` | http://192.168.68.62:8889 | 8888/tcp | glasswing |
| `langfuse` | `minio` | http://192.168.68.62:9090 | 9000/tcp | internal |
| `steel` | `steel` | http://192.168.68.62:9223 | 9223/tcp | glasswing |
| `portainer` | `portainer` | https://192.168.68.62:9443 | 9443/tcp | glasswing |
| `ollama` | `ollama` | http://192.168.68.62:11434 | 11434/tcp | glasswing |
| `otel-collector` | `otel-collector` | http://192.168.68.62:13133 | 13133/tcp | glasswing |
| `plex` | `plex` | http://192.168.68.62:32400 | 32400/tcp | host |
| `glances` | `glances` | http://192.168.68.62:61208 | 61208/tcp | glasswing |

`dns`, `postgres`, `ssh` rows are not web UIs.

`network_mode: host` stacks (`dagu`, `plex`) publish outside Compose; their ports come from the stack defaults.

