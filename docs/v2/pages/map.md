# Map

Every line as one tree, coloured by what the learner knows, with the gaps in their repertoire and the opponent's
common mistakes drawn on it. For seeing the whole ground at once and going straight to any part of it.

## Address

`/explore/map` (every line), `/openings/<opening>/map` (one opening, its Map tab). Hash:
`#line=<line>&m=<uci.uci...>&focus=<move prefix>&layers=progress,gaps,mistakes&zoom=<n>`: the picked line, the board's
move, the subtree drawn alone, the overlays shown, the zoom ([../navigation/url-state.md](../navigation/url-state.md)).
v1's `/tree` and `/course/<id>/tree` land here.

## Reached from

**Explore** in the menu ([../navigation/menu.md](../navigation/menu.md)); the Map tab of [opening](opening.md); a
[gap-link](../components/gap-link.md) on [Today](today.md), [repertoire](repertoire.md) or [your games](your-games.md);
**See on the map** on [line](line.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Explore › Map, or Learn › opening › Map.

Three columns, full width from xl; on a phone the tree first, the board in a sheet that opens on a click.

1. Left: [map-index](../components/map-index.md), shaped like the tree: openings grouped by first two moves, a line
   under the line it grows out of; a [search-box](../components/search-box.md) at its top.
2. Middle: [map-tree](../components/map-tree.md): one column per move, one lane per line, main line across the top;
   move pills coloured by state (open, learning, known, mastered, [state-badge](../components/state-badge.md)
   colours); gaps as short dashed stubs with their share of games; the opponent's common mistakes marked where they
   happen. Zoom buttons and pinch. [map-legend](../components/map-legend.md) under it, with a
   [filter-toggle](../components/filter-toggle.md) per overlay.
3. Right: a [board](../components/board.md) in the `study` preset with [board-controls](../components/board-controls.md)
   along the picked line from the start, [move-explanation](../components/move-explanation.md) for the move (comment,
   verdict, how often played), [board-explorer](../components/board-explorer.md) and
   [mark-key](../components/mark-key.md). Under it, actions for the line through the move: **Learn**, **Try**,
   **Review**.

## Behaviour

- Only a click changes anything; hovering a pill previews its position
  ([../hooks/use-move-interaction.md](../hooks/use-move-interaction.md)). A click on a pill picks its line and moves the
  board there; a click on a line's name picks the line; the crosshair or a group's name draws only that subtree. Arrow
  keys step along the picked line ([../navigation/shortcuts.md](../navigation/shortcuts.md)).
- Progress colours come from [../hooks/use-progress.md](../hooks/use-progress.md); gaps from the shipped popularity at
  the learner's band, against the repertoire (not every line on the site: a gap is a hole in what _you_ answer).
- Clicking a gap stub shows the position with "played in 7% of games; nothing in your repertoire answers it", and
  **Find an opening that does** when another opening covers it.
- With no repertoire, the progress overlay is greyed and the gaps overlay is off, with a [hint](../components/hint.md)
  saying why.

## Leads to

**Learn** → the [step](step.md) teaching that move; **Try** → [drill](drill.md) of the line; **Review** →
[review](review.md) scoped to the line; a line's name → [line](line.md); a gap → [search](search.md) or
[opening](opening.md) for an opening that answers it.

## From v1

`features/tree` (`tree-explorer.tsx`, `lane-tree.tsx`, `tree-index.tsx`, `index-model.ts`, `tree-board.tsx`,
`course-tree-page.tsx`, `curriculum-tree-page.tsx`). Verdict: **repurpose**: the layout stays; progress, gaps and
mistakes are new overlays.
