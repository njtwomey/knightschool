# Mark key

A one-line key under the board naming the colours drawn on it, only the ones there.

## Shows

A short row of entries, each a small stroke in the colour and its name: **Idea** (green), **Threat** (red), **Target**
(yellow), **Support** (blue), in that order, and only for the colours the shown move's marks use. When a system arrow
is on the board (the move to play, a hint), one more entry in its own style names it ("dashed: the move to play"), so it
is never read as an Idea.

## Configuration

- From the model: the marks of the move at the cursor, and which system arrows are drawn.
- `system`: whether to include the system-arrow entry (on in `learn`).
- Settings read: `board.marksWhileStudying` (no marks, no key).

## Behaviour

- Hover, focus or long-press an entry for its meaning as a [hint](hint.md): "Target: a weak square or pawn, something to
  aim at or to watch."
- Hovering an entry also brightens the marks of that colour on the board and dims the others for a moment.
- Nothing is shown when there are no marks; it never takes space for an empty key.
- Hidden at the `test` reveal level along with the marks ([reveal](../patterns/reveal.md)).

## Composed of

[hint](hint.md).

## Used by

[board-notes](board-notes.md); the [marks-editor](marks-editor.md) in Create (with every colour, as a picker legend).
The colours themselves are defined once in [colours](../patterns/colours.md).

## From v1

Keep `apps/web/src/components/board/mark-key.tsx` (only the colours present, names and hints from `MARK_MEANINGS` in
core `content/marks.ts`, colours from `MARK_RGB` in `board/shapes.ts`). New: the system-arrow entry and hover
brightening.
