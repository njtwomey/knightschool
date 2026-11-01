# Undo button

Takes back the last change, and says which: "Undo: delete line 2...Bc5", "Undo: New moves a day 15". The one way to
take something back in Create and in Settings, where everything saves as you go.

## Shows

- A button with the undo icon and the action's name, cut at about 40 characters with the rest on [hint](hint.md).
- Disabled when there is nothing to take back, with the hint "Nothing to undo".
- In a [notice](notice.md) after a change ("Line deleted. Undo"), the same button in small.

## Configuration

- `history`: which history it takes back: `authoring` (Create) or `settings`.
- `size`: `default` (a page's header) or `sm` (inside a notice).

## Behaviour

- **One click takes back one action**, however many rows it changed: an import of four lines, a path reordered, a
  preset picked with your changes cleared. The button then names the action before it.
- **Named after the action.** Each save stores a short label ("reorder the path", "rename step 3"); for an older
  action with no label, the name is worked out from what changed (v1's `describeUndo` fallback).
- **Only this device's actions.** History groups that arrived with an import are never undone (v1's
  `authoringImportedGroups`), and the button skips them.
- **Undo is itself recorded**, so nothing is lost: an undo is a history group with `undoOf`. A second click takes back
  the next action, not the undo; there is no redo (an open question).
- **Ctrl+Z / Cmd+Z** when focus is not in a text field, and only on pages that show the button
  ([use-shortcuts](../hooks/use-shortcuts.md)). In a text field the browser's own undo applies.
- After an undo, a [notice](notice.md): "Took back: delete line 2...Bc5".

## Composed of

shadcn `Button`, [hint](hint.md).

## Used by

[notice](notice.md), [settings-row](settings-row.md), [settings-group](settings-group.md),
[preset-picker](preset-picker.md), [setting-inline](setting-inline.md), [move-note-editor](move-note-editor.md),
[marks-editor](marks-editor.md), [refutation-editor](refutation-editor.md), [step-editor](step-editor.md),
[puzzle-picker](puzzle-picker.md), [pgn-import](pgn-import.md); pages [create](../pages/create.md),
[create-opening](../pages/create-opening.md),
[line-editor](../pages/line-editor.md), [settings](../pages/settings.md).

## From v1

Keep, generalise. `UndoButton` in `features/create/shell.tsx`, the label from `features/create/undo-label.ts`
(`describeUndo`), saving and undoing in `data/authored-edits.ts` (`saveAuthored` with a label, `undoAuthored`,
`loadUndoLabels` over the `authoringUndoLabels` setting). Settings have no history in v1.

## Open questions

- Settings and authoring: two histories (proposed: Undo on the settings page never takes back an authoring edit), or
  one?
- Redo: worth having, or is Undo of an Undo enough?
