
SHELL := /bin/bash
.DEFAULT_GOAL := help

STACK ?= infisical
COMPOSE := docker compose -f stacks/$(STACK)/compose.yaml

.PHONY: help up down restart logs ps check \
        infisical homepage core status


help:
	@echo "Glasswing Stack Manager"
	@echo ""
	@echo "make core                  Start base stacks"
	@echo "make infisical             Start Infisical"
	@echo "make homepage              Start Homepage"
	@echo "make up STACK=name         Start any stack"
	@echo "make down STACK=name       Stop/remove stack containers"
	@echo "make restart STACK=name    Restart stack"
	@echo "make logs STACK=name       Follow stack logs"
	@echo "make ps STACK=name         Show stack status"
	@echo "make check STACK=name      Validate stack configuration"
	@echo "make status                Show all Docker containers"


up:
	@set -eu; \
	STACK_DIR="stacks/$(STACK)"; \
	COMPOSE_FILE="$$STACK_DIR/compose.yaml"; \
	KEYS_FILE="$$STACK_DIR/secrets.list"; \
	test -f "$$COMPOSE_FILE" || { \
	  echo "[FAIL] Unknown stack: $(STACK)"; exit 1; \
	}; \
	if [ -s "$$KEYS_FILE" ]; then \
	  echo "[INFO] Infisical integration enabled: $(STACK)"; \
	  ./scripts/with-infisical.sh \
	    "/$(STACK)" "$$KEYS_FILE" -- \
	    docker compose -f "$$COMPOSE_FILE" \
	    up -d --wait --wait-timeout 180; \
	else \
	  echo "[INFO] No external secrets required: $(STACK)"; \
	  docker compose -f "$$COMPOSE_FILE" \
	    up -d --wait --wait-timeout 180; \
	fi; \
	echo "[PASS] Stack $(STACK) started"



down:
	@$(COMPOSE) down

restart:
	@$(COMPOSE) restart

logs:
	@$(COMPOSE) logs --tail=100 -f

ps:
	@docker ps --filter "label=com.docker.compose.project=glasswing-$(STACK)" \
	  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

check:
	@docker ps --filter "label=com.docker.compose.project=glasswing-$(STACK)" \
	  --format 'table {{.Names}}\t{{.Status}}'

infisical:
	@$(MAKE) --no-print-directory up STACK=infisical

homepage:
	@$(MAKE) --no-print-directory up STACK=homepage

core:
	@$(MAKE) --no-print-directory infisical
	@$(MAKE) --no-print-directory homepage
	@echo "[PASS] Glasswing core stacks started"

status:
	@docker ps --format \
	  'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

.PHONY: secrets-check

secrets-check:
	@bash scripts/04-infisical-check.sh



.PHONY: secrets-injection-check

secrets-injection-check:
	@./scripts/with-infisical.sh \
	  /test tests/infisical-secrets.list -- \
	  bash -c 'test "$$GLASSWING_TEST_SECRET" = "pathfinder-ready"'
	@echo "[PASS] Infisical secret injection operational"
	