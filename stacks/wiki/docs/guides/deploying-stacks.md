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

---

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make up STACK=name` | Build and start a stack |
| `make down STACK=name` | Stop and remove a stack |
| `make rebuild STACK=name` | Rebuild and restart a stack |
| `make logs STACK=name` | View container logs |
| `make ps` | List all running containers |

---

## Troubleshooting

See [Troubleshooting guide](/guides/troubleshooting.md).
