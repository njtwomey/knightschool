# Inventory: keep, repurpose, park, delete

The detail behind the roadmap. First, a walk through how v2 is used, naming each thing on screen and where it comes
from. Then the reusable components that the walk needs. Then every part of v1 with a verdict.

**Verdicts:** _keep_ (used as it is), _repurpose_ (the code stays, its job or shape changes), _park_ (kept in the repo,
not used or developed), _delete_ (nothing needs it). Feature codes (L1, T4, ...) are from [features.md](features.md).

## 1. Walking through v2

### Arriving (A1, A2, A3)

| On screen                                     | Component                                   | From v1                                                           |
| --------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| The promise and a line playing with its ideas | `Hero` (a thumb-preset Board)               | Home's showcase (`features/home`) — repurpose                     |
| Three questions: level, White, Black          | `Onboarding`                                | new                                                               |
| Opening suggestions with style tags           | `OpeningCard`                               | course rows on Courses and Search — repurpose                     |
| "Show me what I play" (Lichess username)      | `GamesImport`                               | new (Z2)                                                          |
| The result: your repertoire                   | `RepertoireSlots` (White, vs 1.e4, vs 1.d4) | "courses I am learning" (`data/training-settings.ts`) — repurpose |

### Today (A3, P1, P2, P3)

| On screen                                  | Component                    | From v1                                                             |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------- |
| One main button: continue / review / start | `NextAction`                 | the path's sessions registry (`features/path/sessions`) — repurpose |
| Reviews due                                | `DueCard`                    | Overview and Home's due count — repurpose                           |
| A puzzle from your openings                | `PuzzleCard`                 | new                                                                 |
| Streak, calendar                           | `Streak`, `ActivityCalendar` | new, from the existing answer logs                                  |
| Coverage per side, biggest gap             | `CoverageMeter`, `GapLink`   | `scripts/gaps.ts` logic, moved into core — repurpose                |

### An opening (L1, L3, P1, T6, T7)

| On screen                                         | Component                                | From v1                                                                     |
| ------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| Introduction: idea, risks, suits, origin, sources | `OpeningIntro`                           | `CourseIntro` in `features/course` — keep                                   |
| Counts per mode, coloured                         | `ModeCounts`                             | new                                                                         |
| Variations, each with steps and their states      | `VariationList`, `StepRow`, `StateBadge` | the Path tab (`features/path`, `unit-row.tsx`, `unit-state.ts`) — repurpose |
| The board beside the list                         | Board, `study` preset                    | `unit-board.tsx`, `board-panel.tsx` — repurpose onto Board                  |
| Every line, openable freely                       | `LineList`                               | the course page's lines by kind — keep                                      |

### A step (L5, L6, F2, F3, F6)

| On screen                            | Component                                           | From v1                                                |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------------ |
| Title, text with clickable positions | `StepText` (RichText with inline boards)            | `RichText`, `StaticBoard` — repurpose                  |
| Watch: moves with comments and marks | Board `learn` preset + `Board.Moves`, `Board.Notes` | Learn (`features/play`), `MoveList`, marks — repurpose |
| The fading arrow                     | Board system arrow, rule in the session             | Learn's arrow — repurpose                              |
| Try: play without help               | Board `test` preset + `ExerciseSession`             | Drill (`features/play/store.ts`) — repurpose           |
| A wrong move: why                    | `Board.Feedback`, `VerdictNote`, `VerdictBadge`     | tick/cross badge; `regret.ts` — repurpose              |
| Their mistake: punish it             | an exercise, `Board.Feedback`                       | new                                                    |
| Done: ideas learned, where you stand | `StepSummary`, `EvalWords`, `IdeaBadge`             | complete card (`complete-card.tsx`) — repurpose        |

### Practice (T1 to T5, T8, Z1)

