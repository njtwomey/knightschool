# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Knight School (identifier `knightschool` everywhere): a browser-only chess opening trainer for beginners. No backend;
everything runs in the browser and persists in a local SQLite database. React 19, TypeScript strict, Vite 7, pnpm
workspace. MIT for our code; Stockfish (GPL-3.0) is a separate asset in `public/engine/`, fetched at runtime into a
Worker and spoken to over UCI messages. Never import or bundle it.

`docs/PLAN.md` is the architecture and build plan (eight phases). All eight are done and the UI has had a full
redesign (see Web app): scaffold, core domain and `content:build`, board and browse, storage, training, engine, quizzes
and explainers, then PWA/offline, explorer panel, stats, credits and LICENSE. PGN import was dropped on purpose (content
is authored). Still open: show the engine explainer's sentences in the UI, a manual (Anki-style) grading mode, and
real alternative piece sets (licence check first).

## Commands

Use `make` (run `make` alone to list targets). It uses a global pnpm if present, else `npx pnpm@<packageManager>`.

- `make dev`: Vite dev server (http://localhost:5173)
- `make check`: format check, lint, typecheck, tests. `make pre-push` adds the build; this is what CI runs.
- `make fix`: ESLint autofix plus Prettier. `make hooks` installs a git pre-push hook that runs `make pre-push`.
- Single test file: `pnpm exec vitest run packages/core/src/epd.test.ts`; by name: `pnpm exec vitest run -t "epdToFen"`.
- `pnpm content:build`: validate `content/` and write `apps/web/public/content/*.json` (gitignored). Needs no network;
  fetches Lichess opening names once into `.cache/`. Popularity is read from the committed `content/popularity/popularity.json`;
  the build never asks the network. `make popularity` (needs `LICHESS_TOKEN`) fills it in: only positions on lines that earn
  cards, resumable, one request at a time, a first full run takes hours. It holds counts per position and per move (the
  explorer band is blitz and rapid, 1000 to 1600) for the card threshold now and for weighting the computer's replies later.
  Secrets go in `.env` (git-ignored, mode 600; `.env.example` is the template). Only `pnpm popularity` loads it, through
  node's `--env-file-if-exists=.env` in `package.json`; never read, print or commit `.env`.
  `scripts/content.test.ts` builds the real content in `make test`.
- `pnpm db:generate`: after changing `packages/storage/src/schema.ts`, writes a numbered SQL migration with drizzle-kit and
  bundles it into `src/migrations.generated.ts` (check both in). A test fails if the schema and migrations disagree.

pnpm 12 blocks dependency install scripts by default. New packages that need one must be allowed in
`pnpm-workspace.yaml` under `allowBuilds` (esbuild already is).

## Python

There is no Python in this repo, and project scripts are TypeScript run with `tsx` (`scripts/`). If Python is ever needed
it must be managed with **uv and `pyproject.toml` only**: declare dependencies with `uv add` (never edit by hand or use
`pip install`), run with `uv run`, commit `pyproject.toml` and `uv.lock`, and pin the interpreter with `.python-version`.
No `requirements.txt`, no hand-made virtualenvs, no `pip`/`python -m venv`. Keep any one-off helper out of the repo
(use the session scratchpad) unless it is part of the build, so everything in the repo is traceable and reproducible.

## Architecture

Four workspace packages with a one-way dependency rule, enforced by `eslint-plugin-boundaries` in `eslint.config.js`
(check the policies there before changing imports; the failure message names the rule):

- `packages/core`: pure TypeScript. Imports no React, DOM, engine, storage or ui. Everything testable without a browser.
- `packages/engine`, `packages/storage`: may import core **types only** (`import type`), plus core's Zod schemas via
  `@knightschool/core/schema`; never each other or React. (A package-root value import is blocked by
  `no-restricted-imports`, a relative one by the boundaries policy.)
- `apps/web`: the only place engine, storage, core and React meet.

Data is split into content (authored, shipped, read-only) and user state (written by the app, exportable). Both are Zod
schemas in `packages/core`; Drizzle tables in `packages/storage` mirror the user-state schemas. Positions are keyed by
EPD (FEN without move counters), so transpositions share one node. See `docs/PLAN.md` "Data model".

### Content

Content is organised by who is to move and what the opponent has done (`docs/CURRICULUM.md` is the proposal, `content/README.md`
the format). A **course** is a folder under `content/white/` or `content/black/` (the folder decides the side) with
`course.yaml`, `lines/*.pgn`, `traps/*.pgn` and `quizzes.yaml`; its id is the folder name. `course.yaml` gives the trigger
position every line passes through, a tier (1 study first, 2 next, 3 alternatives), the opening it belongs to (an id from
`content/openings.yaml`, which also says who plays the opening: that makes a course "playing it" or "playing against it"), plans
and motifs (from `content/motifs.yaml`), and each line's `kind` (main, sideline, rare, gambit; plus `alternative`) and each
trap's (`for-us` springs it, `against-us` must be avoided). `content/curriculum.yaml` is the study order and prerequisites.
Gambits and traps are branches inside the course where they arise; there is no separate motifs section. Folders starting with `_`
(`_parked`, `_staging`) are never built.

Which positions earn review cards is `cardDefinitions` in `training.ts`: main and gambit lines always, sidelines unless the
explorer says too few games reach them, rare lines only with the "include rare lines" setting, alternatives never, `for-us`
traps never (they get quizzes), `against-us` traps yes (the avoiding move). The build merges every line of a course into one
EPD-keyed tree and rejects unknown tag values, files missing from `course.yaml`, a line that misses the trigger, and two
different repertoire moves for the same position (use `alternative: true` for a second answer). It warns where a White course
and a Black course disagree at a shared position. File names end up in learner history; do not rename them casually.

### Storage

`packages/storage` talks to SQLite through one `SqlExecutor` (execute, and an atomic `transaction` of statements).
In the browser that is a Worker running sqlite-wasm on opfs-sahpool (no COOP/COEP headers needed; one tab at a time,
enforced with a Web Lock that the newest tab _steals_: the older tab is told (`onLost`), terminates its worker and shows
a banner with "use it in this tab"; opening is retried briefly while the old tab lets go of the files). In tests it is an in-memory sqlite-wasm in Node
(`testing/memory.ts`), the same code path. Repositories (`Storage` interface) are Drizzle over the proxy driver; write
multi-statement changes by building statements with `toSQL()` and calling `exec.transaction`, never `db.batch`.
Import merges by `at` (logs keep existing rows) and writes nothing if any row fails validation.

Browser behaviour (OPFS, the tab lock) is not covered by `make test`. To check it, drive headless Chrome with
puppeteer-core against `pnpm dev` (the dev server may take 5174 or higher if 5173 is busy).

### Web app

Real path URLs (History API, `apps/web/src/router`): `/` Home, `/browse` (aliases `/search`, `/openings`; courses in study order and every line, in one grid), `/course/:id` (one course),
`/glossary`, `/play/:course/:line/:mode` (learn | practice; line `all` is the every-branch drill),
`/quiz` (alias `/review`), `/guess`, `/profile` (tabs Overview, `/profile/stats`, `/profile/settings`; `/stats` and `/settings` are aliases), `/credits`, `/lab`. Plain `<a href={to('/path')}>` links navigate without a reload
(`startRouter` intercepts them); old `#/route` links are upgraded. The **hash carries view state**, written with
`setHashState` as the page changes and read once when it opens, so a refresh or shared link restores it exactly:
course page `#v=<line>&m=<uci.uci…>`; browse `#q=…&role=…&side=…&tier=…&scope=…&bm=<moves>&bk=<kind>`; play
`#m=<moves played>`; lab `#pgn=…&fen=…&ply=…&side=…`. Hosts must serve `index.html` for unknown paths (`public/_redirects`,
and `404.html` is copied from `index.html` at build; dev and preview already fall back). Features in `apps/web/src/features/*`:

- `openings` (the Browse page): courses in study order and every line, as cards of one kind (lines have a board thumbnail).
  Filters: play it / against it (from `content/openings.yaml`), side, tier; a scope switch (all / courses / lines); search ranked
  by relevance with "why it matched" (`filterCourses`, `searchLines`, `relevance`); and **board search** in a modal:
  `search.json` maps every position to the lines through it, so transpositions match.
- `course`: one course's page: what it is for, its plans and motifs, the board with the engine strip (on by default, off in
  Settings), its lines and traps grouped by kind (main, gambits, sidelines, rare, alternatives, traps to avoid, traps to spring;
  click a row = learn, icon buttons show / learn / practise), and the same ground from the other side (courses in the same
  opening, and courses that reach the same positions: `relatedCourses`). The browse store keeps the displayed `line`.
