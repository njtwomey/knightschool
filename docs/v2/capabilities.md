# Capabilities

The shared engines under the pages. Each is one module with one job, used by every page that needs it. v1 has most of
them in some form; the table under each says what moves in. [beyond-openings.md](beyond-openings.md) has the first
draft of the judgement and exercise designs in more detail.

## 1. Content: the tree, openings and the build

Authored files, validated at build, shipped as JSON, trusted at run time. Unchanged in principle.

- v1: `content/` (tree, courses, curriculum, openings, motifs), `content/theory-tree.ts`, `content/course-build.ts`,
  `scripts/content-build.ts` and `content-emit.ts`, `schema/`.
- v2 adds: steps and variations in course.yaml (a step names its stretch and has text; a variation is today's `section`
  with a Lichess name, a short introduction and a checkpoint), ideas in place of motifs (`content/ideas.yaml`, motifs
  carried over), refutations (PGN variations) in lines, checkable plans, and puzzle selections (`content/puzzles/`).

## 2. Judgement: how good is this move here, and why

One function, `judgeMove(epd, uci)`, used by every page that shows a verdict. Its answer comes from the first layer that
knows, so it never needs complete coverage:

1. **the author**: the opening's own move is _book_, and for the opponent any move in the theory tree is book; a move
   marked `?` or `??` in a line, or the first move of a refutation, carries the author's words;
2. **baked analysis**: the openings' positions (as now) plus the positions after the moves players at the learner's band
   actually play there (from popularity data), so the common wrong moves are covered ahead of time;
3. **the browser engine**, at a modest depth, cached; the verdict arrives when ready and nothing waits for it.

Graded by the drop in winning chances, as Lichess and Chess.com do, in the words beginners already know from Chess.com's
Game Review: Book, Best, Excellent, Good, Inaccuracy (?!), Mistake (?), Blunder (??), and Miss for a punishment not
found. No "Brilliant": it needs judging a sacrifice, and it is noise for beginners. Shown one way everywhere by
`Board.Feedback` and a `VerdictBadge`.

**As good, but not the line's move.** A move that is not the line's move but is as good is graded Good or Excellent by
its cost, like any other move (v1 calls it a "slip", under 30cp in `training/regret.ts`), and flagged **not your
repertoire move**: the board says "Excellent, but not your repertoire move: this opening plays 4.c3", and the learner is
asked for the line's move before play goes on. It does not use up a try and is never called a mistake; the tries table
lists it with its grade and the flag.

**Opponent mistakes** are the same function pointed the other way: when the opponent's move (in a step, a drill, Play
on) is a known mistake, the board says so and the next exercise is to punish it.

