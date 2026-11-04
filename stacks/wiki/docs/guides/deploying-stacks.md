# Deploying Stacks

How to add a new service to the Glasswing Docker stack.

---

## Quick Start

```bash
# 1. Create the stack directory
mkdir stacks/my-service/

# 2. Create compose.yaml
# 3. Create secrets.list (if needed)
# 4. Deploy
make up STACK=my-service
```

---

## Stack Structure

Every stack follows this layout:

```
stacks/<name>/
├── compose.yaml          # Docker Compose definition
├── Dockerfile.*          # Custom images (optional)
├── config/               # Service configuration (optional)
├── pre-up.sh             # Pre-deploy hook (optional)
├── secrets.list          # Infisical secret references
└── .gitignore            # Exclude local data
```

---

## Step-by-Step

### 1. Create the directory

```bash
mkdir stacks/my-service/
```

### 2. Write compose.yaml

Extend the base configuration:

```yaml
name: glasswing-my-service

services:
  my-service:
    extends:
      file: ../base.yaml
      service: hardened    # or 'base' if root is needed
    image: some/image:tag
    container_name: glasswing-my-service

    ports:
      - "${GLASSWING_HOST_IP}:3030:80"

    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:80/ || exit 1"]
      interval: 60s
      timeout: 5s
      retries: 3
      start_period: 10s

    labels:
      com.glasswing.service: my-service
      OTEL_SERVICE_NAME: glasswing-my-service

    networks:
      - glasswing

networks:
  glasswing:
    name: ${GLASSWING_NETWORK:-glasswing}
    external: true
```

### 3. Write secrets.list

List any secrets this stack needs from Infisical:

```
# stacks/my-service/secrets.list
MY_SERVICE_API_KEY
MY_SERVICE_DB_PASSWORD
```

If no secrets are needed:

```
# No secrets needed
```

### 4. Add pre-up.sh (optional)

For stacks that need setup before deployment:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Example: clone a repository
if [ ! -d "src" ]; then
  git clone --depth 1 --branch main https://github.com/user/repo.git src
fi
```

Make it executable:

```bash
chmod +x stacks/my-service/pre-up.sh
```

### 5. Deploy

```bash
make up STACK=my-service
```

### 6. Verify

```bash
# Check container status
docker ps --filter "name=my-service"

# Check health
docker inspect --format='{{.State.Health.Status}}' glasswing-my-service

# Test the endpoint
curl -sf http://192.168.68.62:3030/
```

### 7. Add to Homepage

Edit `stacks/homepage/config/services.yaml`:

```yaml
- My Category:
    - My Service:
        icon: mdi-icon-name
        href: http://192.168.68.62:3030
        description: Short description
        container: glasswing-my-service
        siteMonitor: http://192.168.68.62:3030
```

Then rebuild the homepage:

```bash
make rebuild STACK=homepage
```

---

## Common Patterns

### Static HTML service

```dockerfile
# Dockerfile
FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
```

### Service with custom build

```yaml
build:
  context: ./src/
  dockerfile: Dockerfile
image: glasswing/my-service:latest
```

### Service with persistent data

```yaml
volumes:
  - my-service-data:/data

volumes:
  my-service-data:
```

### Service that needs GPU access

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

### Service with Docker socket proxy (read-only)

For services that need Docker API access without full socket privileges:

```yaml
services:
  docker-proxy:
    extends:
      file: ../base.yaml
      service: hardened
    image: tecnativa/docker-socket-proxy:0.3.0
    container_name: glasswing-docker-proxy

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

    environment:
      CONTAINERS: "1"
      IMAGES: "1"
      EVENTS: "1"

    expose:
      - "2375"

    networks:
      - glasswing
```

See `stacks/wud/compose.yaml` for a complete example (WUD image update monitor).

---

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make up STACK=name` | Build and start a stack (pulls images first) |
| `make update STACK=name` | Pull latest pinned images and restart a stack |
| `make down STACK=name` | Stop and remove a stack |
| `make restart STACK=name` | Restart a stack without pulling |
| `make rebuild STACK=name` | Rebuild and restart a stack |
| `make logs STACK=name` | View container logs |
| `make ps` | List all running containers |
| `make version-list` | Show all tracked image versions |
| `make version-apply` | Sync compose files to match versions.yaml |
| `make version-check` | Check compose files match versions.yaml |
| `make version-promote KEY=k V=v` | Promote an image to a new version |
| `make version-rollback STACK=name` | Rollback a stack to previous versions |
| `make version-rollback-all` | Rollback all stacks to previous versions |

