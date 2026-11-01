# Refutation editor

Play a wrong move at a position of a line, see what the engine thinks of it, play the reply that punishes it and say
why in one sentence. The result is shown to every learner who plays that move, in every opening that reaches the
position.

## Shows

- **Wrong moves here**: the refutations already written at this position, each a row with the move, its symbol, how
  often players at the learner's band play it ("12% of games"), and the first words of why. Click one to edit.
- **Add a wrong move**: the board leaves the line and waits for a move, for either side.
- After the move: its [verdict-badge](verdict-badge.md) from the judgement (author, baked, live engine), the cost in
  centipawns, and the engine's best reply drawn as a suggestion in a system arrow.
- **The punishing moves**: played on the board, two to six plies, shown as a [move-run](move-run.md).
- **Why**: a [move-note-editor](move-note-editor.md) for the wrong move (comment, symbol `?` or `??`, ideas); each
  punishing move can have its own note and marks ([marks-editor](marks-editor.md)).
- **Whose mistake**: worked out from the side to move: "Your mistake" (the learner's side; shown when they play it) or
  "Their mistake" (the opponent's; used in a step's Their mistakes stage).

## Configuration

- `position`: the line and ply the wrong move is played from.
- `side`: the opening's side, to label whose mistake it is.
- Reads the explorer ([use-explorer](../hooks/use-explorer.md)) to list the common wrong moves at the band first:
  "Players at your level also play 4...h6 (9%) and 4...Bc5 (7%)". Picking one plays it.

## Behaviour

- A move the engine judges Good or better is refused with "That move holds up (only 12 centipawns worse). Write it as
  a line instead." and a link to branch here.
- The symbol must be `?` or `??`; `?!` is allowed for an inaccuracy worth explaining.
- Saving writes a PGN variation into the line, starting with the wrong move and its NAG, as one undoable action
  ("add the refutation 4...h6?"). It is never part of the theory tree and never drilled as a line.
- Stepping through the punishment uses the board's own [step-buttons](step-buttons.md).

## Composed of

[move-note-editor](move-note-editor.md), [marks-editor](marks-editor.md), [verdict-badge](verdict-badge.md),
[move-run](move-run.md), [board-explorer](board-explorer.md), [board-eval](board-eval.md),
[undo-button](undo-button.md).

## Used by

Page [line-editor](../pages/line-editor.md); [step-editor](step-editor.md) shows which refutations its Their mistakes
stage will use.

## From v1

New. The PGN reader already keeps variations and NAGs (`packages/core/src/chess/pgn.ts`); `authoring/chapter-edit.ts`
writes chapters and gains the variation edit. v1's line editor (`features/create/line-editor.tsx`) has Branch here,
which is what a sound alternative becomes.

## Open questions

- Can one refutation sit under a shipped move (from an authored opening), or only under the author's own lines?
