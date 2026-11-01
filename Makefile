# Knight School. Run `make` to list the targets.
# A version-manager shim for pnpm can be on the PATH without working, so test that it runs before using it.
PNPM_VERSION := 12.11.2
PNPM ?= $(shell pnpm --version >/dev/null 2>&1 && echo pnpm || echo npx -y pnpm@$(PNPM_VERSION))

.DEFAULT_GOAL := help
.PHONY: help install dev build engine preview check lint typecheck test format fix pre-push hooks ux

help: ## List the targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-15s %s\n", $$1, $$2}'

install: ## Install dependencies
	$(PNPM) install

dev: ## Run the dev server (copies Stockfish first)
	$(PNPM) dev

build: ## Build the site (copies Stockfish first)
	$(PNPM) build

engine: ## Copy Stockfish into apps/web/public/engine
	$(PNPM) engine:copy

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

# Puzzle jobs (docs/v2/puzzles.md), on the maintainer's machine, never by the build. Options go in ARGS, as
# make puzzles-lookup ARGS='--moves "e4 e5 Nf3 Nc6 Bc4" --theme fork'.
.PHONY: puzzles-index puzzles-expand puzzles-select puzzles-lookup
ARGS ?=

puzzles-index: ## Index the Lichess puzzle file and name its opening tags (minutes)
	$(PNPM) puzzles:index $(ARGS)
	$(PNPM) puzzles:names

puzzles-expand: ## Fetch puzzles' games from Lichess (resumable; hours)
	$(PNPM) puzzles:expand $(ARGS)

puzzles-select: ## Choose the Italian's puzzles into content/puzzles/
	$(PNPM) puzzles:select $(ARGS)

puzzles-lookup: ## Ask the puzzle index by hand (ARGS='--moves "e4 e5 Nf3"')
	$(PNPM) puzzles:lookup $(ARGS)

# The shadcn CLI runs `pnpm add` itself, so it is given a pnpm that works even where a version-manager shim does not.
SHADCN := shadcn@4.22.0
SHIM := $(CURDIR)/.cache/bin

ux: ## Install every shadcn component with the CLI, as generated
	mkdir -p $(SHIM) && printf '#!/bin/sh\nexec npx -y pnpm@$(PNPM_VERSION) "$$@"\n' > $(SHIM)/pnpm && chmod +x $(SHIM)/pnpm
	cd apps/web && PATH="$(SHIM):$$PATH" npx -y $(SHADCN) add --all --overwrite --yes
