SHELL := /bin/bash
.DEFAULT_GOAL := help

STACK ?= infisical
STACK_DIR := stacks/$(STACK)
COMPOSE_FILE := $(STACK_DIR)/compose.yaml
SECRETS_FILE := $(STACK_DIR)/secrets.list

# Default secret location: /<stack>. The collector reuses /openobserve.
INFISICAL_PATH ?= $(if $(filter otel-collector,$(STACK)),/openobserve,/$(STACK))

# Needed by the OTEL collector to access /var/run/docker.sock as non-root.
export DOCKER_GID := $(shell stat -c '%g' /var/run/docker.sock 2>/dev/null)

.PHONY: help up down restart logs ps check infisical homepage core status \
        secrets-check secrets-injection-check

help:
	@echo "Glasswing Stack Manager"
	@echo ""
	@echo "make core                         Start base stacks"
	@echo "make infisical                    Start Infisical"
	@echo "make homepage                     Start Homepage"
	@echo "make up STACK=name                Start any stack"
	@echo "make down STACK=name              Stop/remove stack containers"
	@echo "make restart STACK=name           Restart stack containers"
	@echo "make logs STACK=name              Follow stack logs"
	@echo "make ps STACK=name                Show stack status"
	@echo "make check STACK=name             Validate Compose configuration and show status"
	@echo "make status                       Show all Docker containers"
	@echo "make secrets-check                Verify Infisical integration"
	@echo "make secrets-injection-check      Verify test-secret injection"
	@echo ""
	@echo "Optional: INFISICAL_PATH=/custom/path (default /<stack>)"

# Common runner keeps secrets available for every docker compose command.
# Usage inside recipes: $(call run_compose,up -d --wait --wait-timeout 180)
define run_compose
set -eu; \
 test -f "$(COMPOSE_FILE)" || { echo "[FAIL] Unknown stack: $(STACK)"; exit 1; }; \
 if [ -s "$(SECRETS_FILE)" ]; then \
   echo "[INFO] Infisical path: $(INFISICAL_PATH)"; \
   ./scripts/with-infisical.sh "$(INFISICAL_PATH)" "$(SECRETS_FILE)" -- \
     docker compose -f "$(COMPOSE_FILE)" $(1); \
 else \
   docker compose -f "$(COMPOSE_FILE)" $(1); \
 fi
endef

up:
	@$(call run_compose,up -d --wait --wait-timeout 180)
	@echo "[PASS] Stack $(STACK) started"

down:
	@$(call run_compose,down)

restart:
	@$(call run_compose,restart)

logs:
	@$(call run_compose,logs --tail=100 -f)

ps:
	@docker ps --filter "label=com.docker.compose.project=glasswing-$(STACK)" \
	  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

check:
	@$(call run_compose,config -q)
	@echo "[PASS] Compose configuration valid: $(STACK)"
	@$(MAKE) --no-print-directory ps STACK=$(STACK)

infisical:
	@$(MAKE) --no-print-directory up STACK=infisical

homepage:
	@$(MAKE) --no-print-directory up STACK=homepage

core:
	@$(MAKE) --no-print-directory infisical
	@$(MAKE) --no-print-directory homepage
	@echo "[PASS] Glasswing core stacks started"

status:
	@docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

secrets-check:
	@bash scripts/04-infisical-check.sh

secrets-injection-check:
	@./scripts/with-infisical.sh \
	  /test tests/infisical-secrets.list -- \
	  bash -c 'test "$$GLASSWING_TEST_SECRET" = "pathfinder-ready"'
	@echo "[PASS] Infisical secret injection operational"
