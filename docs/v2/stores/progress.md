# progress

The learner's cards and answers, and the states worked out from them: the one source of "what do I know".

## Holds

- **cards**: one per move to recall, per quiz, and (if agreed) per puzzle and per game deviation, with their FSRS
  schedule;
- **answers**: reviews, quiz, guess and Speed attempts, and (if agreed) every try and checkpoint result;
- **derived, memoised per opening**: step, variation and opening states, mode counts, due counts, idea progress,
  coverage, the streak and the activity calendar. Never stored: worked out from the log, as v1 does for units;
- a **version per opening**, bumped when an answer for it is recorded, so [use-progress](../hooks/use-progress.md)
  recomputes only what changed.

## Written by

The [session](session.md) when an exercise is answered (through one `record` function); Learn introducing cards (as v1);
introductions at the start of a review session, in path order across the repertoire, up to the daily limit; import on
the [data](../pages/data.md) page; "reset progress" for one opening or all.

## Read by

[use-progress](../hooks/use-progress.md) and so [state-badge](../components/state-badge.md),
[mode-counts](../components/mode-counts.md), [progress-ring](../components/progress-ring.md),
[streak](../components/streak.md), [activity-calendar](../components/activity-calendar.md),
[due-card](../components/due-card.md), [next-action](../components/next-action.md); pages [today](../pages/today.md),
[stats](../pages/stats.md), [opening](../pages/opening.md), [map](../pages/map.md); the session's queue builders
(Review's due cards, Drill's least-known branch first).

## Persists

SQLite tables, all exported and merged on import by `at`: `cards`, `reviews` (append-only), `quiz_attempts`,
`guess_attempts`, `speed_attempts`. Move cards are re-keyed `move:<epd>:<uci>` (recommended,
[../schemas/upgrades.md](../schemas/upgrades.md); v1 used `<course>:<epd>`); questions keep `quiz:<opening>:<id>`.

**Decisions for the user (stored format):**

1. **A shared attempts log**: a new table holding every try of every mode (exercise kind, card or item id, position,
   move played, grade, cost, time, help used, session id). Needed for the [tries-table](../components/tries-table.md)
   after the session, checkpoints, tests out and Play on results. Proposed; v1's three attempts tables stay readable and
   are written alongside until the log has proved itself.
2. **Checkpoint and test-out results**: rows in that log (kind `checkpoint`), or a small table of their own. They open
   gates, so they cannot be derived from move answers alone when a learner tests out.
3. **Puzzle and deviation cards** in the existing `cards` table (`puzzle:<id>`, `deviation:<source>:<game>:<ply>`): no
   new column, but `openingId`, `epd` and `expectedUci` must be filled for kinds that are not a move of an opening (see
   [puzzles](puzzles.md) and [games](games.md)).
4. **v1 progress**: carried into v2 by the one-off migration to `move:<epd>:<uci>`
   ([../schemas/upgrades.md](../schemas/upgrades.md)); any v2 opening reaching the same positions and moves picks it up.

## From v1

- `apps/web/src/data/progress-store.ts` (`useProgress`, `learnedByOpening`, `percent`).
- `apps/web/src/data/course-path.ts` (`loadCoursePath`), `features/path/unit-state.ts`, `features/play/record.ts`.
- `apps/web/src/data/training-settings.ts` (`getIntroducedToday`, `addIntroducedToday`).
- `packages/storage/src/schema.ts`: `cards`, `reviews`, `quizAttempts`, `guessAttempts`, `speedAttempts`; `transfer.ts`
  (export and import).
- core `training/scheduler.ts`, `cards.ts`, `units/progress.ts`, `units/introductions.ts`, `stats.ts`.
