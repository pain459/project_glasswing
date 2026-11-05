SHELL := /bin/bash
.DEFAULT_GOAL := help

STACK ?= infisical
STACK_DIR := stacks/$(STACK)
COMPOSE_FILE := $(STACK_DIR)/compose.yaml
COMPOSE_OVERRIDE := $(STACK_DIR)/compose.override.yaml
COMPOSE_FILES := -f "$(COMPOSE_FILE)" $(if $(wildcard $(COMPOSE_OVERRIDE)),-f "$(COMPOSE_OVERRIDE)")
SECRETS_FILE := $(STACK_DIR)/secrets.list
PRE_UP_HOOK := $(STACK_DIR)/pre-up.sh
POST_UP_HOOK := $(STACK_DIR)/post-up.sh

# Default secret location: /<stack>. The collector reuses /openobserve.
INFISICAL_PATH ?= $(if $(filter otel-collector vector,$(STACK)),/openobserve,$(if $(filter open-notebook-mcp,$(STACK)),/open-notebook,$(if $(filter steel-mcp,$(STACK)),/steel,$(if $(filter searxng,$(STACK)),/searxng,/$(STACK)))))

# One shared bridge for every published service. An explicit subnet does not
# draw from Docker's address pool, so the platform stops creating one network
# per stack (which exhausted the stock pool at ~16 networks).
GLASSWING_NETWORK ?= glasswing
GLASSWING_NETWORK_SUBNET ?= 10.89.0.0/24

# Compose files read ${GLASSWING_NETWORK:-glasswing}, so one variable renames the
# shared network everywhere.
export GLASSWING_NETWORK

# How many stacks `make restart-all` deploys at once. Infisical and Ollama always
# start first (secrets and the inference backend); the rest are independent.
JOBS ?= 4

# Single source of truth for the LAN address in every port binding. Resolution
# order: `make GLASSWING_HOST_IP=...`, the shell environment, then the host-local
# bootstrap file Infisical reads for itself (gitignored; HOST_IP is the old name).
GLASSWING_HOST_IP ?= $(shell sed -n 's/^GLASSWING_HOST_IP=//p;s/^HOST_IP=//p' stacks/infisical/.env 2>/dev/null | head -n1 | tr -d '"')
export GLASSWING_HOST_IP

# Needed by the OTEL collector to access /var/run/docker.sock as non-root.
export DOCKER_GID := $(shell stat -c '%g' /var/run/docker.sock 2>/dev/null)

.PHONY: help up down restart rebuild update logs ps check infisical homepage core status \
        secrets-check secrets-injection-check secrets-plan network docker-pool doctor access access-check \
        certificates certificates-check mcp-preflight \
        release-status release-bump release-apply release-rollback release-diff release-history release-sync \
        release-build release-bundle release-deploy release-list release-cleanup \


help:
	@echo "Glasswing Stack Manager"
	@echo ""
	@echo "make core                         Start base stacks"
	@echo "make infisical                    Start Infisical"
	@echo "make homepage                     Start Homepage"
	@echo "make up STACK=name                Start a stack, run its hooks, wait for health"
	@echo "make down STACK=name              Stop/remove stack containers"
	@echo "make rebuild STACK=name           Rebuild image and redeploy stack"
	@echo "make restart STACK=name           Restart stack containers"
	@echo "make restart-all [JOBS=n]         Redeploy every stack, n at a time (default 4)"
	@echo "make logs STACK=name              Follow stack logs"
	@echo "make ps STACK=name                Show stack status"
	@echo "make check STACK=name             Validate Compose configuration and show status"
	@echo "make status                       Show all Docker containers"
	@echo "make ollama-model                 Rebuild the coding model from its Modelfile"
	@echo "make ai-preflight                 Validate the Ollama/OpenCode inference baseline"
	@echo "make mcp-preflight                Validate all host-only MCP endpoints"
	@echo "make secrets-check                Verify Infisical integration"
	@echo "make secrets-plan                 List keys still to supply / emit templates"
	@echo "make secrets-injection-check      Verify test-secret injection"
	@echo "make doctor                       Preflight Docker pool, ports, orphans, restart loops"
	@echo "make network                      Create the shared 'glasswing' bridge network"
	@echo "make docker-pool                  Widen the Docker address pool (sudo, restarts Docker)"
	@echo "make access                       Regenerate ACCESS.md from compose port bindings"
	@echo "make access-check                 Fail if ACCESS.md is out of date"
	@echo "make certificates                 Create the local CA, Infisical and Portainer certs"
	@echo "make certificates-check           Verify the TLS material covers the host IP and is current"
	@echo ""
	@echo "make update STACK=name            Pull latest pinned images and redeploy stack"
	@echo ""
	@echo "Release Management (stacks/VERSIONS.yaml):"
	@echo "make release-status               Show version table for all stacks"
	@echo "make release-bump STACK=x TAG=y   Bump one stack's version"
	@echo "make release-apply                Apply manifest versions to compose files"
	@echo "make release-rollback             Revert the last release commit"
	@echo "make release-diff                 Show drift between manifest and compose files"
	@echo "make release-history              Show recent release-related commits"
	@echo "make release-sync                 Sync manifest from current compose files"
	@echo ""
	@echo "Release Pipeline (build → bundle → deploy):"
	@echo "make release-build                Build all images, push to local registry"
	@echo "make release-bundle VERSION=x     Produce offline deployable bundle"
	@echo "make release-deploy VERSION=x     Deploy a release bundle (offline)"
	@echo "make release-list                 List available release bundles"
	@echo "make release-cleanup KEEP=n       Remove old releases (keep last n, default 5)"
	@echo ""
	@echo "Optional: INFISICAL_PATH=/custom/path (default /<stack>)"
	@echo "Optional: stacks/<name>/pre-up.sh and post-up.sh run automatically with make up"

