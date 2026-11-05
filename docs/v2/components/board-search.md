# Board search

Search with an opening: play (or set up) its moves on a board and find every opening and line that passes through
that position, transpositions included. v1's board search, kept as it is.

## Shows

- A [board](board.md), starting from the initial position (or the position the learner was looking at), with the
  moves played so far as a [move-run](move-run.md) above it and step buttons, as v1's modal has.
- A [filter-toggle](filter-toggle.md) for what to find: Lines and traps, Lines, Traps (v1's kind filter, hash `bk`).
- Results beside the board as it changes: the position's name, the moves the lines play next with how many lines play
  each (and as arrows on the board, as in v1), then "4 lines pass through this position", each as a small card naming
  its opening and what it continues to. A line reached by another move order matches too, because positions are keyed by
  EPD. In the dialog the board stays put and the results scroll on their own.

## Configuration

- `form`: `dialog` (from the search box, as v1) or `panel` (inside the [board](../pages/board.md) page).
- `start`: a position or moves to begin from.
- Reads `board.notation`.

## Behaviour

- Play moves on the board; results update after each move. Step back with the step buttons or arrow keys and results
  follow the cursor.
- Hover a result: the board shows where the line leads. Hover a move of what it continues to: that exact position; click
  it to play the line up to there. Leaving goes back to the searched position, and stepping beats a hover.
- Click a result: opens that line at this position (the line page, its board at this ply).
- No line passes through: [empty-state](empty-state.md) "No line here", with "Open on the board"
  ([board](../pages/board.md)).
- The moves and the filter are kept in the address hash (`bm`, `bk`), so a refresh or a shared search opens on the
  same position, exactly as in v1 ([../navigation/url-state.md](../navigation/url-state.md)).
- Covers shipped and authored openings alike: the one addition to how it works.

## Composed of

[board](board.md), [move-run](move-run.md), [filter-toggle](filter-toggle.md), [line-row](line-row.md),
[empty-state](empty-state.md).

## Used by

[search](../pages/search.md), [search-box](search-box.md) (its button), [board](../pages/board.md) ("Find lines
through this position").

## From v1

**Keep**, behaviour unchanged. `apps/web/src/features/search/board-search.tsx` (a modal with a StudyBoard, the moves, a
kind filter of lines, traps or both, matching lines by position) over `apps/web/src/features/search/board-query.ts`
and `searchAt` in `packages/core/src/search/position-search.ts` (positions keyed by EPD, so transpositions match), and
`search.json` (position to lines). v2 adds only authored openings to the results, which v1's `search.json` leaves out.
Ideas for later, none of which changes how a search works: a note when a result was reached by transposition, the next
move of each line as an arrow, and setting up a position by hand.
