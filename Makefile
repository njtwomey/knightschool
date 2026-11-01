# Knight School. Run `make` to list the targets.
# A version-manager shim for pnpm can be on the PATH without working, so test that it runs before using it.
PNPM_VERSION := 12.11.2
PNPM ?= $(shell pnpm --version >/dev/null 2>&1 && echo pnpm || echo npx -y pnpm@$(PNPM_VERSION))

.DEFAULT_GOAL := help
.PHONY: help install dev build preview check lint typecheck test format fix pre-push hooks ux

help: ## List the targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## Install dependencies
	$(PNPM) install

dev: ## Run the dev server
	$(PNPM) dev

build: ## Build the site
	$(PNPM) build

preview: ## Serve the built site
	$(PNPM) preview

lint: ## ESLint
	$(PNPM) lint

typecheck: ## TypeScript, every package
	$(PNPM) typecheck

test: ## Vitest, every package
	$(PNPM) test

format: ## Prettier check
	$(PNPM) format:check

check: format lint typecheck test ## Everything checked before a push

fix: ## ESLint autofix and Prettier
	$(PNPM) exec eslint . --fix
	$(PNPM) format

pre-push: check build ## What must pass before every push

hooks: ## Install the git pre-push hook
	printf '#!/bin/sh\nmake pre-push\n' > .git/hooks/pre-push && chmod +x .git/hooks/pre-push

# The shadcn CLI runs `pnpm add` itself, so it is given a pnpm that works even where a version-manager shim does not.
SHADCN := shadcn@4.22.0
SHIM := $(CURDIR)/.cache/bin

ux: ## Install every shadcn component with the CLI, as generated
	mkdir -p $(SHIM) && printf '#!/bin/sh\nexec npx -y pnpm@$(PNPM_VERSION) "$$@"\n' > $(SHIM)/pnpm && chmod +x $(SHIM)/pnpm
	cd apps/web && PATH="$(SHIM):$$PATH" npx -y $(SHADCN) add --all --overwrite --yes
