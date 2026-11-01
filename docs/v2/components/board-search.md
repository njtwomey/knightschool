# Board search

Search by setting up a position on a board: every line that passes through it, transpositions included.

## Shows

- A [board](board.md) in the `analysis` preset, starting from the initial position (or the position the learner was
  looking at), with the moves played so far as a [move-run](move-run.md) above it and step buttons.
- A [filter-toggle](filter-toggle.md) for what to find: Lines and traps, Lines, Traps.
- Results under the board as it changes: "4 lines pass through this position", each as a small
  [line-row](line-row.md) card naming its opening, and the next move each line plays from here as a
  [move-chip](move-chip.md) arrow on the board.
- When the position was reached by a different move order from a line's: "Reached by transposition: the line plays
  1.d4 d5 2.c4 e6 3.Nc3, you played 1.c4 e6 2.Nc3 d5 3.d4".
- The position's name, when it has one ([opening-name](opening-name.md)), and what players at the band play here
  ([board-explorer](board-explorer.md), folded).
- **Set up a position** (pieces placed by hand, or a FEN pasted) as a second way in.

## Configuration

- `form`: `dialog` (from the search box) or `panel` (inside the search page or the analysis page).
- `start`: a position or moves to begin from.
- Reads `board.notation`, and `level.band` for the folded explorer.

## Behaviour

- Play moves on the board; results update after each move. Step back with the step buttons or arrow keys and results
  follow the cursor.
- Click a result: opens that line at this position (the line page, its board at this ply). Click a next-move arrow or
  chip: plays it.
- Hover a result: its next move is highlighted on the board.
- No line passes through: "No line here. The nearest: 3 lines reach this position one move earlier" with a button to
  step back to it, and "Analyse it" ([analysis](../pages/analysis.md)).
- Only legal positions count; a pasted FEN that is illegal says why and is not searched.
- The moves and the filter are kept in the address hash, so a shared search opens on the same position.
- Covers shipped and authored openings alike.

## Composed of

[board](board.md), [move-run](move-run.md), [move-chip](move-chip.md), [filter-toggle](filter-toggle.md),
[line-row](line-row.md), [opening-name](opening-name.md), [board-explorer](board-explorer.md),
[empty-state](empty-state.md).

## Used by

[search](../pages/search.md), [search-box](search-box.md) (its button), [analysis](../pages/analysis.md) ("Find lines
through this position").

## From v1

Keep. `apps/web/src/features/search/board-search.tsx` (a modal with a StudyBoard, the moves, a kind filter of lines,
traps or both, matching lines by position) over `apps/web/src/features/search/board-query.ts` and `searchAt` in
`packages/core/src/search/position-search.ts` (positions keyed by EPD, so transpositions match). v2 adds the
transposition note, next-move arrows, setting up by hand, and authored openings, which v1's `search.json` leaves out.
