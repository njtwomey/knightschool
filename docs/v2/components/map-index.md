# Map index

The list of lines beside the map, shaped like the tree: each line under the line it grows out of, grouped by first
moves, with a box to find a line by name.

## Shows

- A search box at the top ("Find a line").
- Groups when the map holds several openings: by the first two moves ("1.e4 e5", "1.e4 c6", "1.d4 d5"), each with its
  name and a count. One opening shows no group headings.
- Each line as an entry: a fold arrow when lines grow out of it, a colour dot in its lane colour, its name, a small
  [kind-badge](kind-badge.md), and, with the Progress overlay on, a tiny share-known bar.
- Entries indented under the line they grow out of within the group; a line that branches off another group's line
  starts its own branch.
- A crosshair on hover beside each line: draw only its subtree.
- At the foot: **Show all** (undo a subtree) and **Open all** (unfold everything).

## Configuration

- `lines`, the lane layout's parents, and the grouping (`byFirstMoves` or none).
- `picked`, `subtree`, `folded`; `onPick`, `onZoom` (the crosshair), `onFold`.
- `search`: on for the full map, off when only a few lines are shown.
- Reads `level.includeRare` (rare lines listed greyed, or hidden).

## Behaviour

- Click a line's name: picks it on the map, scrolls the map to where it starts and puts its first own move on the
  board.
- Click the fold arrow: folds or unfolds what grows from the line, in the index and on the map together (what the index
  puts under a line is exactly what folding hides). Folding only tidies; it never removes a line from the map's
  coverage or progress.
- Click the crosshair, or a group's name: the map draws only that subtree.
- Typing in the box filters by name and by the opening a line is seen in, forgivingly ([search-box](search-box.md)'s
  matcher); matches are listed flat with their group named, and Enter picks the first.
- Hover an entry: the line's [line-row](line-row.md) card as a hover card, with its moves.
- Keyboard: Up and Down move, Right unfolds, Left folds or goes to the parent, Enter picks
  ([use-shortcuts](../hooks/use-shortcuts.md), only while the index has focus).
- On a phone the index sits under the board as a collapsible list, open on first visit, limited to half the screen.
- Fold state and the subtree are kept in the address hash ([use-hash-state](../hooks/use-hash-state.md)).

## Composed of

[search-box](search-box.md) (compact), [kind-badge](kind-badge.md), [line-row](line-row.md) (hover card),
[icon-action](icon-action.md) (crosshair, fold), [empty-state](empty-state.md) (no line matches).

## Used by

[map](../pages/map.md), [opening](../pages/opening.md) (its tree tab), [line](../pages/line.md) (the line's
neighbourhood); always beside [map-tree](map-tree.md).

## From v1

Keep. `apps/web/src/features/tree/tree-index.tsx` (`TreeIndex`: groups, lines under their parents, fold, crosshair,
search with `matchesText`, Show all and Open all) over `indexModel` in `apps/web/src/features/tree/index-model.ts`
(grouping and the parent of each line from the lane layout's `parentOf`). v2 adds kind badges, the share-known bar and
the hover card.
