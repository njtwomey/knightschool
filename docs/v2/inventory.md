# Inventory: keep, repurpose, park, delete

The detail behind the roadmap. First, a walk through how v2 is used, naming each thing on screen and where it comes
from. Then the reusable components that the walk needs. Then every part of v1 with a verdict.

**Verdicts:** _keep_ (used as it is), _repurpose_ (the code stays, its job or shape changes), _park_ (kept in the repo,
not used or developed), _delete_ (nothing needs it). Feature codes (L1, T4, ...) are from [features.md](features.md).

## 1. Walking through v2

Each component is named by its file in [components/](components/README.md); pages by theirs in
[pages/](pages/README.md).

### Arriving (A1, A2, A3)

| On screen                                     | Component                                                                            | From v1                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| The promise and a line playing with its ideas | [board](components/board.md), `thumb` preset, on [first-visit](pages/first-visit.md) | Home's showcase (`features/home`) — repurpose                     |
| Three questions: level, White, Black          | the [onboarding](pages/onboarding.md) page                                           | new                                                               |
| Opening suggestions with style tags           | [opening-card](components/opening-card.md)                                           | course rows on Courses and Search — repurpose                     |
| "Show me what I play" (Lichess or Chess.com)  | [onboarding](pages/onboarding.md), over the [games store](stores/games.md)           | new (Z2)                                                          |
| The result: your repertoire                   | [repertoire-slots](components/repertoire-slots.md) (White, vs 1.e4, vs 1.d4)         | "courses I am learning" (`data/training-settings.ts`) — repurpose |

### Today (A3, P1, P2, P3)

| On screen                                  | Component                                                                            | From v1                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| One main button: continue / review / start | [next-action](components/next-action.md)                                             | the path's sessions registry (`features/path/sessions`) — repurpose |
| Reviews due                                | [due-card](components/due-card.md)                                                   | Overview and Home's due count — repurpose                           |
| A puzzle from your openings                | [puzzle-card](components/puzzle-card.md)                                             | new                                                                 |
| Streak, calendar                           | [streak](components/streak.md), [activity-calendar](components/activity-calendar.md) | new, from the existing answer logs                                  |
| Coverage per side, biggest gap             | [coverage-meter](components/coverage-meter.md), [gap-link](components/gap-link.md)   | `scripts/gaps.ts` logic, moved into core — repurpose                |

### An opening (L1, L3, P1, T6, T7)

| On screen                                         | Component                                                                                                                    | From v1                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Introduction: idea, risks, suits, origin, sources | [opening-intro](components/opening-intro.md), [sources-list](components/sources-list.md)                                     | `CourseIntro` in `features/course` — keep                                   |
| Counts per mode, coloured                         | [mode-counts](components/mode-counts.md)                                                                                     | new                                                                         |
| Variations, each with steps and their states      | [variation-list](components/variation-list.md), [step-row](components/step-row.md), [state-badge](components/state-badge.md) | the Path tab (`features/path`, `unit-row.tsx`, `unit-state.ts`) — repurpose |
| The board beside the list                         | [board](components/board.md), `study` preset                                                                                 | `unit-board.tsx`, `board-panel.tsx` — repurpose onto Board                  |
| Every line, openable freely (the Lines tab)       | [line-row](components/line-row.md) in a [sortable-table](components/sortable-table.md)                                       | the course page's lines by kind — keep                                      |

### A step (L5, L6, F2, F3, F6)

| On screen                            | Component                                                                                                                                         | From v1                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Title, text with clickable positions | [rich-text](components/rich-text.md) with inline boards                                                                                           | `RichText`, `StaticBoard` — repurpose                  |
| Watch: moves with comments and marks | [board](components/board.md) `learn` preset, [move-table](components/move-table.md), [board-notes](components/board-notes.md)                     | Learn (`features/play`), `MoveList`, marks — repurpose |
| The fading arrow                     | a system arrow on [board-surface](components/board-surface.md), rule in config (`teach.hintFadeAfterRight`)                                       | Learn's arrow — repurpose                              |
| Try: play without help               | [board](components/board.md) `test` preset, [use-exercise-session](hooks/use-exercise-session.md), [exercise-panel](components/exercise-panel.md) | Drill (`features/play/store.ts`) — repurpose           |
| A wrong move: why                    | [board-feedback](components/board-feedback.md), [verdict-note](components/verdict-note.md), [verdict-badge](components/verdict-badge.md)          | tick/cross badge; `regret.ts` — repurpose              |
| Their mistake: punish it             | an exercise, [board-feedback](components/board-feedback.md)                                                                                       | new                                                    |
| Done: ideas learned, where you stand | [session-summary](components/session-summary.md), [eval-words](components/eval-words.md), [idea-badge](components/idea-badge.md)                  | complete card (`complete-card.tsx`) — repurpose        |

