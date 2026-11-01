# Board explorer

What players at the learner's level play from the position on the board: how often, how those games went, and how good
each move is.

## Shows

A panel titled "What players at 1000 to 1600 play here" (the band from the learner's level), with one row per move,
most played first, up to six and a "More" to show the rest:

- the move as a [move-chip](move-chip.md);
- its share of games as a number and a thin bar;
- the results as a three-part bar (White wins, draws, Black wins) with the game count on hover;
- its [verdict-badge](verdict-badge.md) from the judgement;
- a book mark on the opening's own move, and "not covered" on a common reply the opening does not answer yet (a gap,
  linking to [gap-link](gap-link.md)).

Under the rows: how many games reach the position, and whether the numbers are baked or live from Lichess.

## Configuration

- From the model: the shown position, the opening (for the book move and gaps), the reveal level.
- `onPlay`: whether clicking a move plays it on the board (study and analysis) or only shows it.
- Settings read: `level.band`, `lichess.token` (secret store), `explorer.minShare` (rows below it folded under More).

## Behaviour

- Baked popularity first, so the 1000 to 1600 band works with no token and offline; another band, or a position the
  bake does not have, asks the live explorer with the learner's token ([use-explorer](../hooks/use-explorer.md)).
- Hover a row: the move is drawn as a candidate system arrow on the board. Click: the move is played as an explored
  move, and the panel follows to the new position. Long-press on touch shows the arrow; tap plays.
- Only the answer for the shown position is ever drawn: a slow reply for an earlier position is dropped.
- Hidden at the `learn` and `test` reveal levels ([reveal](../patterns/reveal.md)).
- States: "Asking Lichess…" while loading; "No games reach this position at 1000 to 1600"; a Lichess error in one
  line; no token and no baked data: a short note with a link to add a token in [settings](../pages/settings.md).

## Composed of

[move-chip](move-chip.md), [verdict-badge](verdict-badge.md), [empty-state](empty-state.md).

## Used by

[board](board.md) on [board](../pages/board.md), [map](../pages/map.md), [opening](../pages/opening.md),
[line](../pages/line.md), and after answering in [review](../pages/review.md) and [puzzles](../pages/puzzles.md).

## From v1

Repurpose `apps/web/src/features/explorer/explorer-panel.tsx` (moves, shares, results, `onPlay`; shown only with a
token) and `features/explorer/service.ts` over storage's `ExplorerCache`. New: baked numbers first, the band from the
learner's level, the verdict per move, book and gap marks, hover arrows.
