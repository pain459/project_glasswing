
SHELL := /bin/bash
.DEFAULT_GOAL := help

PG := docker compose -f stacks/postgres/compose.yaml
REDIS := docker compose -f stacks/redis/compose.yaml

SECRETS := .local/secrets
NETWORK := glasswing-backend

.PHONY: help init postgres redis up check \
        check-postgres check-redis status \
        stop logs-postgres logs-redis

help:
	@echo "Glasswing Core Foundation"
	@echo ""
	@echo "  make init            Initialize credentials and network"
	@echo "  make postgres        Start PostgreSQL"
	@echo "  make redis           Start Redis"
	@echo "  make up              Start core services in order"
	@echo "  make check           Verify all core services"
	@echo "  make status          Display service status"
	@echo "  make stop            Stop containers (keep volumes)"
	@echo "  make logs-postgres   PostgreSQL logs"
	@echo "  make logs-redis      Redis logs"

init:
	@set -eu; \
	umask 077; \
	mkdir -p $(SECRETS); \
	if [ ! -s $(SECRETS)/postgres_password ]; then \
	  openssl rand -hex 32 > $(SECRETS)/postgres_password; \
	fi; \
	if [ ! -s $(SECRETS)/redis_password ]; then \
	  openssl rand -hex 32 > $(SECRETS)/redis_password; \
	fi; \
	chmod 600 $(SECRETS)/postgres_password $(SECRETS)/redis_password; \
	if [ ! -f $(SECRETS)/redis.acl ]; then \
	  printf 'user default on >%s ~* &* +@all\n' \
	    "$$(cat $(SECRETS)/redis_password)" > $(SECRETS)/redis.acl; \
	fi; \
	chmod 644 $(SECRETS)/redis.acl; \
	if ! docker network inspect $(NETWORK) >/dev/null 2>&1; then \
	  docker network create $(NETWORK) >/dev/null; \
	fi; \
	echo "[PASS] Core credentials and network ready"

postgres: init
	@$(PG) config --quiet
	@$(PG) up -d --wait --wait-timeout 120
	@$(MAKE) --no-print-directory check-postgres

redis: init
	@$(REDIS) config --quiet
	@$(REDIS) up -d --wait --wait-timeout 120
	@$(MAKE) --no-print-directory check-redis

up:
	@$(MAKE) --no-print-directory postgres
	@$(MAKE) --no-print-directory redis
	@echo "[PASS] Shared core services operational"

check-postgres:
	@docker exec glasswing-postgres \
	  psql -U postgres -d postgres \
	  -X -q -t -A -v ON_ERROR_STOP=1 \
	  -c 'SELECT 1;' | grep -qx 1
	@echo "[PASS] PostgreSQL query successful"

check-redis:
	@docker exec glasswing-redis sh -ec \
	  'REDISCLI_AUTH="$$(cat /run/secrets/redis_password)" redis-cli ping' \
	  | grep -qx PONG
	@echo "[PASS] Redis authenticated PING successful"

check: check-postgres check-redis
	@echo "[PASS] All core checks passed"

status:
	@$(PG) ps
	@$(REDIS) ps

stop:
	@$(REDIS) stop
	@$(PG) stop
	@echo "[OK] Containers stopped; data retained"

logs-postgres:
	@$(PG) logs --tail=100 -f

logs-redis:
	@$(REDIS) logs --tail=100 -f
