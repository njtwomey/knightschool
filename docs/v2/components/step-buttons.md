# Step buttons

Start, back, forward and end: the one way to move through the moves on a board, with the arrow keys doing the same.

## Shows

Four outline icon buttons in a group: to the start, back one move, forward one move, to the end. When the cursor is off
the source (moves explored, or a refutation being stepped through), a fifth button, "Back to the line", follows them.

## Configuration

- From the model: the cursor, the first and last positions it may reach, and whether it is on a side branch.
- `min`: the first position stepping may reach (a step that starts part-way along a line starts there, with the earlier
  moves shown greyed in the [move-table](move-table.md)).
- `keys`: on for the primary board only.

## Behaviour

- Click or tap steps once; holding forward or back repeats after a short pause.
- **Keys**: Left and Right one move, Home and End to the ends, through
  [use-shortcuts](../hooks/use-shortcuts.md): never while typing, never with a modifier held, never for a key a menu or
  radio group has already taken, and only for the primary [board](board.md).
- At the start, start and back are disabled; at the end, forward and end are. They stay in place so the row does not
  move.
- **During an exercise** stepping back is looking back: the board shows the earlier position, the exercise waits, and
  forward or "Back to the line" returns to the move being asked. Forward never goes past the move being asked, so the
  buttons cannot reveal the answer.
- Every step moves the shared cursor, so the move table, notes, eval and feedback follow at once.

## Composed of

shadcn `Button`; [use-board](../hooks/use-board.md) for the cursor.

## Used by

[board-controls](board-controls.md). Pages reach it through the board: [opening](../pages/opening.md),
[line](../pages/line.md), [step](../pages/step.md), [map](../pages/map.md), [analysis](../pages/analysis.md),
[review](../pages/review.md) (the moves so far), [line-editor](../pages/line-editor.md).

## From v1

Keep `apps/web/src/components/board/step-buttons.tsx` (the four buttons) and the key rules of
`board/line-stepper.ts` (`stepKey`, `isTyping`, `stepTarget`, one stepper per page with `keys`). The stepper's
positions and index move into the board model. New: hold to repeat, "Back to the line", and the rule that forward
stops at the move being asked.