- `glossary`: the motif vocabulary from `content/motifs.yaml` with the courses that use each.
- `play`: Learn (you play both sides, every move shown), Practise (the computer plays the other side) and Every branch.
  `speed` (`/speed`): a set-up window (a set of 3, 5 or 10 lines, or a timed run of 30 s, 1 min or 2 min; lines from the courses you
  are learning, everything, or one course) and then lines played from memory against the clock with the other side answering
  instantly. A set of lines scores the mean time per move, a timed run how many moves you make. Hints (piece, then move) are
  counted. The last set-up is kept in localStorage. Runs go to the `speed_attempts` table (no effect on the review
  schedule), shown on the Stats tab.
  `guess` ("Name That Opening", `/guess`): a position from the courses and you type what it is; `guessTargets` collects every
  opening and variation whose lines reach it (transpositions count) and `gradeGuess` gives full credit for a variation, half
  for just the opening; answers go to the `guess_attempts` table.
  `review`: spaced-repetition cards. `today`: dashboard. `settings`, `lab` (render any PGN at a ply, or a FEN).

**Nothing may ask the learner to acknowledge anything.** A right move flashes a tick and play carries on by itself (the
computer replies, the next card appears); a wrong move flashes a cross and snaps back; a miss reveals the move and waits
for it to be played. No "Next" buttons. Delays live in `DELAYS` / `REVIEW_DELAYS`.

