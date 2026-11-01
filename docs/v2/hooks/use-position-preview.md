# usePositionPreview

Opens and places the position preview card, with a delay, one at a time across the whole page.

## Gives

- for the trigger: `open(anchor, position)` and `close()`, called by [use-move-interaction](use-move-interaction.md);
- for the card: the open position (its path, EPD and context), the anchor's rectangle, the side to place it on, whether
  it is pinned, and `pin()`, `unpin()`.

## Takes

Nothing to set up: one shared store per page. The delays come from the settings registry (`display.previewDelay`,
default 350 ms to open, 150 ms grace to close), so the card does not flash while the pointer crosses a list.

## Behaviour

- **One at a time**: opening a new card closes the last; moving from one chip to the next while a card is open switches
  at once, without the delay again.
- **Grace**: leaving the trigger starts the close timer; entering the card cancels it, so its Open in links can be
  clicked.
- **Placement**: below the anchor by default, above when there is no room, never off screen; on a phone it is a bottom
  sheet instead of a floating card.
- **Pinned** (a long press, or v1's click-to-pin in text): stays until `Esc`, the close button or a tap elsewhere.
- **Suppressed** while a piece is being dragged, while a dialog is open, and when the trigger sits in a board's panel
  whose board shows the position itself (cross-links.md, "On the nearest board").
- Respects reduced motion: no fade.

## Used by

[position-preview](../components/position-preview.md) (draws the card), through
[use-move-interaction](use-move-interaction.md) for [move-chip](../components/move-chip.md),
[map-tree](../components/map-tree.md), [position-card](../components/position-card.md); also
[idea-badge](../components/idea-badge.md) and [hint](../components/hint.md), which share the one-at-a-time rule.

## From v1

- `apps/web/src/components/board/preview.ts`: `usePreview`, a Zustand store with `epd`, `pinned`, `show`, `hide`,
  `toggle`, `clear`. v1 shows the position on a `previewable` board rather than in a card; v2 keeps that store's shape
  and adds the anchor, the delay and the card.
- shadcn `Sheet` in `components/ui` for the phone's sheet; `HoverCard` is to be added from shadcn
  ([inventory](../inventory.md)) (`npx shadcn@latest add hover-card`).
