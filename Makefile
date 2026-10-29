SHELL := /bin/bash
.DEFAULT_GOAL := help

STACK ?= infisical
STACK_DIR := stacks/$(STACK)
COMPOSE_FILE := $(STACK_DIR)/compose.yaml
SECRETS_FILE := $(STACK_DIR)/secrets.list
PRE_UP_HOOK := $(STACK_DIR)/pre-up.sh
POST_UP_HOOK := $(STACK_DIR)/post-up.sh

# Default secret location: /<stack>. The collector reuses /openobserve.
INFISICAL_PATH ?= $(if $(filter otel-collector vector,$(STACK)),/openobserve,/$(STACK))

# Needed by the OTEL collector to access /var/run/docker.sock as non-root.
export DOCKER_GID := $(shell stat -c '%g' /var/run/docker.sock 2>/dev/null)

.PHONY: help up down restart rebuild logs ps check infisical homepage proxy core status \
        secrets-check secrets-injection-check proxy-migrate ip-migrate access

help:
	@echo "Glasswing Stack Manager"
	@echo ""
	@echo "make core                         Start base stacks (Infisical, Homepage)"
	@echo "make infisical                    Start Infisical"
	@echo "make proxy                        Optional: start the nginx reverse proxy (needs DNS)"
	@echo "make homepage                     Start Homepage"
	@echo "make up STACK=name                Start a stack, run its hooks, wait for health"
	@echo "make down STACK=name              Stop/remove stack containers"
	@echo "make rebuild STACK=name           Rebuild image and redeploy stack"
	@echo "make restart STACK=name           Restart stack containers"
	@echo "make logs STACK=name              Follow stack logs"
	@echo "make ps STACK=name                Show stack status"
	@echo "make check STACK=name             Validate Compose configuration and show status"
	@echo "make status                       Show all Docker containers"
	@echo "make ollama-model                 Rebuild the coding model from its Modelfile"
	@echo "make ai-preflight                 Validate the Ollama/OpenCode inference baseline"
	@echo "make secrets-check                Verify Infisical integration"
	@echo "make secrets-injection-check      Verify test-secret injection"
	@echo "make ip-migrate                   Push IP-based app URLs to Infisical"
	@echo "make access                       Print the IP:port access map"
	@echo ""
	@echo "Optional: INFISICAL_PATH=/custom/path (default /<stack>)"
	@echo "Optional: stacks/<name>/pre-up.sh and post-up.sh run automatically with make up"

# Common runner keeps secrets available for every docker compose command.
# Usage inside recipes: $(call run_compose,up -d --wait --wait-timeout 180)
define run_compose
set -eu; \
 test -f "$(COMPOSE_FILE)" || { echo "[FAIL] Unknown stack: $(STACK)"; exit 1; }; \
 docker network inspect glasswing-proxy >/dev/null 2>&1 || \
   docker network create glasswing-proxy >/dev/null; \
 if [ -s "$(SECRETS_FILE)" ]; then \
   echo "[INFO] Infisical path: $(INFISICAL_PATH)"; \
   ./scripts/with-infisical.sh "$(INFISICAL_PATH)" "$(SECRETS_FILE)" -- \
     docker compose -f "$(COMPOSE_FILE)" $(1); \
 else \
   docker compose -f "$(COMPOSE_FILE)" $(1); \
 fi
endef

