# Board controls

The one row of buttons under every board, always in the same order, each button there only when it means something.

## Shows

From left to right:

1. the settings gear, opening the [board-settings-menu](board-settings-menu.md);
2. flip, only when the model says the side is not fixed;
3. the [step-buttons](step-buttons.md), when there is a line to step through;
4. **Hint** (lights the piece to move) and **Show me** (draws the move), only while an exercise is waiting for an
   answer;
5. the page's own actions (Restart, Next, Back to the line, Open on the board), last.

On a phone the row wraps under the board with the step buttons kept together; every button is at least 44px square.

## Configuration

- From the model: whether flip is allowed, whether there is a line to step, whether an exercise is waiting, help used so
  far.
- `actions`: the page's buttons, as [icon-action](icon-action.md)s or shadcn buttons.
- `settings`: on unless turned off (a thumb never has controls).
- Settings read: `feedback.hints` (whether Hint and Show me are offered at all; the Exam preset turns them off). Config
  read: `teach.triesBeforeShown` (when Show me appears unasked after the tries run out).

## Behaviour

- **Flip** turns the board round and is remembered for that board's page; on the Board page (`/board`) it is written to
  the address. Key F, registered through [use-shortcuts](../hooks/use-shortcuts.md).
- **Hint** then **Show me**: the first press lights the piece, the second draws the move. Each press is counted on the
  try ([tries-table](tries-table.md) shows "hint" or "shown"), and Show me moves the reveal level to `answered`.
- Buttons that cannot act are hidden, not greyed, except the step buttons at either end of a line, which stay in place
  and are disabled so the row does not jump.
- Each icon button has its name as a [hint](hint.md) on hover and as its accessible label.

## Composed of

[step-buttons](step-buttons.md), [board-settings-menu](board-settings-menu.md), [icon-action](icon-action.md).

## Used by

[board](board.md), on every page that uses a board with controls (every preset but `thumb`).

## From v1

Repurpose the control row of `apps/web/src/components/board/study-board.tsx` (`StudyBoardControls`: settings, flip,
hint, show, then `actions`, with `onFlip` for Lab). What changes: flip and Hint follow the model and preset instead of a
prop on each page, and help used is counted by the session rather than by Speed alone.

## Open questions

- Should Hint and Show me have keys (H, S)? They are the only controls a keyboard player cannot reach quickly.
