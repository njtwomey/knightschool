# Marks editor

Drawing an author's arrows and rings on the board for the move being edited: pick a colour, draw, clear. The four
colours each mean one thing everywhere, so the editor teaches the meanings as it is used.

## Shows

- **Four colour swatches** in a row, each with its name and meaning on [hint](hint.md): Idea (green), Threat (red),
  Target (yellow), Support (blue), from `MARK_MEANINGS` ([colours](../patterns/colours.md)).
- **Tap to draw** switch, on by default on a touch screen.
- **Clear**: takes away every mark on this move ("Clear 3 marks").
- The [mark-key](mark-key.md) under the board, showing only the colours in use, as a learner will see it.

## Configuration

- `move`: the move whose comment holds the marks (`[%cal]` and `[%csl]`).
- `editable`: false for a move whose comment is owned by another line (marks live in the comment, so they follow the
  one-comment rule; see [move-note-editor](move-note-editor.md)).
- Reads `board.marksWhileStudying`: off hides marks for learners on this device, never in the editor.

## Behaviour

- **Mouse**: right-drag from one square to another draws an arrow; right-click a square rings it, in the picked colour.
  As on Lichess, Shift draws red (Threat), Alt blue (Support), both yellow (Target), so marks can be drawn without
  leaving the board.
- **Touch** (tap to draw on): tap a square, then another for an arrow; tap the same square twice for a ring. Pieces
  cannot be moved while tap to draw is on; the switch says so.
- **Again removes, another colour recolours**: drawing the same arrow again takes it away; drawing it in another
  colour changes its colour.
- Each change saves at once as one undoable action ("mark 4...Nf6"); a run of marks drawn within a few seconds
  folds into one Undo.
- System arrows (the move to play, hints, the engine) are never drawn here and never use these four colours.
- Keyboard: 1 to 4 pick a colour while the board has focus; there is no keyboard drawing (an open question).

## Composed of

[board-surface](board-surface.md) (drawing layer), [mark-key](mark-key.md), [hint](hint.md),
[icon-action](icon-action.md), shadcn `ToggleGroup`, `Switch`, `Button`.

## Used by

Page [line-editor](../pages/line-editor.md); [step-editor](step-editor.md) for the marks on a step's key position;
[refutation-editor](refutation-editor.md) for the punishing moves.

## From v1

Keep. `features/create/move-marks.tsx` (colour, tapping, clear), `features/create/mark-colour.ts` (`markColourFor`,
the Shift and Alt keys), core `content/marks.ts` (`toggleArrow`, `toggleCircle`, `MARK_MEANINGS`), drawing through
`onDrawMark` in `components/board/app-board.tsx`, saved with `setMoveMarks`.

## Open questions

- Keyboard drawing (pick a square, then another, with a key) for authors who cannot use a mouse.
