# Config and settings

Two different things, kept apart.

- **Config** is how the site behaves: how it teaches, judges, schedules and times things, for everyone. It is written
  by us, committed, reviewed like content, and shipped with the site. A learner never edits it.
- **Settings** are a learner's own choices: how things look, how fast, how much at once, how much help. They live in
  the learner's browser and travel with their export ([settings.md](settings.md)).

**The test:** if changing it changes what counts as right, learned, or good teaching, it is config. If it is taste,
pace, load or comfort, it is a setting. "Two right answers before the hint arrow goes" is config; "slow the feedback
down" is a setting.

Config also says which settings exist, their default and their allowed range, and defines the presets. So a setting is
always a choice inside limits the config sets.

## Where it lives

One committed file, `content/config.yaml`, read by the build scripts and built into `config.json` for the app. An
opening may override a short, listed set of keys in its own `opening.yaml` (for example, include its rare lines,
because it is sharp). Nothing else overrides config.

Each key is marked **build** (used only by the scripts), **app** (used only in the browser) or **both**.

## What is config

| Group          | Key (proposed)                 | Default                                            | Used by | What it decides                                                                                                |
| -------------- | ------------------------------ | -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| **Teaching**   | `teach.stepMoves`              | 4                                                  | both    | about how many of your moves make a step                                                                       |
|                | `teach.stages`                 | read, watch, try, mistakes, done                   | app     | the stages of a step, in order                                                                                 |
|                | `teach.hintFadeAfterRight`     | 2                                                  | app     | right answers in a row before the Watch arrow stops showing                                                    |
|                | `teach.hintReturnAfterWrong`   | 2                                                  | app     | wrong answers before it comes back                                                                             |
|                | `teach.triesBeforeShown`       | 2                                                  | app     | wrong tries before the move is shown (v1 `WRONG_TRIES_ALLOWED`)                                                |
|                | `teach.gates`                  | on                                                 | app     | whether steps and checkpoints lock what follows                                                                |
|                | `teach.testOut`                | allowed                                            | app     | whether a gate can be passed by taking its check                                                               |
|                | `teach.firstStepOpen`          | true                                               | app     | the first step of every opening is always open                                                                 |
| **Judging**    | `judge.grades`                 | Lichess-style                                      | both    | winning-chance drops for Inaccuracy, Mistake, Blunder (0.1, 0.2, 0.3)                                          |
|                | `judge.knownRule`              | last 2 right                                       | app     | when a move counts as known (v1's "passed")                                                                    |
|                | `judge.masteredDays`           | 7                                                  | app     | FSRS interval at which a move counts as mastered (v1 "graduated")                                              |
|                | `judge.easyWithinMs`           | 5000                                               | app     | a quick right answer is Easy (v1 `EASY_WITHIN_MS`)                                                             |
| **Scheduling** | `schedule.retention`           | 0.9                                                | app     | FSRS's target, the default of the learner's setting                                                            |
|                | `schedule.maxIntervalDays`     | 365                                                | app     | longest gap between reviews                                                                                    |
|                | `schedule.newPerDay`           | 10, range 0–50                                     | app     | default and range of the learner's setting                                                                     |
|                | `schedule.sessionSize`         | 20, range 5–100                                    | app     | default and range (v1 `SESSION_SIZE`)                                                                          |
| **Timing**     | `timing.delays`                | v1's table                                         | app     | base delays: tick, cross, reply, next card (v1 `FEEDBACK_DELAYS`); the learner's speed setting multiplies them |
| **Coverage**   | `coverage.band`                | 1000–1600, blitz and rapid                         | both    | the explorer band baked into the data (v1 `EXPLORER_BAND`)                                                     |
|                | `coverage.minShare`            | 0.05                                               | both    | a reply this common must be answered, and earns cards (v1 `MIN_POPULARITY_FOR_CARD`)                           |
|                | `coverage.punishShare`         | 0.10                                               | build   | an opponent mistake this common must be punished                                                               |
|                | `coverage.punishLoss`          | 150 cp                                             | build   | ...when it loses at least this much                                                                            |
| **Puzzles**    | `puzzles.levels`               | through, after, variation, family, structure, idea | both    | match levels, strongest first (puzzles.md)                                                                     |
|                | `puzzles.perStep`              | 2                                                  | app     | puzzles offered at the end of a step                                                                           |
|                | `puzzles.select`               | rating 600–1800, popularity ≥ 80, plays ≥ 500      | build   | which puzzles are worth shipping                                                                               |
|                | `puzzles.perOpening`           | 300                                                | build   | the most shipped per opening                                                                                   |
| **Opponent**   | `opponent.playOnMoves`         | 5                                                  | app     | moves in a Play on                                                                                             |
|                | `opponent.playOnTolerance`     | Mistake                                            | app     | the worst grade allowed for a pass                                                                             |
|                | `opponent.deviationJudgeAfter` | 3                                                  | app     | moves after leaving the book before "kept or gave away your advantage"                                         |
| **Engine**     | `engine.liveDepth`             | 14                                                 | app     | browser engine depth for judgements                                                                            |
|                | `engine.bakedDepth`            | 24                                                 | build   | native analysis depth                                                                                          |
| **Lichess**    | `lichess.pauseAfter429`        | 60 s                                               | both    | the pause after being rate limited                                                                             |
|                | `lichess.cacheDays`            | 30                                                 | app     | explorer answers kept this long                                                                                |
| **Presets**    | `presets`                      | four                                               | app     | named bundles of setting values: Getting started, Club player, Exam, Relaxed                                   |
| **Settings**   | `settings`                     | the registry                                       | app     | which settings exist, with default, range and level (basic, advanced)                                          |

## What stays a setting

What the learner chooses, inside the ranges above: their band and repertoire; new moves a day and session size; review
order; desired retention (within limits); how much a wrong move explains; evaluation after answering; feedback speed;
the tries table (live, at the end, off; columns); what the computer plays in Drill; puzzle rating and who solves; board
look, notation, engine lines; accessibility; the Lichess token and username; the preset.

## Changes from settings.md

Hint fading, tries before the move is shown, the known and mastered rules, grade thresholds and the base delays move
from the settings catalogue to config. The learner keeps a speed multiplier over the delays, not the delays themselves.