| On screen                         | Component                      | From v1                                                                  |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| The set-up card and summary bar   | `PracticeSetup`, `PracticeBar` | `components/practice-setup.tsx` — keep                                   |
| Review                            | `ExerciseSession` (review)     | Quiz (`features/quiz`) — repurpose                                       |
| Drill, every branch               | `ExerciseSession` (drill)      | `features/play` — repurpose                                              |
| Puzzles                           | `ExerciseSession` (puzzle)     | new                                                                      |
| Play on, leaving the book         | `ExerciseSession` (play on)    | new                                                                      |
| Speed, Name it                    | their sessions                 | `features/speed`, `features/name-it` — keep, move onto the session later |
| End of a session: what went wrong | `SessionSummary`, `MissList`   | quiz summary and miss list (`summary.tsx`, `miss-list.tsx`) — repurpose  |

### The map (ours)

| On screen                              | Component            | From v1                                                   |
| -------------------------------------- | -------------------- | --------------------------------------------------------- |
| The tree, coloured by what you know    | `MapTree`            | `TreeExplorer`, lane layout (`features/tree`) — repurpose |
| Gaps and the opponent's mistakes on it | `MapTree` overlays   | new, from popularity and judgement                        |
| The index of lines                     | `TreeIndex`          | `tree-index.tsx` — keep                                   |
| The board for the picked move          | Board `study` preset | `tree-board.tsx` — repurpose onto Board                   |

### Explore and Ideas

| On screen                    | Component                                 | From v1                                           |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Search, board search         | `SearchPage`, `BoardSearch`               | `features/search` — keep                          |
| Analysis board, explorer     | Board `analysis` preset, `Board.Explorer` | Lab (`features/lab`), `ExplorerPanel` — repurpose |
| A line's page                | `LineAbout`                               | `features/line/about-tab.tsx` — keep              |
| Ideas A to Z, an idea's page | `IdeaList`, `IdeaPage`                    | Glossary (`features/glossary`) — repurpose        |

### Create (C1)

| On screen                               | Component           | From v1                                      |
| --------------------------------------- | ------------------- | -------------------------------------------- |
| Openings, details, lines, path, publish | as now              | `features/create` — keep                     |
| Steps and variations, their text        | new tabs or panels  | the Path tab (`path-order.tsx`) — repurpose  |
| Refutations, symbols, ideas on moves    | `MoveNote` extended | `move-note`, `move-marks.tsx` — keep, extend |
| Pick puzzles for a step                 | `PuzzlePicker`      | new (puzzles.md, look-up)                    |
| Import PGN or a Lichess study           | `ImportPgn`         | new                                          |

## 2. The reusable components

What the walk-through keeps asking for, each with one job. Everything on screen is one of these, or a page built from
them.

| Component                                        | Job                                                                                                 | Source                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Board** and its parts                          | every chessboard (board.md)                                                                         | `components/board`, repurposed         |
| **ExerciseSession**                              | ask, grade, feed back, record, one exercise after another                                           | the four session stores, merged        |
| **VerdictBadge**, **VerdictNote**                | how good a move was, and why                                                                        | new, over `judgeMove`                  |
| **TriesTable**                                   | every guess in a session with its grade, centipawn cost, time and help used; rows open the position | from `miss-list.tsx`                   |
| **EvalWords**                                    | where a position stands, in words and numbers                                                       | new, over `components/engine`          |
| **MoveList**                                     | moves as a table, inline, or told with comments                                                     | `components/move-list.tsx`, keep       |
| **RichText** with inline boards                  | step and opening text                                                                               | `components/rich-text`, extend         |
| **PracticeSetup**, **PracticeBar**               | choosing what to practise                                                                           | keep                                   |
| **StateBadge**                                   | locked, open, learning, passed, mastered, everywhere the same                                       | `unit-state.ts`, generalised           |
| **ModeCounts**                                   | the coloured counts per mode                                                                        | new                                    |
| **OpeningCard**, **StepRow**                     | an opening or a step in any list                                                                    | from v1 course rows and `unit-row.tsx` |
| **IdeaBadge**                                    | an idea's name, linking to its page                                                                 | from `TagBadge`, motifs                |
| **CoverageMeter**, **GapLink**                   | how much of what you meet you know, and where the hole is                                           | new                                    |
| **MapTree**                                      | the tree of lines, with overlays                                                                    | `TreeExplorer`, repurposed             |
| **TrailCrumbs**                                  | breadcrumbs with menus and tabs                                                                     | `components/breadcrumbs`, keep         |
| **SortableTable**, **RowLink**, **FilterToggle** | tables and filters                                                                                  | keep                                   |
| shadcn `ui`                                      | every control                                                                                       | keep                                   |

