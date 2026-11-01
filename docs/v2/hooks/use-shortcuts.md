# useShortcuts

Registers a page's or a board's keys: one owner per key, never while typing, listed for `?`.

## Gives

Nothing to render. While the component is mounted its keys work; when it unmounts they stop. A separate reader,
`useShortcutList()`, gives every key currently registered with its label, for the `?` dialog.

## Takes

A list of keys, each with:

- the key (`ArrowLeft`, `f`, `?`, or a sequence such as `g t`), and whether Shift is part of it;
- a label for the list ("Flip the board");
- a handler, and optionally `when` (a condition such as "a miss is up");
- a scope: `global`, `page` or `board`.

## Behaviour

- **Never while typing**: no key fires when focus is in an input, a text area, a select or anything editable.
- **Never with a modifier**: Ctrl, Alt and Meta always go to the browser; Shift only when the key declares it.
- **Handled keys are left alone**: if a menu, radio group or dialog already handled the key, nothing fires.
- **One owner per key**: within a scope, a second registration of the same key is an error in development and ignored
  in production. A narrower scope wins over a wider one (a board's `f` over a page's), so the order is board, page,
  global.
- Only one board per page registers board keys (the one given `keys`).
- `Esc` always closes the topmost preview, menu or dialog first; it never leaves a session.

The keys themselves are in [shortcuts](../navigation/shortcuts.md).

## Used by

[use-board-model](use-board-model.md) (arrows, `Home`, `End`, `f`), [board-controls](../components/board-controls.md)
(`h`, `r`), [exercise-panel](../components/exercise-panel.md) (`Enter` for Next),
[page-shell](../components/page-shell.md) (`?`, `/`, `g` sequences), [map-tree](../components/map-tree.md),
[position-preview](../components/position-preview.md) (`Esc`); pages [step](../pages/step.md),
[map](../pages/map.md), [board](../pages/board.md), [search](../pages/search.md),
[line-editor](../pages/line-editor.md).

## From v1

- `apps/web/src/components/board/line-stepper.ts`: `isTyping`, `stepKey` (no modifier, not already handled, not
  typing), and the rule that one stepper per page has `keys`. v2 takes those rules for every key.
