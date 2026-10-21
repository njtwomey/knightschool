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
- `make check`: format check, lint, typecheck, tests. `make pre-push` adds the build; this is what CI runs. `make gaps`:
  popular replies no course answers, per side, ranked by explorer games (`scripts/gaps.ts`). `make doctor`:
  overlaps in `content/` worth tidying (a report, never a gate).
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

## Docs, authoring and deploy

- `README.md` is the human-facing overview and "how to add things"; keep it in step with this file when the workflow changes.
  Adding a course goes through the `add-course` skill (`.claude/skills/add-course`): use it for any content change.
- Deploy: `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main` (the build job can pass while
  the Pages step is slow; re-running a deploy for the same commit can collide with the stuck one, so push a new commit instead).

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

Content is **one tree of theory plus courses that select lines from it** (`content/README.md` is the format, `docs/TREE.md`
the design and what is still to do; `docs/CURRICULUM.md` is the original coverage proposal). `content/tree/<first move>/<family>/*.pgn`
are **chapters**: one line each, for both sides, written from where it branches off another chapter
(`[Start "evans-gambit 5.c3"]`: that chapter, after that move; earlier moves added when the move is ambiguous). The file
name is the line id (unique across the tree; it ends up in learner history, so do not rename casually). `[For]` is the
side the line is written for, which `[Kind]` (main, sideline, rare, gambit; `for-us` / `against-us` traps) and `[Risk]`
are relative to; `[Opponent]` is the opponent's move that reaches it. A move has one comment across the whole tree, written
neutrally. `resolveTree` (core `theory-tree.ts`) reads the chapters, parents first; `treeGraph` gives the chapter and move
graph (built into `public/content/tree.json` for drawing; positions there are `positionId(epd)`, a short hash).

A **course** is `content/courses/<id>/{course.yaml,quizzes.yaml}`, id = folder name: side, trigger, tier (1 study first,
2 next, 3 alternatives), the opening it belongs to (an id from `content/openings.yaml`, which says who plays it: "playing it"
or "playing against it"), a required introduction (`about`: `idea`, `risks`, `suits`, optional `origin`), plans, motifs (from
`content/motifs.yaml`), and `lines:` (line ids in teaching order, each optionally with `alternative`, `kind`, `opponent`,
`section`). Any course lists any line of either side; a trap written for the other side flips. `projectCourse` rebuilds each
listed line from the start and merges them with `buildOpening` into the course's EPD-keyed tree: the shape the app reads,
unchanged from before the tree. `content/curriculum.yaml` is the study order. `make doctor` reports overlaps (moves written
twice, unlisted chapters, shared lines); it never fails.

Which positions earn review cards is `cardDefinitions` in `training.ts`: main and gambit lines always, sidelines unless the
explorer says too few games reach them, rare lines only with the "include rare lines" setting, alternatives never, `for-us`
traps never (they get quizzes), `against-us` traps yes (the avoiding move). The build merges every line of a course into one
EPD-keyed tree and rejects unknown tag values, unknown line ids, a line that misses the trigger, two comments on one move,
a bad `[Start]`, and two different repertoire moves for the same position within a course (use `alternative: true` for a
second answer; the tree itself may hold several). It warns where a White course and a Black course disagree at a shared
position.

### Storage

`packages/storage` talks to SQLite through one `SqlExecutor` (execute, and an atomic `transaction` of statements).
In the browser that is a Worker running sqlite-wasm on opfs-sahpool (no COOP/COEP headers needed; one tab at a time,
enforced with a Web Lock that the newest tab _steals_: the older tab is told (`onLost`), terminates its worker and shows
a banner with "use it in this tab"; opening is retried briefly while the old tab lets go of the files). In tests it is an in-memory sqlite-wasm in Node
(`testing/memory.ts`), the same code path. Repositories (`Storage` interface) are Drizzle over the proxy driver; write
multi-statement changes by building statements with `toSQL()` and calling `exec.transaction`, never `db.batch`.
Import merges by `at` (logs keep existing rows) and writes nothing if any row fails validation.

