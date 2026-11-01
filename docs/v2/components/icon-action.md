# Icon action

A small icon button with its label as a hint: the one look of every icon button in a table, a card, a row of board
controls or a trail. Flat, with an edge and a colour change on hover.

## Shows

- The icon only (lucide), in the text colour; on hover the background tints and a ring in the primary colour shows.
- When it is a toggle and on (`pressed`), the secondary fill.
- Its label as a [hint](hint.md), after the long delay so a row of them can be swept across without a cloud of
  tooltips.

## Configuration

- `label`: what it does, as a verb ("Learn this step", "Reset to default", "Delete line"). Always given: it is the
  accessible name and the hint.
- `href` (a link) or `onClick` (a button), never both.
- `pressed`, `disabled` (with `disabledReason`, which becomes the hint: "Nothing to undo").
- `tone`: `default` or `danger` for delete (red only on hover, and it always asks first, see below).

## Behaviour

- A link is a real `<a>`: middle-click and open in new tab work.
- Inside a row that is itself a link, it keeps its own click (v1's `ABOVE_ROW_LINK`) and never opens the row.
- **Touch**: at least 40 by 40 pixels on a coarse pointer, whatever the icon size; long-press shows the label.
- A destructive action asks first in a small dialog that says what goes with it ("Delete Fried Liver and the 2 lines
  that grow from it?") and then offers Undo in a [notice](notice.md).
- Keyboard: Tab reaches it, Enter or Space activates it, focus shows a ring.

## Composed of

shadcn `Button` (size `icon-sm`), [hint](hint.md), shadcn `AlertDialog` for the ask-first.

## Used by

[settings-row](settings-row.md) (reset), [breadcrumbs](breadcrumbs.md) (previous, next), [step-row](step-row.md),
[line-row](line-row.md), [board-controls](board-controls.md), [marks-editor](marks-editor.md),
[sortable-table](sortable-table.md) rows; pages [create](../pages/create.md), [opening](../pages/opening.md).

## From v1

Keep, with one change. `components/icon-action.tsx` (`IconAction`: link or button, `pressed` via `aria-pressed`,
`pointer-coarse:size-10`, `aria-label`) deliberately has **no tooltip**, because tooltips got in the way of the next
button. v2 adds the label as a hint on a long delay.

## Open questions

- Is a 900 ms delay enough to keep v1's complaint away, or should the label show only on keyboard focus and
  long-press?
