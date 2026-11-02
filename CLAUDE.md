# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Knight School (`knightschool` everywhere): a browser-only chess opening trainer for beginners. No backend; everything
runs and persists in the browser. This branch (`v2`) is a fresh build from the plan in `docs/v2/`; v1 lives on `main`
(tag `v1`) and stays live until v2 replaces it. Do not copy v1 code: build each piece to the plan.

`docs/v2/README.md` is the plan's index: the model (Repertoire → Opening → Variation → Line → Step, plus Idea),
experience, board, capabilities, config vs settings, schemas, and one file per component, page, hook, store and library
module. Read the relevant spec before building a piece, and keep it in step when the build differs.

## Commands

`make` lists the targets. It uses a working global pnpm if there is one, else `npx pnpm@<version>`.

- `make dev`: the dev server (http://localhost:5173, or the next free port).
- `make check`: Prettier, ESLint, TypeScript, Vitest. `make pre-push` adds the build; the git pre-push hook runs it
  (`make hooks` installs the hook).
- `make ux`: installs every shadcn component with the CLI (`shadcn add --all --overwrite`). Generated files in
  `apps/web/src/components/ui` are never edited by hand; if one needs changing, change how it is used instead.
- One test file: `pnpm exec vitest run packages/core/src/eval/score.test.ts`.

pnpm refuses any package version published less than 14 days ago (`minimumReleaseAge` in `pnpm-workspace.yaml`). Pin
exact versions.

## Layout

- `packages/core`: pure TypeScript (chess, eval, judge, annotations, config schema). No React, DOM or node imports
  (ESLint enforces it; tests and `src/testing/` may use node). Core changes ship with Vitest tests.
- `apps/web`: React 19, Vite, Tailwind 4, shadcn (radix, Nova preset), lucide icons, react-chessboard, echarts for
  charts. `src/router` (a small History router: plain `<a href={to('/path')}>` links navigate without a reload),
  `src/app` (header), `src/pages`, `src/data` (config and data loading), `src/mocks` (the `/mocks` gallery).
- `content/config.yaml`: the site's config (how it teaches, judges, schedules and times things, for everyone). Library
  functions take config values as arguments; no thresholds or defaults are hard-coded. Learner choices are settings,
  not config (`docs/v2/config.md`).

## Content

- `content/openings/<id>.yaml` (one opening for one side) and `content/lines/<first move>/<line>.pgn` (one line each,
  shared by openings), with `ideas.yaml`, `tracks.yaml` and `config.yaml`. Committed data, as JSON Lines:
  `content/analysis/` (engine), `content/popularity/` (the explorer's counts at the band), `content/puzzles/`.
- Adding or migrating content (from v1's `.content/` snapshot, a transcript, a book, or the map's gaps): follow the
  `add-content` skill (`.claude/skills/add-content`). The pipeline: `content:build`, `make popularity` (needs
  `LICHESS_TOKEN` in `.env`), `pnpm analyse` (long; run in the background), `content:check` (authors and engine must
  agree), `make puzzles`.
- One Stockfish at a time, one thread. `.content/` is reference only, never built.

## Conventions

- shadcn for every control; ESLint rejects raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<table>`, `<dialog>`
  outside `components/ui`. Style with Tailwind tokens (`bg-background`, `text-muted-foreground`), never hard-coded
  colours, so light and dark both work.
- UI copy: plain English, British spelling, no exclamation marks. Move numbers: "1.e4", "1...e5" for one move; "1. e4
  e5 2. Nf3" for a run (`numberedMove`, `numberedLine` in core).
- Vocabulary: `san`, `uci`, `epd`, `ply`, `side`; scores are centipawns from White's point of view. Chess.com in
  identifiers is `chessdotcom`.
- Prettier: 120 characters, single quotes.
- Secrets go in `.env` (git-ignored, mode 600); never read, print or commit it.
- No temporary files in the repo; use the session scratchpad.
- Git: `origin` is `git@github-njtwomey:njtwomey/knightschool.git`. Do not push without being asked. Deploy
  (`.github/workflows/deploy.yml`) runs on pushes to `main` only.