### Practice (T1 to T5, T8, Z1)

| On screen                         | Component                                                                                                 | From v1                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| The set-up card and summary bar   | [practice-setup](components/practice-setup.md), [practice-bar](components/practice-bar.md)                | `components/practice-setup.tsx` — keep                                   |
| Review                            | [use-exercise-session](hooks/use-exercise-session.md) (review)                                            | Quiz (`features/quiz`) — repurpose                                       |
| Drill, every branch               | [use-exercise-session](hooks/use-exercise-session.md) (drill)                                             | `features/play` — repurpose                                              |
| Puzzles                           | [use-exercise-session](hooks/use-exercise-session.md) (puzzle)                                            | new                                                                      |
| Play on, leaving the book         | [use-exercise-session](hooks/use-exercise-session.md) (play on)                                           | new                                                                      |
| Speed, Name it                    | their own sessions, with [countdown](components/countdown.md), [answer-input](components/answer-input.md) | `features/speed`, `features/name-it` — keep, move onto the session later |
| End of a session: what went wrong | [session-summary](components/session-summary.md), [tries-table](components/tries-table.md)                | quiz summary and miss list (`summary.tsx`, `miss-list.tsx`) — repurpose  |

### The map (ours)

| On screen                              | Component                                                                           | From v1                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| The tree, coloured by what you know    | [map-tree](components/map-tree.md)                                                  | `TreeExplorer`, lane layout (`features/tree`) — repurpose |
| Gaps and the opponent's mistakes on it | [map-tree](components/map-tree.md) overlays, [map-legend](components/map-legend.md) | new, from popularity and judgement                        |
| The index of lines                     | [map-index](components/map-index.md)                                                | `tree-index.tsx` — keep                                   |
| The board for the picked move          | [board](components/board.md), `study` preset                                        | `tree-board.tsx` — repurpose onto Board                   |

### Explore and Ideas

| On screen                    | Component                                                                                                                              | From v1                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Search, board search         | [search-box](components/search-box.md), [board-search](components/board-search.md)                                                     | `features/search` — keep, behaviour unchanged     |
| The Board page (`/board`)    | [board](components/board.md) `analysis` preset, [board-eval](components/board-eval.md), [board-explorer](components/board-explorer.md) | Lab (`features/lab`), `ExplorerPanel` — repurpose |
| A line's page                | [line-story](components/line-story.md) on the [line](pages/line.md) page                                                               | `features/line/about-tab.tsx` — keep              |
| Ideas A to Z, an idea's page | the [ideas](pages/ideas.md) and [idea](pages/idea.md) pages, [idea-badge](components/idea-badge.md)                                    | Glossary (`features/glossary`) — repurpose        |

### Create (C1)

| On screen                               | Component                                                                                                                                            | From v1                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Openings, details, lines, path, publish | the [create](pages/create.md) and [create-opening](pages/create-opening.md) pages                                                                    | `features/create` — keep                     |
| Steps and variations, their text        | [step-editor](components/step-editor.md)                                                                                                             | the Path tab (`path-order.tsx`) — repurpose  |
| Refutations, symbols, ideas on moves    | [move-note-editor](components/move-note-editor.md), [refutation-editor](components/refutation-editor.md), [marks-editor](components/marks-editor.md) | `move-note`, `move-marks.tsx` — keep, extend |
| Pick puzzles for a step                 | [puzzle-picker](components/puzzle-picker.md)                                                                                                         | new (puzzles.md, look-up)                    |
| Import PGN or a Lichess study           | [pgn-import](components/pgn-import.md)                                                                                                               | new                                          |

