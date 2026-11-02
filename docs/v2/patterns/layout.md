# Layout

Board sizes, columns, phones and wide screens: one rule for every board and one order for the parts round it, so the
answer to what just happened is always next to the board.

## The rule

- **One width for every page**: the page column is at most `max-w-6xl` with a 16px gutter on a phone; moving between
  pages never changes the width ([page-shell](../components/page-shell.md)). The map alone uses the full screen.
- **One board size rule**, `--board-size`: as wide as its column, never wider than its cap, never taller than the screen
  less the header and controls (`--board-chrome`), never smaller than 12rem. A move never needs a scroll.

| Board                                | Cap      | How                                         |
| ------------------------------------ | -------- | ------------------------------------------- |
| The board a page is about            | 36rem    | the default (`--board-cap`)                 |
| A board beside other content         | 22rem    | `size="aside"`, `.board-aside`              |
| A thumb (cards, lists, preview card) | its card | [board-thumb](../components/board-thumb.md) |

- **Board and panel**: pages with a board column and a panel use `.board-columns`: one column on a phone and narrow
  windows, the board and its panel side by side from 64rem wide, and on a phone held sideways. The board column stays
  in view while the panel scrolls (sticky under the header), so whatever the panel points at is visible on the board.
  Built once as `components/shared/board-columns.tsx` (`<BoardColumns board={…} side="left|right">`); no page lays
  out its own board grid.
- **The order on a phone**, top to bottom: the board, its controls, the feedback (verdict, why, the note of the move),
  then the rest (move table, tries table, explorer, engine lines). The panel's own order on a wide screen is the same,
  top to bottom beside the board.
- **A phone held sideways**: the header scrolls away (`--board-chrome` drops from 11rem to 6rem) and the board sits
  beside its panel.
- **Grids never widen**: every column is `minmax(0, 1fr)` or `minmax(0, var(--board-size))`, so a long name or a wide
  table wraps or scrolls in its own box, never pushes the page past the edge.
- **Nothing moves the board**: notices, verdicts and late-arriving numbers go in the panel in reserved space, never
  above the board.
- **Touch targets** at least 40 by 40 pixels on a coarse pointer ([accessibility](accessibility.md)).
- **The map**: three columns on a wide screen (index, tree, board at the aside cap); on a phone, the tree full width
  with the index and board as sheets.
- **Navigation**: the header across the top on a wide screen; on a phone a bottom bar with Today, Learn, Practice,
  Explore and More ([navigation/menu.md](../navigation/menu.md)), kept clear of the board's controls.

## Where it applies

Every page through [page-shell](../components/page-shell.md); every board through [board](../components/board.md) and
[board-surface](../components/board-surface.md); the step, review, drill, puzzles, analysis and line editor pages most
of all.

## From v1

- `apps/web/src/index.css`: `--board-size`, `--board-cap` (36rem), `.board-aside` (22rem), `--board-chrome` (11rem, 6rem
  sideways), `.board-columns`, and the `stacked` and `short` custom variants. Kept as they are.
- `components/page.tsx` (`Page`: `max-w-6xl`, `px-4`, `minmax(0,1fr)`), kept.
- `components/board/study-board.tsx`, which applies the size to every study board.
- `features/tree/tree-explorer.tsx`: the three-column map.
- v1 has no bottom bar on a phone; the header menu collapses instead (`app/header.tsx`).
