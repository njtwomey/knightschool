# training

Learning over time: grading an answer, FSRS scheduling, cards of every kind, weighting, steps, the one set of
states, gates, coverage and stats; every state worked out from the answer log.

## Gives

- **Grading and scheduling**: `autoGrade(attempt) → again | hard | good | easy`; `createScheduler(config)`, `newCard`,
  `scheduleReview(card, rating, now)` over ts-fsrs; `recordAnswer` (the new schedule plus the review row, together).
- **Cards**: `cardId` for every kind: move `move:<epd>:<uci>` (v1's `<course>:<epd>` re-keyed once,
  [../schemas/upgrades.md](../schemas/upgrades.md)), question `quiz:<opening>:<id>`, puzzle `puzzle:<id>`, deviation
  `deviation:<source>:<game>:<ply>`; `cardDefinitions`, `planIntroductions`, `planSession`, `freePractice` (never
  saved), `dormantCards` (no opening teaches them); weighting by `practiceWeight`, `pickWeighted`, `decidingIndex`.
- **Steps** (v1 units): `openingSteps(opening, options) → Step[]`, the automatic cut plus the opening's `steps:`
  overrides; `stepStretches`; `attachExtras` (traps, questions, puzzles, Play on positions).
- **States**: `stateOf(item, log, config) → locked | open | learning | known | mastered` for moves, steps, variations;
  `openingProgress` (known and mastered shares, final test); `ideaProgress`. **Gates**: `isOpen(item, states)`.
- **Coverage**: `coverage(repertoire, counts) → { byMove5, byMove10, byMove15 }`; `gaps`, the commonest replies not
  answered. **Stats**: `dailyCounts`, `streak`, `accuracy`, `mostMissed`, `isRecalled`, the calendar's days.

## Takes

[tree](tree.md), [exercise](exercise.md), [lichess-data](lichess-data.md), [settings](settings.md), `ts-fsrs`; cards and
the log from storage, through the web app.

## Rules

- **Grades** (v1): right, no hint, within `judge.easyWithinMs` (5 s) Easy; right Good; after a hint or a wrong try
  Hard; shown, Again. FSRS targets `schedule.retention` (0.9), never past `schedule.maxIntervalDays` (365).
- **New cards** come at the start of a review session, up to `schedule.newPerDay` (10), in step order, taking turns
  between repertoire openings; due cards are never limited. A session holds `schedule.sessionSize` (20); the next
  action puts review first at `schedule.reviewsFirstAt` (5) due.
- **Which positions earn cards** (v1 `cardDefinitions`): main and gambit lines; sidelines reached by at least
  `coverage.minShare` (5%) of games; rare lines only when the learner includes them; traps to avoid; never
  alternatives, traps to spring (exercises) or a position after the learner's own mistake.
- **One set of states** (model.md): a move is **known** when its last two answers were Good or Easy
  (`judge.knownRule`), **mastered** at an FSRS interval of `judge.masteredDays` (7) or more; a step is known or
  mastered when all its moves are; a variation is known when its checkpoint is cleared (`teach.checkpointMark`),
  mastered when every step is. Learning once a card exists; otherwise open or locked.
- **Gates** (`teach.gates`, strict): a step opens when the step it grows from is known (the first always,
  `teach.firstStepOpen`); a checkpoint when its steps are known; the next variation when the checkpoint is cleared;
  the final test when every variation is known. `teach.testOut` lets a check open a gate; `learning.gatesRelaxed`
  turns locks into "suggested later".
- **The cut** (v1 `courseUnits`): the first line's main line, then branch after branch (most important kind, most
  popular, shallowest), in runs of about `teach.stepMoves` (4), cut where another branch leaves. Steps hold no
  progress, so a recut loses nothing.
- **Coverage** counts a reply as answered when the opening has a move after it, leaving out replies under
  `coverage.minShare`. **States are derived, never stored**: a config change needs no migration.

## Used by

[exercise](exercise.md); [use-progress](../hooks/use-progress.md); [progress](../stores/progress.md),
[session](../stores/session.md), [repertoire](../stores/repertoire.md) stores; [step-row](../components/step-row.md),
[state-badge](../components/state-badge.md), [progress-ring](../components/progress-ring.md),
[coverage-meter](../components/coverage-meter.md), [gap-link](../components/gap-link.md),
[streak](../components/streak.md), [activity-calendar](../components/activity-calendar.md),
[next-action](../components/next-action.md); pages [today](../pages/today.md), [opening](../pages/opening.md),
[variation](../pages/variation.md), [step](../pages/step.md), [review](../pages/review.md), [stats](../pages/stats.md);
scripts `content-build.ts`, `gaps.ts`.

## From v1

`packages/core/src/training/grading.ts`, `scheduler.ts`, `sampling.ts`, `stats.ts`: **keep**. `cards.ts`, `units/`:
**repurpose** (move cards re-keyed, new kinds; units as steps). `search/progress.ts`, `scripts/gaps.ts`: **repurpose**
into progress, the next action and coverage. Variation states, gates, ideas: **new**.

## Tests

Existing `cards`, `sampling`, `stats`, `units` tests stay. New: every card id; each state at config's edges; gates
strict, relaxed, tested out; coverage on a small tree; turns between openings; states independent of log order.