## 2. The reusable components

What the walk-through keeps asking for, each with one job. Everything on screen is one of these, or a page built from
them. The full list is [components/README.md](components/README.md).

| Component                                                                                                     | Job                                                                                                 | Source                                 |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [board](components/board.md) and its parts                                                                    | every chessboard (board.md)                                                                         | `components/board`, repurposed         |
| [use-exercise-session](hooks/use-exercise-session.md)                                                         | ask, grade, feed back, record, one exercise after another                                           | the four session stores, merged        |
| [verdict-badge](components/verdict-badge.md), [verdict-note](components/verdict-note.md)                      | how good a move was, and why                                                                        | new, over `judgeMove`                  |
| [tries-table](components/tries-table.md)                                                                      | every guess in a session with its grade, centipawn cost, time and help used; rows open the position | from `miss-list.tsx`                   |
| [eval-words](components/eval-words.md)                                                                        | where a position stands, in words and numbers                                                       | new, over `components/engine`          |
| [move-table](components/move-table.md)                                                                        | moves as a table, inline, or told with comments                                                     | `components/move-list.tsx`, keep       |
| [rich-text](components/rich-text.md) with inline boards                                                       | step and opening text                                                                               | `components/rich-text`, extend         |
| [practice-setup](components/practice-setup.md), [practice-bar](components/practice-bar.md)                    | choosing what to practise                                                                           | keep                                   |
| [state-badge](components/state-badge.md)                                                                      | locked, open, learning, known, mastered, everywhere the same                                        | `unit-state.ts`, generalised           |
| [next-action](components/next-action.md)                                                                      | the one button that says what to do now                                                             | the path's sessions registry           |
| [mode-counts](components/mode-counts.md)                                                                      | the coloured counts per mode                                                                        | new                                    |
| [opening-card](components/opening-card.md), [step-row](components/step-row.md)                                | an opening or a step in any list                                                                    | from v1 course rows and `unit-row.tsx` |
| [idea-badge](components/idea-badge.md)                                                                        | an idea's name, linking to its page                                                                 | from `TagBadge`, motifs                |
| [coverage-meter](components/coverage-meter.md), [gap-link](components/gap-link.md)                            | how much of what you meet you know, and where the hole is                                           | new                                    |
| [map-tree](components/map-tree.md), [map-index](components/map-index.md)                                      | the tree of lines, with overlays, and its index                                                     | `TreeExplorer`, repurposed             |
| [breadcrumbs](components/breadcrumbs.md)                                                                      | breadcrumbs with menus and tabs                                                                     | `TrailCrumbs`, keep                    |
| [sortable-table](components/sortable-table.md) (with `RowLink`), [filter-toggle](components/filter-toggle.md) | tables and filters                                                                                  | keep                                   |
| shadcn `ui`                                                                                                   | every control                                                                                       | keep                                   |

**shadcn pieces to add when building.** v2 needs four shadcn components that are not yet in
`apps/web/src/components/ui`: `HoverCard` ([position-preview](components/position-preview.md), opened by
[use-position-preview](hooks/use-position-preview.md)), `Slider` ([settings-row](components/settings-row.md), the
settings registry's `slider` control), `Checkbox` ([pgn-import](components/pgn-import.md),
[puzzle-picker](components/puzzle-picker.md)'s "tick to include") and `NavigationMenu` (the header's sub-menus,
[menu](navigation/menu.md)). Each is added with `npx shadcn@latest add <name>` from `apps/web`, as CLAUDE.md says.

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
| `features/lab`                                                                                                           | repurpose | the Board page (`/board`)                                            |
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

v1 keys learners' progress by course id and position (`<course>:<epd>`), and line ids appear in it. v2 recommends
re-keying move cards by position and move (`move:<epd>:<uci>`, [schemas/upgrades.md](schemas/upgrades.md)), with a
one-off migration of v1's cards: then parking v1's courses loses nothing, since any v2 opening that reaches the same
positions and moves picks the history up. The decision is in [decisions.md](decisions.md).
