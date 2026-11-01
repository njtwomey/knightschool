# Board eval

What the engine thinks of the position on the board: a bar beside it, and below it either one quiet strip or the
engine's best few lines.

## Shows

- **Bar**: a thin vertical bar beside the board, White's share in the light part, the score at the end nearer the side
  that is better, turned with the board.
- **Strip** (one line): the score, the best continuation as a [move-run](move-run.md), and, when the last move cost
  something, its [verdict-badge](verdict-badge.md) and [eval-words](eval-words.md) ("Black is a little better now,
  -0.6; the engine prefers 5.d4").
- **Lines** (a card): the best one to five lines, each with its score and a move-run of up to ten moves.
- Under either: where the number came from, "depth 26, baked" or "depth 14, live", and "The engine is looking…" while
  it searches.

## Configuration

- `view`: `strip` or `lines`; `bar` on or off.
- From the model: the shown position and the one before it (for the move's cost), the orientation, the reveal level.
- Settings read: `engine.on`, `engine.depth`, `engine.lines`, `engine.bakedOnly`, `feedback.evalAfter` (off, words,
  words and numbers: how the strip speaks once an exercise is answered).

## Behaviour

- Reads baked analysis first and shows it at once; asks the browser engine only for a position that is missing or
  shallower than the depth asked ([use-judgement](../hooks/use-judgement.md)). Only one search runs at a time; a new
  position stops the old one.
- Hidden entirely at the `test` reveal level, bar included, and shown at `answered` ([reveal](../patterns/reveal.md)).
  The bar keeps its space while the engine starts so the board does not narrow when the first score arrives.
- Every move in a line is a [move-chip](move-chip.md): hovering it shows that position on the board as a preview,
  clicking plays the line up to it on the board (as explored moves, in `study` and `analysis`).
- Engine off: the bar and strip are gone; the lines card says the engine is off, with a switch to turn it on.
- Error: one line saying the engine could not start, with the reason.

## Composed of

[move-run](move-run.md), [move-chip](move-chip.md), [verdict-badge](verdict-badge.md), [eval-words](eval-words.md).

## Used by

[board](board.md) on [opening](../pages/opening.md), [line](../pages/line.md), [map](../pages/map.md),
[analysis](../pages/analysis.md) (lines), and after answering on [review](../pages/review.md),
[puzzles](../pages/puzzles.md), [play-on](../pages/play-on.md).

## From v1

Keep `apps/web/src/components/engine/eval-bar.tsx`, `engine-strip.tsx` (score, best line, the engine explainer's
sentence for the last move) and `engine-lines.tsx` (several lines, baked or live), over `data/engine/store.ts` and
`data/analysis.ts`. What changes: they read the board model instead of props, hide by reveal level instead of by page,
and their moves become chips.