**Authored content (schema 5, `authoring` repository).** `authored_chapters` (PGN text in the content/tree format),
`authored_courses` (course.yaml as JSON text, validated only when projected, so an old row never blocks) and
`authored_history` (append-only: each row is an item as it was before a change; rows of one editor action share a
`group`). `apply` saves an action with its history in one transaction; deletes are soft (`deletedAt`, the text is kept);
`undo` takes back the newest action not yet undone and records itself as a group with `undoOf`, so nothing is lost;
`changesSince` counts edits for the reminder to export (`data/backup.ts`, `exportReminder` in core: 20 edits or 7 days,
counted from `lastExportAt` in settings, which both exports now write). The export carries the three tables; exports
from before schema 5 import with none.

Browser behaviour (OPFS, the tab lock) is not covered by `make test`. To check it, drive headless Chrome with
puppeteer-core against `pnpm dev` (the dev server may take 5174 or higher if 5173 is busy).

### Web app

Real path URLs (History API, `apps/web/src/router`): `/` Home, `/courses` (every course in one sortable table, filtered by side), `/search` (aliases `/browse`, `/openings`; the page called Search: courses in study order and every line, in one grid), `/course/:id` (one course; `/course/:id/path` its study path, `/course/:id/tree` its tree),
`/glossary`, `/tree` (every line as one tree), `/play/:course/:line/:tab` (about | learn | drill | quiz | tree; line `all` is the every-branch drill; learn and drill
take `/<n>` for unit n of that line on the path, or `/<n>/<first>-<last>` for some of its moves),
`/quiz` (alias `/review`), `/guess`, `/speed`, `/profile` (tabs Overview, `/profile/stats`, `/profile/settings`; `/stats` and `/settings` are aliases), `/credits`, `/lab`. Plain `<a href={to('/path')}>` links navigate without a reload
(`startRouter` intercepts them); old `#/route` links are upgraded. The **hash carries view state**, written with
`setHashState` as the page changes and read once when it opens, so a refresh or shared link restores it exactly:
course page `#v=<line>&m=<uci.uci…>`; browse `#q=…&role=…&side=…&tier=…&scope=…&bm=<moves>&bk=<kind>`; play
`#m=<moves played>` (and `&p=<part>` in a unit with several branches); lab `#pgn=…&fen=…&ply=…&side=…`. Hosts must serve `index.html` for unknown paths (`public/_redirects`,
and `404.html` is copied from `index.html` at build; dev and preview already fall back). Features in `apps/web/src/features/*`:

The menu is in the order of use: Courses, Search, Tree | Quiz, Speed, Guess | Glossary (`App.tsx`).

- `courses` (`/courses`): every course in one table, filtered by side (White / Black / Both), every column sortable, a
  row opens the course.
- `openings` (the Search page, once called Browse): courses in study order and every line, as cards of one kind (lines
  have a board thumbnail). Filters: play it / against it (from `content/openings.yaml`), side, tier; a scope switch (all /
  courses / lines); a forgiving search (words run together, small slips: `editDistance` in `catalog.ts`) ranked by
  relevance with "why it matched"; and **board search** in a modal: `search.json` maps every position to the lines
  through it, so transpositions match.
- `course`: one course's page, Overview, Path and Tree tabs at the end of the breadcrumbs (`features/course/tabs.ts`). The
  introduction (`CourseIntro`: summary, then idea, risks and who it suits in three columns), plans and motifs, line tags
  explained on hover and in a key (`TagLegend`, wording in `features/openings/explanations.ts`), the board with the
  engine strip, its lines grouped by kind (a row opens the line's About; icons show / learn / drill), and the same ground
  from the other side (`relatedCourses`). ECO codes are links to the opening's Lichess page (`EcoLink`, address from
  `lichess` in index.json).
- **Authored courses** are ordinary courses: `data/content.ts` merges them into `loadIndex`, `loadOpening` and
  `loadTreeGraph` through `data/authored.ts`, which reads the live authored rows and runs `buildAuthored` (core) over
  them and the shipped chapters as written (`public/content/chapters.json`, from the build, fetched only when something
  is authored). A chapter or course that does not fit (an id taken, a `[Start]` naming nothing, a comment clashing
  with a shipped one: one comment per move holds here too) is left out with a problem, never a crash. The browse store's
  `reload` refreshes the lists after an edit. Board search (`search.json`) does not include them.