---

## Version Management

All external Docker image versions are managed through `stacks/versions.yaml`, a central registry that tracks a `current` and `previous` tag for every image. Compose files reference concrete tags directly; the version scripts keep them in sync.

### How It Works

```
stacks/versions.yaml          ← single source of truth (40+ images)
        │
        ▼
scripts/version-apply.py     ← syncs compose files to match
        │
        ▼
stacks/*/compose.yaml        ← concrete image tags, no :latest
```

### Viewing Current Versions

```bash
make version-list
```

This shows every tracked image with its current and previous tags:

```
infisical          v0.167.4        v0.166.0
nginx              1.28-alpine     1.26-alpine
postgres           17-alpine       16-alpine
redis              7.2-alpine      7-alpine
...
```

### Checking for Drift

```bash
make version-check
```

Scans all compose files and reports any image tag that doesn't match `versions.yaml`. Exits with code 2 on drift, so it works in CI or pre-commit hooks.

### Promoting an Image to a New Version

```bash
# Promote nginx to 1.29-alpine
make version-promote KEY=nginx V=1.29-alpine
```

This does three things in order:
1. Shifts the current `nginx` tag from `1.28-alpine` → `previous`
2. Sets `1.29-alpine` as the new `current`
3. Runs `version-apply` to update all compose files

**Finding valid keys:** Run `make version-list` or look at the top-level keys in `stacks/versions.yaml`. Note that shared images (postgres, redis) have separate keys per-stack when needed (e.g., `langfuse` has its own `postgres` and `redis` entries via the `VERSION_MAP` in `scripts/version-apply.py`).

### Rolling Back a Single Stack

```bash
# Roll back langfuse to its previous image versions
make version-rollback STACK=langfuse
```

This swaps `current` ↔ `previous` for every image key belonging to that stack, syncs compose files, and redeploy. Known stack names:

| Stack | Image Keys Affected |
|-------|-------------------|
| `infisical` | infisical, nginx, postgres, redis |
| `langfuse` | langfuse, langfuse-worker, clickhouse, minio, postgres, redis |
| `wud` | wud, docker-socket-proxy |
| `searxng` | searxng, valkey |
| `paperless` | paperless, postgres, valkey |
| `open-notebook` | surrealdb, open-notebook-app |
| `news-centre` | glance, freshrss |
| *(single-image stacks)* | portainer, uptime-kuma, adguard, glances, vector, otel-collector, ollama, anythingllm, flowise, forgejo, dbgate, excalidraw, cyberchef, it-tools, openobserve, jupyterlab, plex, kavita, stirling-pdf, homebox, homepage, datetime, steel |

### Rolling Back All Stacks

```bash
make version-rollback-all
```

Swaps `current` ↔ `previous` for **every** tracked image, syncs all compose files, and restarts all stacks. Use this when a broad promotion causes issues.

The rollback audit log is written to `stacks/versions.rollback.log` (gitignored).

### Editing versions.yaml Directly

You can edit `stacks/versions.yaml` by hand (e.g., to add a new image or adjust a `previous` tag). After editing, run:

```bash
make version-apply    # sync compose files
make version-check    # verify zero drift
```

### How WUD Fits In

WUD (Watch Updates Docker) runs in **detection-only** mode. It checks registries for newer tags at ~02:00 and ~14:00 IST and displays them in its dashboard at `http://192.168.68.62:3031`. It never auto-updates.

The workflow is:

1. **See** a newer version in the WUD dashboard
2. **Verify** the new version is stable (changelog, release notes)
3. **Promote** it: `make version-promote KEY=<key> V=<new_tag>`
4. **Deploy** it: `make update STACK=<name>`

One dashboard for detection, one command for action.

---

## Troubleshooting

See [Troubleshooting guide](/guides/troubleshooting.md).
