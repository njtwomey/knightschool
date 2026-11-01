# useMoveInteraction

Hover, focus, click and long-press on a move anywhere: light it on the board, open the preview, go there; the same for
a chip, a table row or a map pill.

## Gives

- **props** to spread on the element: pointer enter and leave, focus and blur, click, long press on touch, key handling
  (`Enter`, `Space`), `href` when the move has an address, and the accessible name ("3...Nf6, Two Knights Defense");
- **state**: whether this move is the one hovered anywhere (so the same move highlights in the table, on the map and in
  the text at once), whether it is the board's current move, and whether it is hidden by the reveal level.

A sketch: `const { props, hovered, current } = useMoveInteraction({ path, line })`.

## Takes

- the move: the path of UCI moves up to and including it (from the start, so transpositions resolve by EPD), or the
  position before it plus the move;
- optional context: the line, opening or step it is shown in (decides the address and the "Open in" list), and whether
  a click should move the nearest board rather than navigate.

## Behaviour

Rules from [interactions](../patterns/interactions.md) and [cross-links](../navigation/cross-links.md):

- **Hover or focus**: marks the move as hovered in a small shared store; the nearest board draws it as a ghost arrow,
  then [use-position-preview](use-position-preview.md) opens the card after its delay.
- **Click**: inside a board whose source holds the move, moves that board's cursor; otherwise follows `href`. Modifier
  and middle clicks are left to the browser.
- **Long press** (touch): opens the preview pinned; the click that follows is swallowed.
- **Reveal**: when the nearest board is at `test` and the move lies ahead of the cursor, the hook gives no href, no
  hover and no preview, and the element renders as plain text.

## Used by

[move-chip](../components/move-chip.md), [move-run](../components/move-run.md),
[move-table](../components/move-table.md), [tries-table](../components/tries-table.md) rows,
[map-tree](../components/map-tree.md) pills, [line-row](../components/line-row.md),
[position-card](../components/position-card.md), [rich-text](../components/rich-text.md),
[board-explorer](../components/board-explorer.md) rows; pages [line](../pages/line.md), [map](../pages/map.md),
[step](../pages/step.md), [idea](../pages/idea.md), [search](../pages/search.md).

## From v1

- `apps/web/src/components/rich-text.tsx` with `components/board/preview.ts` (`show` on hover, `hide` on leave,
  `toggle` to pin on click): the pattern, for text only.
- `apps/web/src/features/tree/lane-tree.tsx`: pills picked by click, `Enter` or `Space`.
- `apps/web/src/components/move-list.tsx`: moves as steps that move the board. Three behaviours become one.
