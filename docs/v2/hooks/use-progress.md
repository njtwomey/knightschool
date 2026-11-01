# useProgress

The state of a move, step, variation, opening or the repertoire, derived from the learner's answers, never stored.

## Gives

For the piece asked about:

- **state**: locked, open, learning, known, mastered, for a move, a step or a variation (a variation is known when its
  checkpoint is cleared); an opening gives its percent and whether its final test is cleared; and
  so on, per the table in model.md ("Progress, per piece");
- **counts**: moves open, learning, known, mastered; due today; for an opening also the mode counts ("Learn 12/40,
  Review 6 due, Puzzles 3/15");
- **percent** known and mastered, for a [progress-ring](../components/progress-ring.md);
- **why locked**: the step or checkpoint that opens it;
- **coverage** for the repertoire: the share of games at the band that stay inside what is known by move 5, 10, 15.

A sketch: `const { state, counts, lockedBy } = useProgress({ step: 'italian:3' })`.

## Takes

One reference: a move (opening and EPD), a step, a variation, an opening, an idea or the repertoire.

## Behaviour

- Reads cards, reviews and attempts from the [progress store](../stores/progress.md) and the opening's cut path from
  the [catalog](../stores/catalog.md), and works the state out with core's rules (v1's `unitProgress`: known when
  every move's last two answers were good or easy, mastered when every card is in review at seven days or more).
- Recomputes when the store says an answer was recorded for that opening; nothing else triggers it.
- Before the database is open it gives `ready: false` and no state, so a page shows a skeleton rather than "locked".
- Applies the gates (config `teach.gates`, and the learner setting `learning.gatesRelaxed`): with gates off, nothing
  reports locked; with "advise only" or relaxed, locked steps open with a note.

## Used by

[state-badge](../components/state-badge.md), [progress-ring](../components/progress-ring.md),
[mode-counts](../components/mode-counts.md), [coverage-meter](../components/coverage-meter.md),
[step-row](../components/step-row.md), [variation-list](../components/variation-list.md),
[opening-card](../components/opening-card.md), [next-action](../components/next-action.md),
[due-card](../components/due-card.md), [map-tree](../components/map-tree.md) (moves coloured by state); pages
[today](../pages/today.md), [repertoire](../pages/repertoire.md), [opening](../pages/opening.md),
[variation](../pages/variation.md), [step](../pages/step.md), [idea](../pages/idea.md).

## From v1

- `apps/web/src/data/course-path.ts` (`loadCoursePath`, `isPassed`): units with state from cards and reviews.
- `apps/web/src/data/progress-store.ts` (`useProgress`, `learnedByOpening`, `percent`): the course list's percent.
- `apps/web/src/features/path/unit-state.ts`, core `training/units/progress.ts` (`unitProgress`).