- `path` (a course's Path tab, `features/path`): the course cut into units (`courseUnits` in core, see Training) in
  study order, each with its state, its moves (yours in bold), what unlocks it if locked, its extras (traps and quizzes,
  never needed to pass) and Learn / Drill buttons for just that unit. `data/course-path.ts` loads it: units cut with the
  learner's card settings, state from `cards.byOpening` and `reviews.byOpening`. A unit address plays only that unit:
  the play store's `scope` holds its stretches, each started part-way along (`firstIndex`), one after another for a side
  unit. Above the list, **sessions** from `features/path/sessions` (a registry, one file per type: `pick` reads the path
  and returns an address): Next unit (learn the first ready unit, or drill the one being learned), Next 3 moves (the
  current unit from its first move not yet passed, `/<n>/<first>-<last>`) and Opening rush (Speed with the source
  `rush:<course>`: `rushQueue` plays each passed unit from the start to its end, ignoring the depth). Answers are
  recorded the usual way: Learn and Drill through `play/record.ts`, Speed in `speed_attempts`.
- `line`: one line's page, `/play/<course>/<line>/<tab>` with About, Learn, Drill, Quiz and Tree as a joined button group
  at the end of the breadcrumbs (`features/line/tabs.ts`; old `/practice` links are Drill). About is the line in words:
  a board on the position that names it (`namedPly`), the moves with their comments, where it branches from and what
  grows from it, other courses that teach it. Quiz is every question of that one line, shuffled and never saved
  (`lineQuestions`). The breadcrumbs' course and line are menus of every course and every line, the current one ticked.
- `tree` (`/tree`, a course's Tree tab, a line's Tree tab): `TreeExplorer`, full width in three columns. Left an index
  shaped like the tree (`index-model.ts`: the curriculum grouped by first two moves, a line under the line it grows out
  of within its group; folding only tidies the list). Middle the tree, one column per move and one lane per line, the
  main line across the top, branches below with the latest nearest so no lines cross (`laneLayout` in core, nodes keyed by
  move prefix in `move-tree.ts`); pills filled in the line's colour, the line's name left of where it starts; zoom
  buttons and pinch. Right a board with step buttons (and the arrow keys) along the picked line's whole path from the
  start. Only a click changes anything: a line or a move picks a line; the crosshair (or a group's name) draws only that
  subtree.
- `glossary`: the motif vocabulary from `content/motifs.yaml` with the courses that use each, searchable and A to Z.
- `play`: Learn (you play both sides, every move shown), Drill (the computer plays the other side; once called
  Practise) and Every branch.
  `speed` (`/speed`): a set-up window (a set of 3, 5 or 10 lines, or a timed run of 30 s, 1 min or 2 min; how deep: to move 6, 10
  or 15 or the whole line, `cutToMove`; lines from the courses you
  are learning, everything, or one course) and then lines played from memory against the clock with the other side answering
  instantly. A set of lines scores the mean time per move, a timed run how many moves you make. Hints (piece, then move) are
  counted. The last set-up is kept in localStorage. Runs go to the `speed_attempts` table (no effect on the review
  schedule), shown on the Stats tab.
  `guess` ("Name That Opening", `/guess`): a position from the courses and you type what it is; `guessTargets` collects every
  opening and variation whose lines reach it (transpositions count) and `gradeGuess` gives full credit for a variation, half
  for just the opening; answers go to the `guess_attempts` table.
  `review`: spaced-repetition cards. Quiz, Guess and Speed share a "from" choice (`SourceSelect`, `data/practice-source.ts`):
  the courses you are learning, everything, or one course. Quiz also has "Due today (your schedule)", the default; any
  other choice is free practice (`freePractice` in core) that is never saved, so it cannot touch the schedule. At the end
  of a quiz every wrong move is listed with what it cost by the engine against the course's move (`regret.ts` in core:
  under 30cp a memory slip, 30 to 99 an inaccuracy, 100 and more a mistake), from baked analysis or the browser engine at
  depth 14 after the session. `today`: dashboard. `settings`, `lab` (render any PGN at a ply, or a FEN).

Toggle groups mark the chosen item from `aria-checked` / `aria-pressed` (`components/ui/toggle.tsx`), because a hover
hint (`Hint`, a tooltip trigger) round an item overwrites its `data-state`.

**Nothing waits for a click when you are right.** A right move flashes a tick and play carries on by itself (the computer
replies, the next card appears); a wrong move flashes a cross and snaps back; a miss reveals the move. The exception, asked
for by the user: in Quiz and Guess a miss (or a partly right Guess, or a move needing a retry) stays up with a **Next** button,
because there is an explanation to read. In Speed a five second modal, with a countdown and the next opening's name, sits
between lines of a fixed run. Delays live in `DELAYS` / `REVIEW_DELAYS` / `GUESS_DELAYS` / `SPEED_DELAYS`.

All boards are `components/board/app-board.tsx` (colour theme, piece set, legal-move dots, hover and selection
highlights, tick/cross badge, hint pulse). Its size is one rule, `--board-size` in `index.css`: never wider than its
column or its cap, never taller than the screen less the header and controls (`--board-chrome`); pages with a board
column and a panel use the `.board-columns` class (stacked on a phone, side by side from lg and on a phone held sideways;
`stacked:` and `short:` variants). Page grids use `minmax(0,1fr)` columns so content can never widen a column. Preferences are per device in localStorage (`board/prefs.ts`), default the
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
review cards (`quiz:<opening>:<id>`), graded matched or missed, written with `quizAttempts.record`. Since the study path
(stage 3) new quiz cards are no longer introduced: quizzes are extras on the Path tab, and quiz cards already in the
database are still asked when due. In Review a quiz is answered by typing, then moves on by itself (a "Skip ahead" button is optional).

### Training

Pure logic is in core: `autoGrade` and the `reduceAttempt` state machine (hint, show, two wrong tries), `scheduleReview`
(ts-fsrs; `Card` stores `scheduledDays` and `learningSteps` because FSRS needs them), `cardDefinitions` /
`planIntroductions` / `planSession`, and `recordAnswer` (new schedule plus the `Review` row, written together by
`reviews.record`). Which openings are trained and the new-cards-per-day limit live in the settings table
(`apps/web/src/data/training-settings.ts`), so they export with everything else. New cards are introduced when a quiz
session starts, up to the daily limit, in **path order** (`planIntroductions` in `units.ts`: each enrolled course offers
the cards of its unlocked units and units being learned, in unit order, taking turns between courses; a locked unit
waits until the unit it grows from is passed; quizzes are never introduced). Due reviews are never limited by this:
`planSession` puts them first. New cards get due times one millisecond apart in the past so sorting by due date keeps
the introduction order. `introductionOrder` (moves and quizzes, flat) is still what free practice and the build's card
counts use. Practice answers in `play` feed the same cards through `features/play/record.ts`; Learn only
introduces them. A review is card by card: the position before our move, the opponent's last move highlighted.

**Units (the study path, `units.ts` in core, docs/STUDY-PLAN.md).** `courseUnits(content, options)` cuts a course into
units of about four learner moves. The tree is the learner's: at their turn only the repertoire move, at the opponent's
every move leading on to a card position (`cardDefinitions` decides what is core, so the card settings apply). The first
line's main line comes first, then branch after branch: of every move leaving covered ground, the one whose line matters
most (main and gambit, then sideline and traps to avoid, then rare), then the most popular (`node.popularity` of the
position it leads to), then the shallowest. A branch follows its line's own main line, else the most popular way on.
Each branch's new learner moves are cut by `cutIntoUnits` (runs near four, cuts preferred where another branch leaves);
branches of half a unit or less leaving the same unit, of the same importance, are grouped into one side unit with a
stretch each. Ids are `<line>:<n>`. A branch's first unit depends on the unit holding its last learner move before it
leaves, a later unit on the one before. Quizzes and traps are attached as extras. State is derived, never stored
(`unitProgress`): passed when every move's last two answers were good or easy (or the move is graduated), graduated when
every card is in FSRS review at 7 days or more, learning once a card exists, otherwise unlocked or locked by its
prerequisites. A unit with progress shows it even if its prerequisites are not passed. A course can change its path in
course.yaml `units:` (`order`, `after`, `drop`; `UnitOverrides`, `content/README.md`): applied at the end of
`courseUnits` as a topological sort that keeps the default order where it can. The build checks it strictly
(`checkUnitOverrides`, default card settings); the app ignores entries for units its settings do not cut, and keeps the
default path if what is left fails.

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