# Optional stack-local hooks keep setup and validation with the stack that owns
# it. `pre-up.sh` runs before Compose; `post-up.sh` runs after the stack is
# healthy. Both are skipped when absent.
up:
	@if [ -x "$(PRE_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(PRE_UP_HOOK)"; \
	  "$(PRE_UP_HOOK)"; \
	fi
	@$(call run_compose,up -d --build --wait --wait-timeout 180)
	@if [ -x "$(POST_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(POST_UP_HOOK)"; \
	  "$(POST_UP_HOOK)"; \
	fi
	@echo "[PASS] Stack $(STACK) started"

down:
	@$(call run_compose,down --rmi local)

rebuild:
	@$(call run_compose,down --rmi local)
	@$(call run_compose,build --no-cache)
	@$(call run_compose,up -d --wait --wait-timeout 180)
	@echo "[PASS] Stack $(STACK) rebuilt"

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

proxy:
	@$(MAKE) --no-print-directory up STACK=proxy

homepage:
	@$(MAKE) --no-print-directory up STACK=homepage

core:
	@$(MAKE) --no-print-directory infisical
	@$(MAKE) --no-print-directory homepage
	@echo "[PASS] Glasswing core stacks started"

status:
	@docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'


secrets-check:
	@set -eu; \
	echo "[INFO] Checking Infisical integration"; \
	test -x scripts/with-infisical.sh || { \
	  echo "[FAIL] Missing executable: scripts/with-infisical.sh"; \
	  exit 1; \
	}; \
	test -s tests/infisical-secrets.list || { \
	  echo "[FAIL] Missing test secret list"; \
	  exit 1; \
	}; \
	./scripts/with-infisical.sh \
	  /test tests/infisical-secrets.list -- \
	  bash -c 'test "$$GLASSWING_TEST_SECRET" = "pathfinder-ready"'; \
	echo "[PASS] Infisical authentication and secret injection operational"


secrets-injection-check:
	@./scripts/with-infisical.sh \
	  /test tests/infisical-secrets.list -- \
	  bash -c 'test "$$GLASSWING_TEST_SECRET" = "pathfinder-ready"'
	@echo "[PASS] Infisical secret injection operational"


# App URLs that must match how a browser reaches the service. They live in
# Infisical, so changing compose files alone is not enough.
URL_CONFIG_STACKS := anythingllm beszel flowise forgejo homepage langfuse opencode

ip-migrate:
	@set -eu; \
	for stack in $(URL_CONFIG_STACKS); do \
	  registry="stacks/$$stack/$$stack-config.registry"; \
	  echo "[INFO] Registering $$stack config from $$registry"; \
	  ./scripts/infisical-register.sh "/$$stack" "$$registry"; \
	done; \
	echo "[PASS] IP-based URLs registered in Infisical"

# Kept as an alias: the same registries carried the proxy-era URLs.
proxy-migrate: ip-migrate

access:
	@./scripts/access-map.sh


# --------------------------------------------------
# Glasswing platform-wide lifecycle management
# --------------------------------------------------

.PHONY: list-stacks restart-all ollama-model ai-preflight

# Discover all independently managed Compose projects.
STACKS := $(patsubst stacks/%/compose.yaml,%,$(wildcard stacks/*/compose.yaml))

list-stacks:
	@printf '%s\n' $(sort $(STACKS))

# Reconcile every stack with its current Compose configuration.
# This recreates containers only when their configuration has changed.
# Run Infisical first to ensure secret injection remains available.
restart-all:
	@set -e; \
	echo "========================================"; \
	echo " Glasswing - Platform Redeployment"; \
	echo "========================================"; \
	echo ""; \
	if [ -f stacks/infisical/compose.yaml ]; then \
	  echo "[INFO] Starting Infisical"; \
	  $(MAKE) --no-print-directory up STACK=infisical; \
	fi; \
	for stack in $(sort $(filter-out infisical proxy,$(STACKS))); do \
	  echo ""; \
	  echo "========================================"; \
	  echo "[INFO] Deploying $$stack"; \
	  echo "========================================"; \
	  $(MAKE) --no-print-directory up STACK=$$stack || exit 1; \
	done; \
	echo ""; \
	echo "[PASS] All Glasswing stacks reconciled"



# --------------------------------------------------
# Pathfinder local inference baseline
# --------------------------------------------------

OLLAMA_CONTAINER ?= glasswing-ollama
OLLAMA_MODEL ?= qwen3.6-opencode:latest
OLLAMA_BASE_MODEL ?= qwen3.6:27b
OLLAMA_MODELFILE ?= stacks/ollama/models/qwen3.6-opencode.Modelfile

# Stack hooks and the build script read these; command-line overrides still win.
export OLLAMA_CONTAINER OLLAMA_MODEL OLLAMA_BASE_MODEL OLLAMA_MODELFILE
export SKIP_PREFLIGHT FORCE

# Lower-level target. `make up STACK=ollama` runs this automatically through
# stacks/ollama/post-up.sh, including pulling the base model when it is missing.
ollama-model:
	@./stacks/ollama/build-model.sh

ai-preflight:
	@./scripts/ai-preflight.sh --opencode


# --------------------------------------------------
# Glasswing unified Restic backups
# --------------------------------------------------

.PHONY: backup backup-list backup-check backup-retention

RESTIC_REPO := /mnt/cold/glasswing-backups/restic
RESTIC_PASSWORD := /etc/glasswing/backup/restic-password

backup:
	@sudo bash backup/scripts/backup.sh

backup-list:
	@sudo env \
	  RESTIC_REPOSITORY=$(RESTIC_REPO) \
	  RESTIC_PASSWORD_FILE=$(RESTIC_PASSWORD) \
	  restic snapshots --tag glasswing-full

backup-check:
	@sudo env \
	  RESTIC_REPOSITORY=$(RESTIC_REPO) \
	  RESTIC_PASSWORD_FILE=$(RESTIC_PASSWORD) \
	  restic check

backup-retention:
	@sudo env \
	  RESTIC_REPOSITORY=$(RESTIC_REPO) \
	  RESTIC_PASSWORD_FILE=$(RESTIC_PASSWORD) \
	  restic forget \
	    --tag glasswing-full \
	    --host pathfinder \
	    --keep-daily 7 \
	    --keep-weekly 4 \
	    --keep-monthly 6 \
	    --prune
