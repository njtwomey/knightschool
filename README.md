# Knight School

A chess opening trainer for beginners (about 800 to 1600). It teaches **why** each move is played, then drills the
moves with spaced repetition. Everything runs in the browser: no backend, no account. Your progress lives in a local
SQLite database in the browser, and you can export it.

- **Learn and practise** lines move by move, with the computer playing the other side.
- **Quiz** the moves due today, or free-practise any course without touching your schedule.
- **Guess** an opening from a position, and **Speed** run lines from memory against the clock.
- **Courses** in one table; **Search** courses and lines, or by moves; read the glossary of ideas.

React 19, TypeScript, Vite, pnpm workspace, SQLite-WASM, ts-fsrs. Stockfish runs as a separate program (GPL) fetched
at runtime and spoken to over UCI; our code never imports it.

## Getting started

You need Node 24 and `make`. The Makefile uses your pnpm if you have one and falls back to `npx`.

```sh
make install      # dependencies
make dev          # the site at http://localhost:5173
make check        # format, lint, typecheck, tests
make pre-push     # the same plus a production build: this is what CI runs
make doctor       # what overlaps in content/ (moves written twice, shared lines)
```

Run `make` on its own to list every target.

## How the repository is laid out

| Path               | What lives there                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `content/`         | The teaching material: the theory tree (PGN chapters) and the courses (YAML). **Most work happens here.**     |
| `packages/core`    | Pure TypeScript: the content schema, how courses become cards, grading, search. No React or DOM.              |
| `packages/storage` | The SQLite database, repositories and migrations.                                                             |
| `packages/engine`  | The Stockfish wrapper (UCI over a worker).                                                                    |
| `apps/web`         | The React app. The only place the other packages meet.                                                        |
| `scripts/`         | Build and authoring tools (`content:build`, `content:doctor`, `course:eval`, `analyse`, `popularity`, `fen`). |
| `docs/`            | `PLAN.md` (architecture), `CURRICULUM.md` (the original curriculum proposal).                                 |
| `.claude/skills/`  | The `add-course` authoring guide that Claude Code follows when you ask it to add content.                     |

`CLAUDE.md` is the longer technical guide (architecture, rules, conventions). `content/README.md` is the exact
format of every content file.

## Adding things

### How content is shaped

Opening theory is a tree, so the content is one: `content/tree/` holds every line, for both sides, as **chapters**. A
chapter is one PGN file that starts where it branches off another chapter, so the moves before it are never typed twice:

```
content/tree/e4/evans-gambit/accepted-main-line.pgn     [Start "evans-gambit 5.c3"]  then  5... Ba5 6. d4 ...
```

A **course** is a selection from that tree for one side: `content/courses/<course>/course.yaml` names the trigger
position, the introduction, the plans and the lines it teaches (by chapter name, in order), and `quizzes.yaml` holds its
"why" questions. One line can be in several courses, from either side.

### A new course

1. **Decide** the side, the trigger position (as deep as the course's own idea), the tier (1 study first, 2 next,
   3 alternatives), and which opponent replies get a line.
2. **Register** it. If the opening is new, add it to `content/openings.yaml` (who plays it decides "play it" versus
   "play against it"). Add the course to `content/curriculum.yaml` (study order and prerequisites). Motifs come from
   `content/motifs.yaml`.
3. **Write** the course folder and the chapters it needs. Reuse every line the tree already has by listing it; write new
   chapters only from where they branch off. Every non-obvious move gets a plain-English reason, and the traps you can
   spring get quizzes.
4. **Check it**: `pnpm content:build` validates everything and lists warnings, `make doctor` shows what overlaps, and
   `pnpm course:eval <course> --no-cache --depth 16 --threads 1` asks Stockfish whether the moves are sound and the lines
   end level. Follow the engine, not memory.
5. **Run `make check`**, then commit.

The easiest way is to ask Claude Code to add the course: the `add-course` skill walks through all of this, including the
checks. Its guide is in `.claude/skills/add-course/`.

### Rules the build enforces (so you do not have to remember them)

- **One answer per position, per course.** In one course, every position where you are to move has exactly one
  repertoire move. A second answer goes in a line listed with `alternative: true` (shown, never drilled). The tree itself
  can hold several (the Italian and the King's Gambit both start from 1.e4 e5); each course picks.
- **A move has one comment**, wherever it is written.
- **Every `[Start]` points at a real move** of the chapter it names, and every listed line passes through the trigger.
- **Transpositions share positions**, so the same position reached two ways is one card.
- **Quizzes are checked**: the matching and non-matching example answers must behave as written.

### Smaller additions

| To add                         | Do this                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| A line                         | Write a chapter in `content/tree/` with `[Start "<chapter> <move>"]`, then list its name in the course's `lines:`. |
| A line another course has      | List its name in `lines:`. Nothing is copied.                                                                      |
| A quiz                         | Add an entry to the course's `quizzes.yaml`, with `examples.match` and `examples.miss`.                            |
| A group of lines on the page   | Give lines a `section:` in `course.yaml`; the course page groups by it.                                            |
| A link in a note to a position | `[f7](<EPD or FEN>)`: hover shows that position. `pnpm fen "1. e4 e5 2. Nf3"` prints the EPD.                      |
| A glossary idea                | Add it to `content/motifs.yaml`, then use its id in a course's `motifs:`.                                          |
| A new opening group            | Add it to `content/openings.yaml`.                                                                                 |

Never rename a chapter file: its name is the line id, and line ids appear in learners' history.

### After adding a course

These are heavy, so run them when you are ready:

```sh
pnpm analyse <course-id>   # native Stockfish at depth 24; the results are committed and ship with the app
make popularity            # how often players reach each position on Lichess (needs LICHESS_TOKEN in .env)
```

Popularity decides which sideline positions earn quiz cards. It is read from `content/popularity/popularity.json`;
the build never calls the network. Put secrets in `.env` (git-ignored; `.env.example` is the template).

### Changing the app

- Build screens from the shadcn components in `apps/web/src/components/ui`. ESLint rejects raw buttons and inputs.
- Keep to the package boundaries (core knows nothing about React or the browser); ESLint enforces them.
- Core changes ship with tests in the same commit.
- After changing the database schema in `packages/storage/src/schema.ts`, run `pnpm db:generate` and commit the
  migration it writes.

## Checks and deployment

`make pre-push` runs formatting, lint, types, tests (including a build of all the real content) and the production
build. A git hook can run it for you: `make hooks`.

The site is deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Licences

Our code is MIT (see `LICENSE`). Stockfish is GPL-3.0 and ships as a separate asset in `public/engine/`. Opening names
and statistics come from Lichess (CC0). See the Credits page in the app for the full list.
