# Thin wrapper over the pnpm scripts in package.json. `make` alone lists the targets.
# Uses a global pnpm if there is one, otherwise runs the pinned version through npx.

PNPM_VERSION := $(shell node -p "require('./package.json').packageManager.split('@')[1]")
PNPM ?= $(shell command -v pnpm >/dev/null 2>&1 && echo pnpm || echo npx -y pnpm@$(PNPM_VERSION))

.DEFAULT_GOAL := help
.PHONY: help install dev build preview test test-watch lint fix format format-check typecheck check pre-push hooks clean

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-13s %s\n", $$1, $$2}'

node_modules: package.json pnpm-lock.yaml $(wildcard apps/*/package.json packages/*/package.json)
	$(PNPM) install
	@touch node_modules

install: node_modules ## Install dependencies

dev: node_modules ## Run the site locally with hot reload (http://localhost:5173)
	$(PNPM) dev

build: node_modules ## Typecheck and build the site into apps/web/dist
	$(PNPM) build

preview: build ## Serve the production build locally
	$(PNPM) preview

test: node_modules ## Run all Vitest tests once
	$(PNPM) test

test-watch: node_modules ## Run Vitest in watch mode
	$(PNPM) test:watch

lint: node_modules ## ESLint, including the package boundary rules
	$(PNPM) lint

fix: node_modules ## Auto-fix lint issues and format everything
	$(PNPM) lint:fix
	$(PNPM) format

format: node_modules ## Format with Prettier
	$(PNPM) format

format-check: node_modules ## Fail if anything is not Prettier-formatted
	$(PNPM) format:check

typecheck: node_modules ## tsc --noEmit in every package
	$(PNPM) typecheck

check: format-check lint typecheck test ## Everything CI checks except the build

pre-push: check build ## What to run before pushing; same as CI

hooks: ## Install a git pre-push hook that runs `make pre-push`
	@printf '#!/bin/sh\nexec make pre-push\n' > .git/hooks/pre-push
	@chmod +x .git/hooks/pre-push
	@echo "Installed .git/hooks/pre-push"

clean: ## Remove build output and node_modules
	rm -rf apps/web/dist coverage node_modules apps/*/node_modules packages/*/node_modules
