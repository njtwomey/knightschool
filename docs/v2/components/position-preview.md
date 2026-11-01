# Position preview

The hover card: a small board of a position with its name, opened from any move chip, position link or position in a
list when there is no board nearby to show it on.

## Shows

A floating card about 15rem wide:

- a [board-thumb](board-thumb.md) of the position, the move that reached it tinted, turned to the learner's side;
- the move that reached it ("after 5.d4") and the [opening-name](opening-name.md) of the deepest named position;
- in study contexts: [eval-words](eval-words.md) from baked analysis ("about equal, +0.2") and how often players at the
  learner's band reach it ("12% of games");
- the learner's state for the move here when it is in their repertoire ([state-badge](state-badge.md));
- a footer link, "Open", to the [line](../pages/line.md) or [board](../pages/board.md) page at that position.

## Configuration

- `position`: an EPD, with the move that reached it and the context it was opened from (an opening, a line).
- `detail`: `board` (the thumb and name only) or `full` (with eval, share and state).
- Settings read: `display.previews` (off: chips never open the card), `board.theme`, `board.pieces`.

## Behaviour

- Opened and placed by [use-position-preview](../hooks/use-position-preview.md): after a short hover delay (about 300
  ms), beside the trigger and kept on screen; one at a time, the new replacing the old with no delay when moving along a
  run of chips.
- Stays open while the pointer moves into it, so its link can be clicked; closes on leaving both, on Escape, or on
  scrolling.
- Touch: long-press opens it; a tap outside closes it.
- Not opened when the nearest [board](board.md) can show the position itself (the board preview wins; two pictures of
  one position is redundant), and never for a position later than the move being asked in a test
  ([reveal](../patterns/reveal.md)).
- Loading: the thumb draws at once; eval and share fill in when known, with no layout jump.
- For screen readers the card's text is the trigger's description; the thumb is hidden.

## Composed of

[board-thumb](board-thumb.md), [opening-name](opening-name.md), [eval-words](eval-words.md),
[state-badge](state-badge.md), shadcn `HoverCard` (to add from shadcn, [inventory](../inventory.md); v1 has `Popover`
and `Tooltip`).

## Used by

[move-chip](move-chip.md), [move-run](move-run.md), [rich-text](rich-text.md), [tries-table](tries-table.md),
[map-tree](map-tree.md) pills, [line-row](line-row.md), [search-box](search-box.md) results.

## From v1

New. v1 previews positions only by replacing the nearest board's position (`apps/web/src/components/board/preview.ts`,
`previewable` in `board/app-board.tsx`, triggered by `components/rich-text.tsx`). The card is for the many places with
no board beside them.
