
SHELL := /bin/bash
.DEFAULT_GOAL := help

STACK ?= infisical
COMPOSE := docker compose -f stacks/$(STACK)/compose.yaml

.PHONY: help up down restart logs ps check \
        infisical homepage core status

.PHONY: secrets-check

secrets-check:
	@bash scripts/04-infisical-check.sh

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
	@$(COMPOSE) config --quiet
	@$(COMPOSE) up -d --wait --wait-timeout 180
	@$(COMPOSE) ps

down:
	@$(COMPOSE) down

restart:
	@$(COMPOSE) restart

logs:
	@$(COMPOSE) logs --tail=100 -f

ps:
	@$(COMPOSE) ps

check:
	@$(COMPOSE) config --quiet
	@$(COMPOSE) ps
	@echo "[PASS] Compose configuration valid"

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
