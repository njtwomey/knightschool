# Board

A raw board: set up any position or play moves, and see what the engine thinks. Nothing to learn, nothing graded,
nothing to configure first. It replaces v1's Lab, and is where every "Open on the board" link lands.

## Address

`/board`. Hash: `#fen=<start>&m=<moves played>&ply=<n>&side=white|black`, so a link shares exactly this position and
these moves ([../navigation/url-state.md](../navigation/url-state.md)). v1's `/lab` and its hash land here.

## Reached from

**Explore** › Board in the menu; "Open on the board" on any [position-preview](../components/position-preview.md),
[line](line.md), [puzzles](puzzles.md), [play-on](play-on.md) and [your games](your-games.md).

## Layout

The board and one panel (`.board-columns`; stacked on a phone).

1. **The board**, [board](../components/board.md) in the `analysis` preset: the [eval bar](../components/board-eval.md)
   beside it, and one control row: flip, [step-buttons](../components/step-buttons.md), **Set up**, **Paste**, **Copy**,
   **Clear**.
2. **The panel**, top to bottom:
   - **The engine**: the evaluation in words and numbers ([eval-words](../components/eval-words.md)), the depth reached,
     and the best three lines, each as a [move-run](../components/move-run.md); click a line's first move to play it,
     hover a move to see it on the board.
   - **The moves** played, as a [move-table](../components/move-table.md); side lines kept when you go back and play
     something else.
   - **More**, folded away until opened: what players at your band play here
     ([board-explorer](../components/board-explorer.md)), what is going on in the position
     ([position-features](../components/position-features.md)), and lines in your openings that pass through it
     ([position-card](../components/position-card.md)s).

## Behaviour

- The engine starts as soon as a position is shown and keeps searching deeper, updating the bar and the lines as it
  goes; a new position stops it and starts again (the engine's continuous analysis,
  [../library/engine.md](../library/engine.md)). One search at a time, single-threaded Stockfish in a worker, as in v1.
- **Set up**: drag pieces on and off from two trays, choose the side to move and castling rights; an illegal position
  says why and keeps the engine off until it is fixed.
- **Paste**: a FEN or a PGN. A PGN that breaks says where ("move 12: Nf3 is not legal here") and keeps the moves before.
- **Copy**: the FEN, the PGN, or the link.
- Arrow keys step through the moves; right-drag draws arrows and rings for this view only, never saved.
- Engine switched off in settings: the bar and lines hide, with a [setting-inline](../components/setting-inline.md) to
  turn it on. Number of lines (1 to 5) and the depth cap are settings.
- Nothing is recorded and there is no tries table.

## Leads to

A position card → [line](line.md) or [map](map.md); **Search this position** → [search](search.md); **Write a line from
here** → [create](create.md).

## From v1

`features/lab` (`lab-page.tsx`, `setup-card.tsx`, `load-card.tsx`, `copy-card.tsx`, `setup-tool.ts`),
`components/engine/` (bar, strip, lines), `data/engine/`. Verdict: **repurpose**, made simpler: the engine runs
continuously and the board is the page.
