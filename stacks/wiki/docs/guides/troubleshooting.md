# Troubleshooting

Common issues and their fixes.

---

## Container Won't Start

### Check logs

```bash
make logs STACK=<name>
```

### Check for secret errors

If the container exits immediately, check if Infisical secrets are loaded:

```bash
# Test secret retrieval
make secrets STACK=<name>
```

### Check port conflicts

```bash
# Find what's using a port
docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep :3030
```

---

## Health Check Failing

### Service takes too long to start

Increase `start_period` in compose.yaml:

```yaml
healthcheck:
  start_period: 120s    # Give it 2 minutes
```

### Health check command wrong

Use `127.0.0.1` instead of `localhost` (Alpine IPv6 resolution):

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:80/ || exit 1"]
```

---

## Network Issues

### Container can't reach another service

```bash
# Test connectivity from inside a container
docker exec glasswing-my-service wget -qO- http://glasswing-other-service:8080/
```

### Port not accessible from LAN

Check that the port is published on `192.168.68.62`, not `0.0.0.0`:

```yaml
ports:
  - "${GLASSWING_HOST_IP}:3030:80"
```

---

## Disk Space

### Check Docker disk usage

```bash
docker system df
```

### Clean unused images and containers

```bash
docker image prune -a
docker container prune
```

### Check volume sizes

```bash
docker volume ls
docker system df -v
```

---

## OOM (Out of Memory)

### Check container memory limits

```bash
docker inspect --format='{{.HostConfig.Memory}}' glasswing-my-service
```

### Increase memory limit

Add to compose.yaml:

```yaml
mem_limit: 4g
```

---

## Infisical Secrets

### Secrets not loading

1. Check `secrets.list` exists in the stack directory
2. Verify secret names match Infisical configuration
3. Check Infisical container is running:

```bash
docker ps --filter "name=infisical"
```

---

## PostgreSQL

### Can't connect to database

```bash
# Check PostgreSQL is running
docker ps --filter "name=postgres"

# Test connection
docker exec glasswing-postgres pg_isready
```

### Database already exists

When a stack creates its own database, check if it already exists:

```bash
docker exec glasswing-postgres psql -U postgres -c "\l"
```

---

## Rebuilding After Changes

### Config file changes

```bash
make rebuild STACK=<name>
```

### Dockerfile changes

```bash
make up STACK=<name>    # Rebuilds automatically if Dockerfile changed
```

### Force rebuild

```bash
docker compose -f stacks/<name>/compose.yaml build --no-cache
make up STACK=<name>
```

---

## Useful Commands

| Command | What it does |
|---------|-------------|
| `docker ps -a` | List all containers (including stopped) |
| `docker logs <container>` | View container logs |
| `docker exec -it <container> sh` | Shell into a container |
| `docker inspect <container>` | Detailed container info |
| `docker stats` | Real-time resource usage |
| `make ps` | List all Glasswing containers |
