# puzzles

The Lichess puzzles shipped for the openings, matched to their positions, and the learner's puzzle cards.

## Holds

- **selections** per opening, loaded when first needed: each puzzle's id, start FEN, solution, rating, themes, the
  position it was matched at and the level of the match (through the position, after the line, named variation,
  family, structure, idea; puzzles.md);
- an **index by position** across the loaded selections, so a step, a line's end or an idea asks "which puzzles here";
- the learner's **puzzle cards and results**, read from [progress](progress.md);
- the current **filter** from [settings](settings.md): rating range, who solves, match levels, themes, how many per
  step.

## Written by

Its loader (from `public/content/puzzles/<opening>.json`); [progress](progress.md) when a puzzle is answered; the
[puzzle-picker](../components/puzzle-picker.md) in Create writes picks to the [authoring](authoring.md) store, not
here.

## Read by

[puzzles](../pages/puzzles.md) (the Puzzles mode), [today](../pages/today.md) (a puzzle from your openings),
[step](../pages/step.md) (after Done), [checkpoint](../pages/checkpoint.md), [idea](../pages/idea.md),
[puzzle-card](../components/puzzle-card.md), [mode-counts](../components/mode-counts.md) ("Puzzles 3/15"),
[position-preview](../components/position-preview.md) (puzzles here), the [session](session.md) building a queue.

## Persists

- Selections: shipped JSON (about 40 KB per opening), service-worker cached, not exported.
- Answers: through [progress](progress.md).

**Decision for the user (stored format):** puzzle cards in the existing `cards` table with id `puzzle:<id>`, as quiz
cards already are (capabilities.md 4). The columns fit if `epd` is the position the learner moves in, `expectedUci`
the first solution move, and `openingId` the opening it was first met in. A puzzle attached to several openings would
then count toward one only; the alternative is a pseudo-opening id `puzzles`. Answers go to `reviews` (which takes any
card id), and every try to the attempts log once agreed ([progress](progress.md)).

## From v1

New. Nearest in v1: quiz cards (`quiz:<opening>:<id>` in `cards`, answers in `quiz_attempts`), core `training/cards.ts`,
and the content build's per-opening JSON (`scripts/content-emit.ts`). The maintainer jobs (index, name, expand,
select, look up) are in puzzles.md.

## Open questions

1. Should Practice offer puzzles not yet met as new cards each day (like moves, with their own daily limit), or only
   review puzzles already solved once?
