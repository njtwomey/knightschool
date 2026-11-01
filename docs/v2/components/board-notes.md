# Board notes

What the author says about the move on the board: its comment, ideas and tags, and what the marks mean.

## Shows

For the move at the cursor:

- the move itself ("5.d4") with its symbol, and the position's name when it has one ([opening-name](opening-name.md));
- the comment as [rich-text](rich-text.md), so positions, moves and ideas in it can be hovered;
- the ideas it shows as [idea-badge](idea-badge.md)s, and its tags (Tip, Trap, Common blunder, the author's own word);
- the [mark-key](mark-key.md) for the marks on the board;
- in `study`, a "More about this move" toggle that opens the full [move-explanation](move-explanation.md).

At the start position, before any move: the line's or step's own text, or "Step through the moves with the arrows, or
tap a move".

## Configuration

- From the model: the move at the cursor and its annotation, the reveal level.
- `ahead`: in Watch, the comment of the move about to be played is shown before it is played (the `learn` reveal
  level: "yes, ahead of the move").
- Settings read: `board.marksWhileStudying` (whether the key and marks show), `board.notation`.

## Behaviour

- Follows the cursor: step, click a move anywhere, or hover a move chip on this board, and the notes change with it.
  After a right move in an exercise the comment stays until the learner's next move.
- Hidden at the `test` reveal level and shown again at `answered` ([reveal](../patterns/reveal.md)): a note would give
  the answer away.
- A move with no comment shows nothing for the comment rather than "No comment"; the ideas and key still show if there
  are any.
- Positions and moves in the comment preview on this board when hovered
  ([use-move-interaction](../hooks/use-move-interaction.md)).

## Composed of

[rich-text](rich-text.md), [idea-badge](idea-badge.md), [mark-key](mark-key.md), [opening-name](opening-name.md),
[move-explanation](move-explanation.md).

## Used by

[board](board.md) on [step](../pages/step.md) (Read, Watch), [opening](../pages/opening.md), [line](../pages/line.md),
[map](../pages/map.md), [idea](../pages/idea.md), [line-editor](../pages/line-editor.md) (as the learner will see it).

## From v1

New as one part; today each page writes its own: `apps/web/src/features/course/position-details.tsx` (move, NAG words,
name, popularity, explanations), `features/tree/use-move-comment.ts`, the comment in Learn
(`features/play/play-panel.tsx`), `components/move-tags.tsx` (Tip, Trap, Common blunder) and
`components/board/mark-key.tsx`.