# Common runner keeps secrets available for every docker compose command.
# Usage inside recipes: $(call run_compose,up -d --wait --wait-timeout 180)
define run_compose
set -eu; \
 test -f "$(COMPOSE_FILE)" || { echo "[FAIL] Unknown stack: $(STACK)"; exit 1; }; \
 docker network inspect $(GLASSWING_NETWORK) >/dev/null 2>&1 || \
   docker network create --driver bridge --subnet $(GLASSWING_NETWORK_SUBNET) $(GLASSWING_NETWORK) >/dev/null 2>&1 || \
   docker network inspect $(GLASSWING_NETWORK) >/dev/null 2>&1; \
 if [ -s "$(SECRETS_FILE)" ]; then \
   echo "[INFO] Infisical path: $(INFISICAL_PATH)"; \
   ./scripts/with-infisical.sh "$(INFISICAL_PATH)" "$(SECRETS_FILE)" -- \
     docker compose $(COMPOSE_FILES) $(1); \
 else \
   docker compose $(COMPOSE_FILES) $(1); \
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
	@$(call run_compose,pull --ignore-buildable --quiet 2>/dev/null || true)
	@$(call run_compose,up -d --build --wait --wait-timeout 180)
	@if [ -x "$(POST_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(POST_UP_HOOK)"; \
	  "$(POST_UP_HOOK)"; \
	fi
	@echo "[PASS] Stack $(STACK) started"

down:
	@$(call run_compose,down --rmi local)

rebuild:
	@if [ -x "$(PRE_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(PRE_UP_HOOK)"; \
	  "$(PRE_UP_HOOK)"; \
	fi
	@$(call run_compose,down --rmi local)
	@$(call run_compose,build --no-cache)
	@$(call run_compose,up -d --wait --wait-timeout 180)
	@if [ -x "$(POST_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(POST_UP_HOOK)"; \
	  "$(POST_UP_HOOK)"; \
	fi
	@echo "[PASS] Stack $(STACK) rebuilt"

restart:
	@$(call run_compose,restart)
	@$(call run_compose,up -d --wait --wait-timeout 180)
	@if [ -x "$(POST_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(POST_UP_HOOK)"; \
	  "$(POST_UP_HOOK)"; \
	fi
	@echo "[PASS] Stack $(STACK) restarted"

# Pull new images (using pinned versions from compose files) and redeploy.
update:
	@if [ -x "$(PRE_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(PRE_UP_HOOK)"; \
	  "$(PRE_UP_HOOK)"; \
	fi
	@$(call run_compose,pull --ignore-buildable --quiet 2>/dev/null || true)
	@$(call run_compose,up -d --wait --wait-timeout 180)
	@if [ -x "$(POST_UP_HOOK)" ]; then \
	  echo "[INFO] Running $(POST_UP_HOOK)"; \
	  "$(POST_UP_HOOK)"; \
	fi
	@echo "[PASS] Stack $(STACK) updated"

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

network:
	@set -eu; \
	if docker network inspect $(GLASSWING_NETWORK) >/dev/null 2>&1; then \
	  subnet=$$(docker network inspect $(GLASSWING_NETWORK) --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'); \
	  echo "[PASS] Network $(GLASSWING_NETWORK) exists ($${subnet:-no fixed subnet})"; \
	else \
	  docker network create --driver bridge --subnet $(GLASSWING_NETWORK_SUBNET) $(GLASSWING_NETWORK) >/dev/null 2>&1 \
	    || docker network inspect $(GLASSWING_NETWORK) >/dev/null; \
	  echo "[PASS] Network $(GLASSWING_NETWORK) is ready with subnet $(GLASSWING_NETWORK_SUBNET)"; \
	fi

docker-pool:
	@./scripts/docker-daemon-config.sh --apply

doctor:
	@./scripts/doctor.sh

access:
	@./scripts/access-map.sh

access-check:
	@./scripts/access-map.sh --check

secrets-plan:
	@./scripts/secrets-plan.sh

certificates:
	@./scripts/04-certificates.sh

certificates-check:
	@./scripts/04-certificates.sh --check

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
	@set -u; \
	echo "========================================"; \
	echo " Glasswing - Platform Redeployment"; \
	echo "========================================"; \
	echo ""; \
	$(MAKE) --no-print-directory network; \
	echo "[INFO] Starting Infisical (secret source)"; \
	$(MAKE) --no-print-directory up STACK=infisical || exit 1; \
	echo "[INFO] Starting Ollama (inference backend)"; \
	$(MAKE) --no-print-directory up STACK=ollama || exit 1; \
	logdir=$$(mktemp -d); \
	echo ""; \
	echo "[INFO] Reconciling $(words $(filter-out infisical ollama,$(STACKS))) stacks, $(JOBS) at a time"; \
	running=0; \
	for stack in $(filter-out infisical ollama,$(STACKS)); do \
	  echo "[INFO] Deploying $$stack"; \
	  ( \
	    if $(MAKE) --no-print-directory up STACK=$$stack >"$$logdir/$$stack.log" 2>&1; then \
	      echo "[PASS] $$stack"; \
	    else \
	      echo "[FAIL] $$stack"; \
	      sed 's/^/    /' "$$logdir/$$stack.log"; \
	      : > "$$logdir/failed"; \
	    fi \
	  ) & \
	  running=$$((running + 1)); \
	  if [ "$$running" -ge "$(JOBS)" ]; then wait; running=0; fi; \
	done; \
	wait; \
	echo ""; \
	if [ -e "$$logdir/failed" ]; then \
	  echo "[FAIL] Some stacks did not reconcile; rerun: make up STACK=<name>"; \
	  rm -rf "$$logdir"; \
	  exit 1; \
	fi; \
	rm -rf "$$logdir"; \
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

mcp-preflight:
	@status=0; \
	 python3 scripts/mcp-preflight.py --name open-notebook http://127.0.0.1:8001/mcp || status=1; \
	 python3 scripts/mcp-preflight.py --name steel http://127.0.0.1:8002/mcp || status=1; \
	 python3 scripts/mcp-preflight.py --name serena http://127.0.0.1:9121/mcp || status=1; \
	 python3 scripts/mcp-preflight.py --name searxng http://127.0.0.1:8005/mcp || status=1; \
	 exit $$status


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


# --------------------------------------------------
# Release Management — stacks/VERSIONS.yaml
# --------------------------------------------------

RELEASE_TAG ?=

release-status:
	@./scripts/release-manifest.sh status

release-status-updates:
	@./scripts/release-manifest.sh status --updates

release-bump:
	@if [ -z "$(RELEASE_TAG)" ]; then \
	  echo "Usage: make release-bump STACK=name TAG=version"; \
	  echo "Example: make release-bump STACK=ollama TAG=0.40.12"; \
	  exit 1; \
	fi
	@./scripts/release-manifest.sh bump $(STACK) $(RELEASE_TAG)

release-apply:
	@./scripts/release-manifest.sh apply

release-rollback:
	@./scripts/release-manifest.sh rollback

release-diff:
	@./scripts/release-manifest.sh diff

release-history:
	@./scripts/release-manifest.sh history

release-sync:
	@./scripts/release-manifest.sh sync


# --------------------------------------------------
# Release Pipeline — build → bundle → deploy
# --------------------------------------------------

RELEASE_VERSION ?=

release-build:
	@./scripts/release-build.sh


release-bundle:
	@if [ -z "$(RELEASE_VERSION)" ]; then \
	  echo "Usage: make release-bundle RELEASE_VERSION=<version>"; \
	  echo "Example: make release-bundle RELEASE_VERSION=9c021aa-20261105-1"; \
	  exit 1; \
	fi
	@./scripts/release-bundle.sh $(RELEASE_VERSION)


release-deploy:
	@if [ -z "$(RELEASE_VERSION)" ]; then \
	  echo "Usage: make release-deploy RELEASE_VERSION=<version>"; \
	  echo "Example: make release-deploy RELEASE_VERSION=9c021aa-20261105-1"; \
	  exit 1; \
	fi
	@set -eu; \
	release_dir="releases/$(RELEASE_VERSION)"; \
	if [ ! -f "$$release_dir/manifest.yaml" ]; then \
	  echo "[FAIL] Release not found: $$release_dir"; \
	  echo "Available releases:"; \
	  ls -1 releases/ 2>/dev/null | grep -v '^\.' || echo "  (none)"; \
	  exit 1; \
	fi; \
	echo "========================================"; \
	echo " Glasswing - Release Deploy"; \
	echo " Version: $(RELEASE_VERSION)"; \
	echo "========================================"; \
	echo ""; \
	./scripts/release-deploy.sh


release-list:
	@./scripts/release-manifest.sh release-list


release-cleanup:
	@set -eu; \
	keep=$(if $(RELEASE_VERSION),$(RELEASE_VERSION),5); \
	echo "[INFO] Keeping last $$keep releases, removing older ones"; \
	cd releases && \
	  ls -1d */ 2>/dev/null | sed 's|/||' | sort -r | tail -n +$$(($$keep + 1)) | \
	  while read -r old; do \
	    if [ -d "$$old" ]; then \
	      echo "[INFO] Removing release $$old"; \
	      rm -rf "$$old"; \
	    fi; \
	  done; \
	echo "[PASS] Cleanup complete"
