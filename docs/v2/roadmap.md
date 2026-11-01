# Roadmap

Built on the `v2` branch in this repo, in stages that each leave the site working. `main` keeps deploying v1 until v2 is
ready to replace it (or to move to a repo of its own). Each stage names what it reuses.

## Stage 0: the plan (this folder)

Agree the vocabulary (model.md), the experience (experience.md) and the shape of the board and capabilities. Settle the
decisions in [decisions.md](decisions.md).

## Stage 1a: the settings registry

The registry, the layers (session, opening, you, material, preset, default), presets, the three stores and the settings
page (settings.md). First, because every later stage reads its numbers from it: the fixed numbers in `constants.ts`,
`FEEDBACK_DELAYS` and the training rules become registry entries as each stage touches them.

_Reuses:_ `lib/local-prefs.ts`, the `settings` table, `data/practice-config.ts`, board and engine prefs, the Settings
page.

## Stage 1b: the board model

`useBoardModel` and the `Board.*` parts (board.md), with presets and reveal levels. Move the pages onto it one at a
time: the course page (the opening page to be), About, Learn and Drill, the tree, the path, Quiz, Speed, Name it, Lab,
Create. Each move deletes that page's own wiring. Ends with system arrows in their own colours.

_Reuses:_ `AppBoard`, `StudyBoard`, `useLineStepper`, `MoveList`, `components/engine/`, `ExplorerPanel`, `shapes.ts`.

## Stage 2: judgement

`judgeMove` with the author and live layers, `Board.Feedback` and the verdict badge, on a wrong move in Learn and Drill.
Refutation variations in lines. Where a line leaves you, in words. Then baked analysis of popular replies
(`pnpm analyse --replies`) and the common-mistake finder (`make punish`).

_Reuses:_ `regret.ts`, `data/analysis.ts`, `explain/`, `pnpm analyse`, `popularity.json`, the board marks.

## Stage 3: steps and variations

Steps (named stretches with text and ideas, the automatic unit cut as default) and variations (today's sections, with a
Lichess name, an introduction and a checkpoint) in course.yaml and in Create. The step page with its five stages. Ideas
in place of motifs, with pages.

_Reuses:_ `courseUnits` and overrides, unit progress, the path, `section`, motifs and the glossary, Create's Path tab.

## Stage 4: the exercise session and puzzles

The shared session with graders and responders (capabilities.md, 3). Puzzles first: `make puzzles`, the structure key,
puzzle cards, the Puzzles mode. Then checkpoints, made of existing modes.

_Reuses:_ the attempt machine, feedback delays and timers, `sessionLoader`, the practice set-up, the cards table.

## Stage 5: arriving and moving around

The v2 menu (Today, Learn, Practice, Explore, Ideas, Create), Today, onboarding to a repertoire, repertoire coverage,
streak and calendar, the map (the tree coloured by progress, with gaps).

_Reuses:_ Home, Overview, Stats, the tree explorer and lane layout, `scripts/gaps.ts` logic moved into core.

## Stage 6: Play on, and your own games

Play on from line ends, popular replies then the engine, graded by judgement; checkable plans. Reading a learner's
public Lichess and Chess.com games by username: where they leave their repertoire, what they face most.

_Reuses:_ the browser engine, popularity data and the explorer cache, Every branch's weighted replies.

## Stage 7: the catalogue

Bring the first catalogue (courses.md) up to the bar, opening by opening, with the pipeline. Other openings follow.

## Moving pieces

| v1                                                    | v2                                                |
| ----------------------------------------------------- | ------------------------------------------------- |
| "chapter" (a PGN file in the tree)                    | "line" (files and ids unchanged)                  |
| course                                                | opening (ids unchanged)                           |
| course `section`                                      | variation, with a Lichess name                    |
| unit                                                  | step (automatic cut kept as the default)          |
| motif, glossary                                       | idea, Ideas                                       |
| `regret.ts`, `data/analysis.ts`                       | `judge/`, `data/judgement.ts`                     |
| play, quiz, speed, name-it stores                     | definitions on one exercise session (once proved) |
| `StudyBoard` props, per-page conditions               | `Board` parts, presets and reveal levels          |
| Courses, Search, Tree, Quiz, Speed, Name it, Glossary | Today, Learn, Practice, Explore, Ideas            |
| courses I am learning                                 | repertoire, with coverage                         |

## From the survey

What survey.md adds to the stages above: fading hints in the Watch stage (stage 3), counts per mode on openings and "go
to your biggest gap" (stage 5), leaving the book early with "kept or gave away your advantage" (stage 6), your games as
review cards (stage 6), Chess.com's grade words (stage 2). And what to avoid: currencies and leagues, locking learners
into an opening's order, hiding the limits that stop overload.

## Decisions needed

Every open decision, from this file and the rest of the plan, is collected with a recommendation in
[decisions.md](decisions.md): the menu and names, drilling the opponent's mistakes as cards, the default for gates, the
stored format, the puzzle database download, the first catalogue, and where v2 lives. Reading a learner's games from
Lichess and Chess.com in the browser is decided (public APIs, by username, no token).
