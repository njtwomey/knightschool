# Choose tick

The tick that adds something to the learner's repertoire and takes it off again: a small circle at the end of a row.

## Shows

- An [icon-action](icon-action.md) with no fill, one of three icons: an empty circle (nothing of it chosen), a circle
  with a dot (some of its steps), a circle with a tick (all of it).
- Its meaning on hover: "Add the Giuoco Piano to my repertoire", "Add the rest of ...", "Take ... off my repertoire".

## Configuration

- `state`: `none`, `some` or `all` (core `tickState`).
- `name`: what it ticks, for the hint.
- `onToggle`.

## Behaviour

- One click, no dialog. Every step goes on when any is off, otherwise every step goes off.
- It says what is chosen and nothing else: it makes no cards and changes no progress.
- Inside a row that is a link it keeps its own click; the rest of the row still opens the row.
- Each click is undoable: `TickUndo` shows a saved [notice](notice.md) with [undo-button](undo-button.md)'s Undo, in
  view above the list without moving the rows. Undo takes back the whole click, so a variation ticked over a few steps
  goes back to those steps.
- Follow-ups have no tick: they come with the step they hang off.

## Composed of

[icon-action](icon-action.md), [hint](hint.md).

## Used by

[step-row](step-row.md), [variation-list](variation-list.md) and the Lines tab on [opening](../pages/opening.md); the
headers of [opening](../pages/opening.md) and [variation](../pages/variation.md); [repertoire](../pages/repertoire.md).
Reads and writes the `repertoire` setting ([../stores/repertoire.md](../stores/repertoire.md)).

## From v1

New. v1 enrolled a whole course at a time (`features/courses/enrol-button.tsx`).
