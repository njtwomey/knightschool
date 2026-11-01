# Board surface

The squares and pieces of a [board](board.md), with everything drawn on them in a fixed order of layers.

## Shows

The position at the board's cursor, in the learner's colours and pieces, and these layers, bottom to top:

1. **last move**: its two squares tinted (yellow; red when the page points out the opponent's move being answered);
2. **marks**: the author's arrows and rings in the four mark colours, Idea, Threat, Target, Support
   ([colours](../patterns/colours.md));
3. **system arrows**: the move to play (Learn), a hint, the engine's best move, the opponent's threat, a candidate
   being hovered. Dashed or outlined, never in a mark colour, so "play this" cannot be read as an Idea mark;
4. **highlights from elsewhere**: squares lit by a hovered [move-chip](move-chip.md), tries row or
   [position-features](position-features.md) item;
5. **feedback**: the verdict symbol (`!`, `?!`, `?`, `??`) in a corner of the target square in its verdict colour, the
   tick or cross, the refutation as a Threat-style system arrow;
6. **selection**: the picked piece, legal-move dots, the square under the pointer, the hint pulse;
7. **the learner's scratch drawings**: arrows and rings drawn with the right button, cleared on the next move and never
   saved (except in `author` mode, where they are the marks being written).

## Configuration

- From the model: position, orientation, mode, reveal level, last move, feedback. Which layers draw is set by the reveal
  level ([reveal](../patterns/reveal.md)), not by the page.
- `interactive`: whether pieces can be moved (off for thumbs and replays).
- Settings read: `board.theme`, `board.pieces`, `board.coordinates`, `board.legalMoves`, `board.hoverSquare`,
  `board.lastMove`, `board.animation`, `board.marksWhileStudying`, `accessibility.reducedMotion`,
  `accessibility.highContrast`, `accessibility.typedMoves`.

## Behaviour

- **Moving.** Drag a piece, or click it then a square; illegal drops snap back silently. A promotion asks which piece,
  with the queen first. In `play one side` only the learner's pieces move, and only on their turn.
- **Preview.** While something elsewhere is hovered, the surface can show another position plainly (no marks or arrows
  of its own) with a small "Preview" label in a corner; it cannot be moved in, and returns when the hover ends. A
  preview never shows a later move while the reveal level is `test`.
- **Drawing.** Right-drag for an arrow, right-click for a ring; Shift red, Alt blue, both yellow, as on Lichess. On
  touch, drawing is only offered in `author` mode, through the [marks-editor](marks-editor.md).
- **Animation.** Moves slide unless `board.animation` is off or reduced motion is asked for.
- **Keyboard.** With `accessibility.typedMoves`, a move can be typed in SAN in a box beside the board.
- **States.** Empty board while loading; a dashed box with a short message for a position that cannot be read.

## Composed of

The chessboard library's board, plus the arrow and ring drawing from core marks.

## Used by

[board](board.md) (every part draws onto it), [board-thumb](board-thumb.md) (with interaction and most layers off).

## From v1

Repurpose `apps/web/src/components/board/app-board.tsx` (theme, pieces, dots, hover brackets, badge, hint pulse,
`onDrawMark`, `previewable`), with `board/shapes.ts` (`uciArrow`, `marksOnBoard`, `MARK_RGB`), `board/themes.ts`,
`board/pieces.tsx` and core `content/marks.ts` (`MARK_MEANINGS`, `parseArrow`, `parseCircle`). New: the system arrow
style (v1's Learn arrow is the same green as an Idea mark), the verdict symbol on the square, scratch drawings for
learners, and the highlight layer.
