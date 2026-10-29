# Reverse proxy

`glasswing-proxy` is the single HTTP/HTTPS entry point for the platform. It is
an nginx container that joins the shared `glasswing-proxy` Docker network and
routes by hostname:

```
https://homepage.glasswing.lan  ->  glasswing-homepage:3000
https://forgejo.glasswing.lan   ->  glasswing-forgejo:3000
https://opencode.glasswing.lan  ->  glasswing-opencode:4096
```

Only ports **80** and **443** are published for web traffic. Web services no
longer publish their own HTTP ports; they join the shared network and are
reached by container name. The exceptions are listed under
[Ports that stay direct](#ports-that-stay-direct).

## Why hostnames instead of paths

Path-based routing (`/forgejo`, `/excalidraw`) breaks applications that assume
they own `/`, including Excalidraw, CyberChef, IT-Tools, Calculators and
Stirling-PDF. A hostname per service keeps every application at its natural
root path.

## URLs

| Service | URL | Upstream |
| --- | --- | --- |
| Homepage / platform root | `https://glasswing.lan` | `glasswing-homepage:3000` |
| Homepage | `https://homepage.glasswing.lan` | `glasswing-homepage:3000` |
| AdGuard Home | `https://adguard.glasswing.lan` | `glasswing-adguard:80` |
| AnythingLLM | `https://anythingllm.glasswing.lan` | `glasswing-anythingllm:3001` |
| Beszel | `https://beszel.glasswing.lan` | `glasswing-beszel:8090` |
| Calculators | `https://calculators.glasswing.lan` | `glasswing-calculators:80` |
| CyberChef | `https://cyberchef.glasswing.lan` | `glasswing-cyberchef:8080` |
| Dagu | `https://dagu.glasswing.lan` | `host.docker.internal:3014` |
| DBGate | `https://dbgate.glasswing.lan` | `glasswing-dbgate:3000` |
| Excalidraw | `https://excalidraw.glasswing.lan` | `glasswing-excalidraw:80` |
| Flowise | `https://flowise.glasswing.lan` | `glasswing-flowise:3000` |
| Forgejo | `https://forgejo.glasswing.lan` | `glasswing-forgejo:3000` |
| Glances | `https://glances.glasswing.lan` | `glasswing-glances:61208` |
| Infisical | `https://infisical.glasswing.lan` | `infisical-gateway:443` |
| IT-Tools | `https://it-tools.glasswing.lan` | `glasswing-it-tools:80` |
| JupyterLab | `https://jupyter.glasswing.lan` | `glasswing-jupyterlab:8888` |
| Kavita | `https://kavita.glasswing.lan` | `glasswing-kavita:5000` |
| Langfuse | `https://langfuse.glasswing.lan` | `langfuse:3000` |
| Langfuse media (MinIO) | `https://minio.glasswing.lan` | `langfuse-minio:9000` |
| Ollama API | `https://ollama.glasswing.lan` | `glasswing-ollama:11434` |
| Open Notebook | `https://notebook.glasswing.lan` | `open-notebook:8502` |
| Open Notebook API | `https://notebook-api.glasswing.lan` | `open-notebook:5055` |
| OpenCode | `https://opencode.glasswing.lan` | `glasswing-opencode:4096` |
| OpenObserve | `https://openobserve.glasswing.lan` | `glasswing-openobserve:5080` |
| OTel Collector health | `https://otel.glasswing.lan` | `glasswing-otel-collector:13133` |
| Plex | `https://plex.glasswing.lan` | `host.docker.internal:32400` |
| Portainer | `https://portainer.glasswing.lan` | `glasswing-portainer:9443` |
| Steel Browser | `https://steel.glasswing.lan` | `glasswing-steel:3000` |
| Stirling-PDF | `https://stirling.glasswing.lan` | `glasswing-stirling-pdf:8080` |
| Uptime Kuma | `https://uptime.glasswing.lan` | `glasswing-uptime-kuma:3001` |
| Vector API | `https://vector.glasswing.lan` | `glasswing-vector:8686` |

## DNS

The proxy relies on hostnames, so clients must resolve `glasswing.lan` and
`*.glasswing.lan` to Pathfinder. Add two DNS rewrites in AdGuard Home — a
wildcard does **not** cover the bare apex domain:

1. Open AdGuard Home. Before migration that is
   `http://192.168.68.62:3007`; afterwards it is
   `https://adguard.glasswing.lan`.
2. Go to **Filters → DNS rewrites**.
3. Add:
   - Domain: `glasswing.lan`
   - Answer: `192.168.68.62`
   - Domain: `*.glasswing.lan`
   - Answer: `192.168.68.62`

For a client that does not use AdGuard, add a hosts entry instead:

```
192.168.68.62  glasswing.lan homepage.glasswing.lan forgejo.glasswing.lan
```

Add every hostname the client needs, or use a local DNS resolver.

## TLS

The proxy uses a wildcard certificate for `*.glasswing.lan`, signed by the
local Glasswing CA:

```
.local/ca/glasswing-ca.crt   # CA certificate (distribute to clients)
.local/ca/glasswing-ca.key   # CA private key (keep offline)
stacks/proxy/certs/          # generated, git-ignored
```

Generate or renew:

```bash
./scripts/gen-proxy-cert.sh          # skips a cert valid for 30+ days
./scripts/gen-proxy-cert.sh --force  # reissue now
make restart STACK=proxy             # nginx picks up the new files
```

Trust `.local/ca/glasswing-ca.crt` on client devices. The same CA already
signs the Portainer certificate, so this is not a new trust decision for the
platform. The Infisical bootstrap gateway still serves its own self-signed
certificate, which is why the proxy skips upstream verification for that one
route.

The certificate is issued for `glasswing.lan` and `*.glasswing.lan`. It does
not cover the bare IP address, so use a hostname rather than
`https://192.168.68.62`.

## Deploy / migration order

The first deployment changes hostnames, ports, and application base URLs. Run
it in this order on Pathfinder. Infisical must already be running, because
`make` loads `GLASSWING_HOST_IP` and `GLASSWING_TZ` from its `/global` path
(`make core` starts Infisical first).

```bash
cd /home/ravik/src_git/project_glasswing

# 1. Create the shared network and TLS certificate, then start nginx.
make up STACK=proxy

# 2. Push the new public URLs into Infisical.
make proxy-migrate

# 3. Add the AdGuard DNS rewrites now (see DNS above), while AdGuard is
#    still reachable on its old port. Clients that do not use AdGuard need a
#    hosts entry instead.

# 4. Recreate every stack: joins the shared network, drops host ports, and
#    picks up the new APP_URL / ROOT_URL / NEXTAUTH_URL values.
make restart-all

# 5. Update Uptime Kuma monitors (see below), then open https://glasswing.lan
#    and verify each card.
```

Uptime Kuma monitors are stored in its volume, not in this repository, so they
are not migrated automatically. Any monitor pointed at a host port that no
longer exists (`http://192.168.68.62:30xx`) starts failing after step 4. Edit
each monitor to the new hostname (`https://forgejo.glasswing.lan`) or to the
internal name (`http://glasswing-forgejo:3000`) — Uptime Kuma joins the shared
network, so internal names resolve without DNS.

Add the DNS rewrites **before** step 4. Once AdGuard is recreated, its old
`:3007` port is gone and its UI is only reachable through the proxy, which
needs the rewrites to resolve. If you forget, reach it by container IP
(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' glasswing-adguard`)
or add a temporary hosts entry.

`make restart-all` starts Infisical first, then the proxy, then the remaining
stacks. The proxy can start before its upstreams; routes return `502` until
the target container is on the shared network.

If something goes wrong, the old direct ports are gone by design. Recover by
running `make down STACK=<name>` and `make up STACK=<name>`; the proxy and the
shared network are independent of any single stack.

## Ports that stay direct

Some ports stay published because a non-HTTP protocol or a fixed client
endpoint depends on them:

| Port | Service | Why |
| --- | --- | --- |
| `53/tcp`, `53/udp` | AdGuard | DNS |
| `2222/tcp` | Forgejo | Git over SSH |
| `3014/tcp` | Dagu | Host networking; coordinator advertises the host IP |
| `3018/tcp` | OpenObserve | OTLP/JSON ingestion from OTel and Vector |
| `3100/tcp` | Steel | REST API used by `steel-mcp` and OpenCode |
| `11434/tcp` | Ollama | API used by host-side tooling and local clients |
| `32400/tcp` | Plex | Native clients, discovery and host networking |
| `4318/tcp` | OTel Collector | OTLP HTTP ingestion |
| `5432/tcp` | PostgreSQL | Database administration and DBGate |
| `8095/tcp` | Infisical | Bootstrap gateway; `make` secret injection depends on it |
| `9223/tcp` | Steel | Chrome DevTools Protocol debugger |

Everything else is behind `:443`.

## Adding a service behind the proxy

1. Give the service a stable container name or a network alias.
2. Join the shared network and remove its published port:

   ```yaml
   services:
     newtool:
       container_name: glasswing-newtool
       # ports:            # remove
       #   - "192.168.68.62:30xx:80"
       networks:
         - proxy

   networks:
     proxy:
       name: glasswing-proxy
       external: true
   ```

3. Add a server block to `stacks/proxy/nginx/conf.d/default.conf`:

   ```nginx
   server {
       listen 443 ssl;
       http2 on;
       server_name newtool.glasswing.lan;

       include /etc/nginx/snippets/tls.conf;
       include /etc/nginx/snippets/proxy.conf;

       location / {
           set $upstream http://glasswing-newtool:80;
           proxy_pass $upstream;
       }
   }
   ```

4. Reload nginx without restarting it:

   ```bash
   docker exec glasswing-proxy nginx -t
   docker exec glasswing-proxy nginx -s reload
   ```

5. Add a Homepage card and, if it is a long-running service, an Uptime Kuma
   monitor.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `502 Bad Gateway` | Upstream container is not on `glasswing-proxy` | Check `networks:` in the stack and `make up STACK=<name>` |
| `502` after a stack recreate | Container name/alias changed | Update `set $upstream` and reload nginx |
| `404` with a known hostname | Missing `server_name` or wrong Host header | Check `nginx/conf.d/default.conf` |
| Browser certificate warning | Glasswing CA not trusted | Install `.local/ca/glasswing-ca.crt` on the client |
| `NXDOMAIN` | AdGuard rewrite missing | Add both `glasswing.lan` and `*.glasswing.lan` -> `192.168.68.62` |
| `403` from Homepage | `HOMEPAGE_ALLOWED_HOSTS` does not include the new host | Run `make proxy-migrate` and restart Homepage |
| App redirects to `192.168.68.62:30xx` | App base URL still points at the old port | Update its registry and run `make proxy-migrate` |

Useful commands:

```bash
make logs STACK=proxy
make ps STACK=proxy
docker exec glasswing-proxy nginx -t
docker exec glasswing-proxy cat /etc/nginx/conf.d/default.conf
docker network inspect glasswing-proxy
```

## Docker network pool

The proxy adds one network (`glasswing-proxy`). Each multi-service stack still
has its own internal network for databases and workers.

Docker allocates every new network from `default-address-pools`. The built-in
defaults only yield about 17 networks, so a platform this size exhausts them
and every new network fails with:

```
Error response from daemon: all predefined address pools have been fully subnetted
```

### Unblock immediately

A network created with an explicit `--subnet` does not take a slot from the
pool, so the deploy can continue without restarting Docker:

```bash
# Confirm the range is unused first
docker network inspect $(docker network ls -q) \
  --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}' | sort

docker network create --driver bridge --subnet 10.99.0.0/24 glasswing-proxy
make up STACK=proxy
```

The network is external to every Compose file, so `make up`/`restart-all` only
attach to it and never try to create it again.

### Durable fix

Widen the pool so future stacks can still create their own networks. Merge this
into `/etc/docker/daemon.json` — do not drop keys that are already there:

```json
{
  "default-address-pools": [
    { "base": "172.16.0.0/12", "size": 24 }
  ]
}
```

`172.16.0.0/12` with `/24` subnets allows 4096 networks and does not overlap
the `192.168.68.0/24` LAN. Existing networks keep their addresses; only new
ones use the wider pool.

Then restart the daemon. Containers with `restart: unless-stopped` come back on
their own, but expect a short outage:

```bash
sudo systemctl restart docker
make ps
```

`docker network prune -f` also frees subnets, but only for networks no
container is using; stopped stacks lose their network until the next `make up`.
Prefer the wider pool.

## Security notes

- The proxy is LAN-only. Do not port-forward `80` or `443` to the internet.
- The proxy does not add authentication. Each application keeps its own login;
  services that had no authentication before still have none.
- `proxy_ssl_verify off` is used only for the two internal HTTPS upstreams
  (Infisical gateway and Portainer), whose certificates the proxy does not
  trust.
- `stacks/proxy/certs/` and `.local/ca/` are git-ignored. Back up the CA key
  with the rest of the recovery material.
