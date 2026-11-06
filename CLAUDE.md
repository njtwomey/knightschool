# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Knight School (`knightschool` everywhere): a browser-only chess opening trainer for beginners. No backend; everything
runs and persists in the browser. It is live at https://www.nialltwomey.com/knightschool/. v2 is a fresh build from the
plan in `docs/v2/`, and is what `main` now holds; v1 is kept under the tag `v1`. Do not copy v1 code: build each piece to
the plan.

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
- `packages/engine`: Stockfish in the browser. `packages/storage`: the learner's database (sqlite-wasm on OPFS).
- `apps/web`: React 19, Vite, Tailwind 4, shadcn (radix, Nova preset), lucide icons, react-chessboard, echarts for
  charts. `src/router` (a small History router: plain `<a href={to('/path')}>` links navigate without a reload),
  `src/app` (header and footer), `src/features` (learn, map, practice, search, credits), `src/components` (the reusable
  pieces), `src/pages`, `src/data` (config and data loading), `src/mocks` (the `/mocks` gallery).
- `content/config.yaml`: the site's config (how it teaches, judges, schedules and times things, for everyone). Library
  functions take config values as arguments; no thresholds or defaults are hard-coded. Learner choices are settings,
  not config (`docs/v2/config.md`).

## Content

This is how we add openings, from now on. Each fact below has one home, so change it there rather than repeating it.

The learner is a beginner (about 1000 to 1600) starting from zero, who must learn why each move is played and then meet
it in their own games. "The band" is those players, on the Lichess explorer.

**How we decide**

- Every choice passes three tests, in order: **sound** (the engine), **what the band plays** (the explorer's counts),
  **one plan** (the opening's own). When options compete, show the numbers: how often it is played, how it scores, what
  the engine says.
- **Breadth first.** A new opening is its main lines by popularity. A reply left out is a listed gap, not a failure;
  depth comes later, where it earns the work.
- **Old content is a starting point, never an authority.** v1, books and videos give ideas; the engine and the data decide.
- **Text is ours and honest.** Plain English, verified, never copied. Say what a move does and why, say when a line is only
  level or scores badly, and check every claim of advantage against the evaluation.

**How it fits together**

- Repertoire → Opening → Variation → Line → Step, plus Idea. Follow-ups (the opponent's mistake and its punishment) are
  derived, never written: from a line's `?` and `??` variations and from the engine and the band.
- An opening is for one side, with one `start`, so 1.c4 and 1.Nf3 are two openings.
- **Positions are what is shared.** A note belongs to a position and a move, across every opening, whichever side reads
  it; an opening gives one answer per position. So reuse a line rather than copy it, and let a line stop where it
  transposes.

**Where it is written down**

| What                                             | Where                                                          |
| ------------------------------------------------ | -------------------------------------------------------------- |
| What an opening must be, and how much to write   | `docs/v2/making-openings.md`                                   |
| How to do it, step by step, alone or with agents | the `add-content` skill (`.claude/skills/add-content`)         |
| File formats                                     | `docs/v2/schemas/content.md`, `docs/v2/schemas/annotations.md` |
| The numbers                                      | `content/config.yaml`                                          |
| The catalogue, and what is next                  | `content/tracks.yaml`, `docs/progress-v2/`                     |

**The files**

- `content/openings/<id>.yaml` (one opening for one side) and
  `content/lines/<first move>/<opening>/<variation>/<line>.pgn` (one line each, shared by openings; a line's id is its
  file name, so folders are only for finding things). With `ideas.yaml`, `tracks.yaml` and `config.yaml`. Committed data,
  as JSON Lines: `content/analysis/` (engine), `content/popularity/` (the explorer's counts at the band),
  `content/puzzles/`.
- The pipeline: `content:build`, `make popularity` (needs `LICHESS_TOKEN` in `.env`), `pnpm analyse` (long; run it in the
  background), `content:build` again, `content:check` (authors and engine must agree), `make doctor`, `make puzzles`,
  `make check`.
- One Stockfish at a time, one thread. `.content/` is reference only, never built.
- Nothing unfinished is committed: a commit on `v2` reaches the site with the next push.

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
  (`.github/workflows/deploy.yml`) runs on pushes to `main` only. Work is on `v2`, and `git push origin v2:main v2`
  ships it, without leaving the branch.
