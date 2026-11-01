# Board settings menu

The gear's menu beside every board: how the board looks and what it shows, changed on the spot and drawn from the
settings registry.

## Shows

A popover with three short groups and a link:

- **Look**: board colours as swatches (Green, Tan, Blue, Slate, Purple), piece set, coordinates.
- **Display**: legal-move dots, the square under the pointer, last-move highlight, marks while studying, notation
  (letters or figurines), animation.
- **Engine**: on or off, number of lines; shown only on boards with a [board-eval](board-eval.md) part.
- **All settings**: a link to the [settings](../pages/settings.md) page, open at the Board group.

Each row is a compact [settings-row](settings-row.md): label, control, and the hint on hover. No "where it came from"
line here; the settings page has that.

## Configuration

- `groups`: which groups to show (a board without an eval part leaves Engine out).
- Settings read and written, all in the **device** store: `board.theme`, `board.pieces`, `board.coordinates`,
  `board.legalMoves`, `board.hoverSquare`, `board.lastMove`, `board.marksWhileStudying`, `board.notation`,
  `board.animation`, `engine.on`, `engine.lines`. Learner settings (review, feedback, gates) never appear here.

## Behaviour

- Opens from the gear on click or Enter; closes on Escape, a click outside, or the gear again. Focus goes to the first
  control and back to the gear on close.
- A change applies at once to every board on the page and is saved as it is made; no Save button.
- A setting that differs from the preset shows a small reset.
- On a phone it opens as a bottom sheet instead of a popover.

## Composed of

[settings-group](settings-group.md), [settings-row](settings-row.md), shadcn `Popover` and `Sheet`.

## Used by

[board-controls](board-controls.md). The same rows appear on the [settings](../pages/settings.md) page, because both
draw from the registry ([use-setting](../hooks/use-setting.md)).

## From v1

Repurpose `apps/web/src/components/board/board-settings.tsx` (`BoardSettingsForm`, shared by the Settings page and the
popover), `board/prefs.ts` (`useBoardPrefs`, stored under `knightschool.board`; the key and format are kept so a saved
choice still reads), `board/themes.ts` and `board/pieces.tsx`. Engine on or off moves in from `data/engine/prefs.ts`.