| v1 piece                 | Becomes                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `training/regret.ts`     | part of `judge/`, grading by winning chance                                                                                           |
| `data/analysis.ts`       | `data/judgement.ts`, the three layers                                                                                                 |
| `explain/` (`Explainer`) | the source of the "why" sentences: author, motif, engine (the engine explainer's sentences are already written and never shown in v1) |
| `pnpm analyse`           | gains `--replies` for the popular moves                                                                                               |

## 3. Exercises: one way to ask, grade and record

An exercise is a start position, the learner's side, a **grader** (exact move; any move that keeps the position; typed
words) and a **responder** for the other side (scripted from the opening or puzzle; popular moves weighted by games; the
engine). One session runs exercises in turn, with hints, two tries, the feedback delays, judgement on a wrong move, and
recording. It keeps **every try** (v1's attempt keeps only the last move played), so the tries table and the summary can
list each guess with its cost; saving every try is part of the attempts log decision (section 4).

| Mode        | Grader                                 | Responder            | v1                                |
| ----------- | -------------------------------------- | -------------------- | --------------------------------- |
| Learn       | exact, shown                           | scripted             | `features/play` (learn)           |
| Try / Drill | exact                                  | scripted or popular  | `features/play` (drill, branches) |
| Review      | exact or typed                         | scripted             | `features/quiz`                   |
| Speed       | exact, timed                           | scripted             | `features/speed`                  |
| Name it     | typed                                  | none                 | `features/name-it`                |
| Puzzle      | exact (any mate counts)                | scripted             | new                               |
| Play on     | keeps the position                     | popular, then engine | new                               |
| Checkpoint  | a mix of the above, from one variation |                      | new, made of existing modes       |

Built on v1's attempt machine (`training/attempt.ts`), `FEEDBACK_DELAYS` and `createTimers` (`lib/feedback.ts`),
`sessionLoader` (`lib/session.ts`) and the practice set-up (`components/practice-setup.tsx`, `data/practice-config.ts`).
New modes use it first; the four v1 stores move across once it has proved itself.

## 4. Progress and scheduling

Answers are logged; every state is worked out from the log.

- v1: FSRS cards and reviews (`training/scheduler.ts`, `cards.ts`), unit progress (`units/progress.ts`), the path
  (`features/path`, `data/course-path.ts`), Stats and Overview (`features/profile`).
- v2 adds: variation checkpoints, opening completion, idea progress, repertoire coverage (below), a daily streak and an
  activity calendar from the logs already kept. Puzzle cards reuse the cards table as quiz cards do (`puzzle:<id>`). New
  modes write one shared attempts log rather than a table each (a stored-format change: to be agreed first).

**Gates.** A step opens when the step it builds on is known (v1 does this for units). A variation's checkpoint opens
when its steps are known; clearing it makes the variation known and opens the next variation. An opening's final test
opens when its variations are known. Every gate can be skipped by **testing out**: clear the check without doing the
steps. One set of states serves moves, steps and variations: locked, open, learning, known, mastered (model.md).

## 5. Lichess (and Chess.com for your games)

The browser talks to Lichess with the learner's own token; the build uses the maintainer's. Your games also come from
Chess.com's public API (`api.chess.com/pub/player/<name>/games/archives`); both it and Lichess's
`/api/games/user/<name>` answer the browser directly (`access-control-allow-origin: *`) and need no token. A Lichess
token, when set, only raises Lichess's rate limit.

| Use                      | How                                                                                                                       | v1                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Moves played here, live  | the explorer API, one request at a time, cached 30 days, paused after a 429                                               | `features/explorer/service.ts`, storage's `ExplorerCache` |
| Popularity for the build | counts per position and move at the 1000 to 1600 band, committed                                                          | `make popularity`, `content/popularity/`                  |
| Opening names            | fetched once into `.cache/`                                                                                               | `content/lichess.ts`                                      |
| Puzzles                  | the public-domain puzzle database, selected per opening at maintainer time                                                | new: `make puzzles`                                       |
| Your own games           | the public games APIs of Lichess and Chess.com by username, no token: where you leave your repertoire, what you face most | new (the idea behind Chessbook and OpeningTree)           |

**The token.** `.env` exists (mode 600, `LICHESS_TOKEN`, template `.env.example`) and only `pnpm popularity` reads it.
In the website, Settings has an Explorer section that keeps the token in this browser only, never in the database or
exports (`features/profile/settings/explorer-section.tsx`). For local development, the dev server could hand the token
from `.env` to the page through a development-only endpoint, so it never ends up in a built bundle. Not built yet.

## 6. Puzzles

- **Select** (maintainer, rarely): `make puzzles` downloads the database once into `.cache/`, keeps puzzles whose
  opening tags match an opening's Lichess names or whose pawn structure matches its line ends, rated about 600 to 1800,
  well liked and much played, and writes the selection to `content/puzzles/`.
- **Attach**: by position, so a puzzle appears in every opening it fits, after the step that reaches its position.
- **Solve**: the puzzle preset of the board, the exercise session with the exact grader, any mate accepted.
- **Learn from it**: after solving or missing, the board turns to analysis: step through, see the verdicts, see the
  ideas it shows (from its Lichess themes, mapped to our ideas).
- **Credit**: Lichess on the Credits page.

**Structure key** (`structureKey(epd)` in core: the pawns only, white's then black's) is what links a puzzle, a plan or
a Play on position to an opening beyond its name.

## 7. Authoring

Create stays the place to write openings in the browser, and its output is the same files the repo holds.

- v1: `features/create` (courses, lines, path, publish), `authoring/chapter-edit.ts` and `contribution.ts`, the
  authoring tables, Undo, export reminders, marks drawn on the board.
- v2 adds: steps (name, text, stretch) and variations (title, intro), ideas on moves and steps, refutations (play a
  wrong move, write why), symbols on moves, picking puzzles for an opening, Play on positions with an aim, and the
  in-browser engine checking a line as it is written. The add-course skill (`.claude/skills/add-course`) stays the guide
  for content in the repo.

## 8. Storage

Unchanged: SQLite over OPFS in a worker, one tab at a time, migrations generated from the schema, export and import of
everything (`packages/storage`). Changes to the stored format are agreed before they are made.

## 9. Finding things

- v1: Search (`features/search`, with board search), the tree (`features/tree`), Courses (`features/courses`), the
  glossary.
- v2: the same, with ideas searchable, the tree coloured by the learner's progress, and the gaps in their repertoire
  drawn on it (see experience.md, "The map").
