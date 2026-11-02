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

## As built

Not a separate hook yet: the behaviour lives in [move-chip](../components/move-chip.md) and the board, through
`components/board/key-owner.ts`.

- Every `Board` that can step or flip registers with the page. The page's main board is one that asks (`keys`), else
  the first on the page. It owns the arrow keys and F with no click first, and it is the board that moves elsewhere on
  the page act on. A board's caption reaches its own board first (`BoardTargetContext`).
- A `MoveChip` with no `onSelect` of its own uses `useBoardTarget()`. Hover or focus shows the position after the move on
  that board until the pointer leaves (no preview card when the page has a board: the board is the preview); a chip with
  no position draws the move as a `preview` system arrow. A click goes to the position after it: the board's cursor if the board holds that position,
  otherwise the board shows it (not playable) with **Back to the line** until the learner steps or goes back.
- A move chip always sits above a card's or row's stretched click (`ABOVE_ROW_LINK`), so a chip inside a clickable
  step row still hovers and clicks as a move.
- Not yet built: the shared "hovered anywhere" store (the same move lit in the table, map and text at once), and
  long-press.