All boards are `components/board/app-board.tsx` (colour theme, piece set, legal-move dots, hover and selection
highlights, tick/cross badge, hint pulse). Preferences are per device in localStorage (`board/prefs.ts`), default the
green profile. `StaticBoard` draws a FEN, EPD or PGN-at-a-ply (`resolvePosition` in core). Piece sets are the library's
drawings with different finishing; a real alternative set needs a licence check first.

### Branch practice and authoring

One learner side and one repertoire move per position per course; a second answer is an `alternative` line. `/play/<course>/all/branches` is the
every-branch drill: `nextBranchMove` walks the tree, the learner gets their repertoire move and the computer a weighted
random known reply. Positions after a mistake the learner's own side makes are never cards (`tree.ts`, "clean" positions).
`pnpm course:eval [course[/line] | --dir <course-folder>]` checks courses with Stockfish (native when installed; swings, how lines end); the `add-course` skill
(`.claude/skills/add-course`) is the authoring guide: use it for any content change.

### Quizzes

`<course>/quizzes.yaml` (see `content/README.md`): the position is a move list, answers are keyword groups,
and `examples` are checked against the matcher when the course is built, so a bad keyword fails the build. Quizzes are
review cards (`quiz:<opening>:<id>`, one in every five introduced), graded matched or missed, written with
`quizAttempts.record`. In Review a quiz is answered by typing, then moves on by itself (a "Skip ahead" button is optional).

### Training

