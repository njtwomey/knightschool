# Map legend

What the map's colours and marks mean, listing only what the map is drawing now, with each overlay's switch.

## Shows

- One section per overlay that is on, each with a switch to turn it off and a sample of what it draws:
  - **Progress**: four filled pill samples, Open, Learning, Known, Mastered, with a count of the learner's moves in
    each for the lines in view ("Known 31");
  - **Gaps**: a dashed stub, "A reply players at your level make that you do not answer yet; thicker means more games",
    with the band and the target ("At 1000 to 1600, replies in at least 1 game in 20");
  - **Their mistakes**: the marker, "A common mistake by your opponent; a tick when you have practised the
    punishment";
  - **Coverage**: thin and thick lane samples, "Thicker lanes are reached in more games";
  - **Puzzles**: the puzzle mark, "Puzzles from games that passed through here";
  - **Lines**: the lane colours of the lines in view, by name, when that overlay is on.
- Overlays that are off are listed below, collapsed, each with its switch ("Show gaps").
- Bold and regular pills: "Bold moves are yours".

## Configuration

- `overlays`: which are available and which are on; `onToggle`.
- `counts`: the per-state counts for the lines in view, from [use-progress](../hooks/use-progress.md).
- `placement`: `corner` (a small folded panel over the map, wide screens) or `below` (under the map, phones).
- Reads `level.band` and `level.coverageTarget` for the gaps wording.

## Behaviour

- Toggling an overlay redraws the map at once and is kept in the address hash, so a shared map shows the same
  overlays ([use-hash-state](../hooks/use-hash-state.md)).
- Hover a sample: the map's pills in that state pulse once (no pulse under reduced motion); click a state's count:
  the map dims everything else until clicked again. These never change the picked line.
- Folded by default in `corner` placement after the first visit (remembered per device); open on the first visit.
- Every colour comes from [colours](../patterns/colours.md), and the same samples are used in
  [state-badge](state-badge.md), so the legend is never the only place a meaning is explained.

## Composed of

[state-badge](state-badge.md) (dot samples), [verdict-badge](verdict-badge.md) (mistake marker), [hint](hint.md),
shadcn `Switch` and `Collapsible`.

## Used by

[map-tree](map-tree.md), [map](../pages/map.md), [opening](../pages/opening.md) (its tree tab),
[repertoire](../pages/repertoire.md) (the side's map).

## From v1

New. The closest in v1 is `apps/web/src/components/tags/tag-legend.tsx` (`TagLegend`, the key to line tags on the
course page). v1's tree has no legend: lanes are only line colours (`apps/web/src/features/tree/colours.ts`).