## 3. Every part of v1

### Core (`packages/core/src`)

| Part                                                                           | Verdict   | Why, and what changes                                                          |
| ------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| `chess/` (epd, chess, position, position-id, board-edit, pgn, notation)        | keep      | the foundation; the PGN reader already keeps variations and NAGs               |
| `content/theory-tree.ts`                                                       | keep      | the tree of lines; refutation variations kept out of the tree                  |
| `content/course-build.ts`                                                      | keep      | builds an opening's tree (from its v1 course); steps sit on top of it          |
| `content/course-index.ts`, `opening-groups.ts`, `openings-list.ts`             | repurpose | the catalogue and repertoire slots instead of "play it / against it" groups    |
| `content/marks.ts`, `rich-text.ts`, `lichess.ts`, `explorer.ts`, `related.ts`  | keep      |                                                                                |
| `content/tags.ts`                                                              | repurpose | line kinds stay; motif tags become ideas                                       |
| `navigation/` (content-walk, move-tree, lane-layout)                           | keep      | walking openings, the map                                                      |
| `training/attempt.ts`, `scheduler.ts`, `sampling.ts`, `stats.ts`               | keep      | the attempt machine, FSRS, weighted picks, statistics                          |
| `training/cards.ts`                                                            | repurpose | card kinds: move, quiz, puzzle, deviation (your games)                         |
| `training/regret.ts`, `grading.ts`                                             | repurpose | into `judge/`, grading by winning chance                                       |
| `training/branches.ts`                                                         | repurpose | the popular responder of the exercise session                                  |
| `training/quiz.ts`                                                             | keep      | typed questions, as one kind of exercise                                       |
| `training/units/` (cut, overrides, progress, introductions, extras, path-edit) | repurpose | units become steps; the cut stays the default; extras gain puzzles and Play on |
| `modes/speed.ts`, `guess.ts`                                                   | keep      | become exercise definitions later                                              |
| `search/`                                                                      | keep      |                                                                                |
| `authoring/`                                                                   | keep      | extended for steps, refutations, imports                                       |
| `explain/`                                                                     | repurpose | the "why" sentences behind verdicts                                            |
| `schema/`                                                                      | keep      | gains step, variation, idea, puzzle                                            |

### Engine and storage

| Part               | Verdict | Why                                                                                |
| ------------------ | ------- | ---------------------------------------------------------------------------------- |
| `packages/engine`  | keep    | one search at a time, cached; the judgement's live layer                           |
| `packages/storage` | keep    | new tables only when agreed (puzzle cards need none; an attempts log would be one) |

### Web app (`apps/web/src`)