Pure logic is in core: `autoGrade` and the `reduceAttempt` state machine (hint, show, two wrong tries), `scheduleReview`
(ts-fsrs; `Card` stores `scheduledDays` and `learningSteps` because FSRS needs them), `cardDefinitions` /
`planIntroductions` / `planSession`, and `recordAnswer` (new schedule plus the `Review` row, written together by
`reviews.record`). Which openings are trained and the new-cards-per-day limit live in the settings table
(`apps/web/src/data/training-settings.ts`), so they export with everything else. New cards are introduced when a session
starts, up to the daily limit; they are given due times one millisecond apart in the past so sorting by due date keeps
main-line-first order. Practice answers in `play` feed the same cards through `features/play/record.ts`; Learn only
introduces them. A review is card by card: the position before our move, the opponent's last move highlighted.

### Engine

Stockfish 19 lite single-threaded (the registry no longer serves 18) is copied from `node_modules/stockfish` into
`apps/web/public/engine` by `pnpm engine:copy` (run by `pnpm dev` and `pnpm build`; gitignored) and loaded as a Worker
from our own origin. It is a separate GPL program: only UCI text goes over `postMessage`, never import its code.
`packages/engine` is pure logic over a `UciTransport` (a Worker in the browser, `FakeStockfish` in tests): one search at
a time, a different position stops the running one (resolved `partial`), scores are normalised to White's point of view
before leaving the package. `evaluateCached` / `measureLineCached` read an `EvalStore` first, so a position is searched
once; the web app backs the store with the `eval_cache` table (`toRows` / `fromRows`). Only finished searches are stored.

**Native analysis.** `pnpm analyse [course ...|--all] [--depth 24] [--threads N] [--hash 1024] [--multipv 3] [--force]` runs the
native Stockfish (env `STOCKFISH`, else `stockfish` on PATH outside node_modules; `brew install stockfish`) over every
position of the courses and stores it in `content/analysis/analysis.json` (committed, one line per EPD, White's view,
resumable, Ctrl-C saves). `content:build` ships the positions some course reaches as `public/content/analysis.json`; the
engine strip shows them instantly as "depth 26, baked" and runs the browser engine only for positions that are missing
or shallower than the strip's depth ("depth 14, live"; `data/analysis.ts`). `course:eval` reads it before searching.

## Conventions

- **shadcn for all UI, always.** Build screens from components in `apps/web/src/components/ui` (add missing ones with
  `npx shadcn@latest add <name>` from `apps/web`). Do not hand-write buttons, inputs, dialogs and the like; ESLint
  rejects raw `<button>`, `<input>`, `<select>`, `<table>` etc. outside `components/ui`. Style with Tailwind tokens
  (`bg-background`, `text-muted-foreground`), never hard-coded colours, so light and dark both work.
- Theme: `ThemeProvider` toggles the `dark` class on `<html>` and stores the choice under `knightschool.theme`. The
  toggle and Settings sheet sit top right in the header. Settings that exist before the SQLite worker is up live in
  localStorage; wrap every localStorage access in try/catch.
- Vocabulary: `san`, `uci`, `epd`, `ply`, `side` (`'white' | 'black'`). Scores are centipawns from White's point of view.
- Ids are ULIDs generated client-side; every user-state row has an `at` timestamp; Review and QuizAttempt are append-only.
- Explanations come from providers behind one `Explainer` interface (author, motif, engine). No LLM calls.
- Lichess explorer calls go through storage's ExplorerCache: one request in flight, 30-day TTL, 60 s pause after a
  429, token from Settings or the build environment, never committed.
- Prettier: 120-character lines, single quotes. UI copy: plain English, no exclamation marks.
- Core changes ship with Vitest tests in the same commit (table-driven for motifs and the quiz matcher). Do not add a
  dependency outside the `docs/PLAN.md` library table without saying why in the commit message.
- Git: `origin` is `git@github-njtwomey:njtwomey/knightschool.git` (the `github-njtwomey` host alias in `~/.ssh/config`
  selects the njtwomey key). Do not push without being asked.

Versions in use differ from the plan where noted in `docs/PLAN.md` (Vite 7, TypeScript 5.9 because typescript-eslint
does not support TypeScript 7 yet, ESLint 9).
