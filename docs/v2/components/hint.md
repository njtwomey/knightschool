# Hint

A short explanation on anything that needs one: shown on hover or keyboard focus with a mouse, and on long-press on a
touch screen. One sentence, never the only place something important is said.

## Shows

- A small card next to the element with one or two sentences: "Threat: what the other side threatens, a trap, a pin
  against you." No title, no links, no buttons inside (a hint that needs those is a popover or a page).
- Placed below by default, flipping to stay on screen.

## Configuration

- `text`: the words. Written once where the meaning lives (the registry entry's `hint`, `MARK_MEANINGS`, the kinds'
  hover words), never retyped per page.
- `side`: where it opens, when below would cover what it explains (a board square's hint opens above).
- `delay`: the default, or `long` for [icon-action](icon-action.md) labels in dense rows.

## Behaviour

- **Mouse**: opens after about 500 ms of hover (`long`: 900 ms), closes when the pointer leaves; moving to a
  neighbouring hinted element opens it at once, without a second wait.
- **Keyboard**: opens on focus, closes on Escape or blur.
- **Touch**: long-press (500 ms) opens it and it stays until the next tap anywhere. A long-press never also clicks.
  A plain tap does what a click does ([interactions](../patterns/interactions.md)).
- One hint open at a time.
- Screen readers get the text as the element's description, not as a popup.
- A hint round a toggle overwrites the toggle's `data-state`, so toggles show the chosen item from `aria-checked` or
  `aria-pressed` (kept from v1).
- Never on a move chip or a position link: those open the [position-preview](position-preview.md) instead.

## Composed of

shadcn `Tooltip`.

## Used by

[settings-row](settings-row.md), [marks-editor](marks-editor.md), [icon-action](icon-action.md),
[breadcrumbs](breadcrumbs.md), [kind-badge](kind-badge.md), [state-badge](state-badge.md), [mark-key](mark-key.md),
[filter-toggle](filter-toggle.md), [undo-button](undo-button.md), and most other components.

## From v1

Keep, extend. `components/hint.tsx` (`Hint`, a Radix tooltip with the element as trigger) and the rule in
`components/ui/toggle.tsx` (the chosen item from `aria-checked` and `aria-pressed`). Long-press on touch is new: Radix
tooltips do not open on touch, so v1's hints are unreachable on a phone.