| Part                                                                                                                     | Verdict   | Why, and what changes                                                |
| ------------------------------------------------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------- |
| `lib/`, `hooks/`                                                                                                         | keep      | prefs, feedback delays, sessions, sorting, async loading             |
| `router/`                                                                                                                | repurpose | the v2 menu and routes; old addresses redirect                       |
| `data/` (catalog, progress, storage, content, fetch, practice-config, training-settings, backup, authored-*)             | keep      |                                                                      |
| `data/analysis.ts`                                                                                                       | repurpose | `data/judgement.ts`                                                  |
| `data/course-path.ts`                                                                                                    | repurpose | the path of steps                                                    |
| `components/ui`                                                                                                          | keep      | shadcn                                                               |
| `components/board`                                                                                                       | repurpose | the Board model and parts (board.md); `AppBoard` becomes the surface |
| `components/engine`                                                                                                      | keep      | the Eval part                                                        |
| `components/breadcrumbs`, `sortable-table`, `filter-toggle`, `move-list`, `rich-text`, `practice-setup`, `page-fallback` | keep      |                                                                      |
| `components/tags`                                                                                                        | repurpose | kinds stay; idea badges added                                        |
| `app/header.tsx`                                                                                                         | repurpose | the v2 menu, coverage and streak                                     |
| `features/home`                                                                                                          | repurpose | Today and the first-visit page                                       |
| `features/courses`                                                                                                       | repurpose | the catalogue in Learn, with opening cards and style tags            |
| `features/course`, `features/path`                                                                                       | repurpose | the opening page with variations and steps                           |
| `features/line`                                                                                                          | keep      | a line's page, in Explore                                            |
| `features/play`                                                                                                          | repurpose | a step's stages and Drill, on the exercise session                   |
| `features/quiz`                                                                                                          | repurpose | Review, on the exercise session                                      |
| `features/speed`, `features/name-it`                                                                                     | keep      | moved onto the session once it has proved itself                     |
| `features/tree`                                                                                                          | repurpose | the map                                                              |
| `features/explorer`                                                                                                      | repurpose | `Board.Explorer`                                                     |
| `features/search`                                                                                                        | keep      | under Explore                                                        |
| `features/lab`                                                                                                           | repurpose | the analysis board                                                   |
| `features/glossary`                                                                                                      | repurpose | Ideas                                                                |
| `features/profile`                                                                                                       | keep      | Stats and Settings; Overview folds into Today                        |
| `features/create`                                                                                                        | keep      | extended                                                             |
| `features/credits`                                                                                                       | keep      | adds the Lichess puzzle database                                     |
| `features/engine` (an empty folder)                                                                                      | delete    | nothing in it                                                        |

### Scripts

| Script                                                                    | Verdict   | Why                                                          |
| ------------------------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| `content-build.ts`, `content-emit.ts`, `content-lib.ts`, `replace-dir.ts` | keep      | the build, pointed at whatever content is live               |
| `popularity.ts`                                                           | keep      | the band's moves: coverage, responder, puzzle ranking        |
| `analyse.ts`                                                              | keep      | gains popular replies                                        |
| `gaps.ts`                                                                 | repurpose | its logic into core for the app's coverage; the report stays |
| `course-eval.ts`, `doctor.ts`                                             | keep      | the bar's checks (courses.md)                                |
| `copy-engine.ts`, `db-bundle.ts`, `fen.ts`                                | keep      |                                                              |
| new: puzzles index, names, expand, select, look-up                        | —         | puzzles.md                                                   |

## 4. Content: what to park

The content directory was written to cover many openings quickly. v2 wants a few openings made to a bar, in a new shape
(variations, steps, ideas). So:

| Path                                       | Verdict      | Why                                                                      |
| ------------------------------------------ | ------------ | ------------------------------------------------------------------------ |
| `content/courses/` (22 courses)            | park         | too broad, the wrong shape; mined for v2 openings, line by line          |
| `content/tree/` (331 lines)                | park         | the same; the moves and comments are reused when a v2 opening needs them |
| `content/curriculum.yaml`, `openings.yaml` | park         | replaced by tracks and repertoire slots                                  |
| `content/motifs.yaml`                      | repurpose    | the seed of `ideas.yaml`                                                 |
| `content/popularity/popularity.json`       | keep         | data about positions, not openings: coverage, responder, ranking         |
| `content/analysis/analysis.json`           | keep         | the same; extended                                                       |
| `content/README.md`                        | repurpose    | rewritten for the v2 format                                              |
| `content/_parked/old/` (an empty folder)   | delete       | nothing in it                                                            |
| `.cache/openings.tsv`, `.cache/puzzles/`   | keep (cache) | Lichess opening names; the puzzle database                               |

**How to park without breaking anything.** The app, `content:build` and about 120 content tests run off
`content/courses` and `content/tree`. Parking means: freeze them now (no new work), move them to `content/_parked/v1/`
when the first v2 opening exists, and point the build at the v2 content then. Until that day, v1's courses are what the
puzzle matching and the board work are tried on.

## 5. Stored data

Learners' progress is keyed by v1 course id and position, and line ids appear in it. Parking v1's courses leaves that
history in their databases, unread. Decide before v2 ships whether v1 progress is carried into v2 (where a v2 opening
reaches the same positions, it could be) or simply left behind.
