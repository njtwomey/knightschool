# Move table

The moves on a board, listed and bound to its cursor: a table of the moves so far, a run in a sentence, or a line told
with its comments.

## Shows

Three layouts of the same moves, every move a [move-chip](move-chip.md):

- **table**: one row per full move, number then White's and Black's moves, the current move marked, verdict symbols
  after moves graded in this session;
- **inline**: a [move-run](move-run.md) that flows like text, with "…" for earlier moves left out;
- **paragraphs**: runs of moves, each ending with the comment on its last move, as a line reads in words.

Moves have states, each with one look: played, still to come (dimmed), explored off the line (accent), leading in
(muted), the point of the step (bold), already passed (bold accent). Refutations and side lines sit folded under the
move they branch from ("▸ 4...Nxe4? why it fails"), opened in place.

## Configuration

- From the model: the moves, the cursor, side branches, feedback per move, the reveal level.
- `layout`: `table`, `inline` or `paragraphs`.
- `empty`: what to say before any move ("Play a move, or step through the line").
- Settings read: `board.notation`.

## Behaviour

- Click a move: the cursor goes there and every part follows. Hover: the board previews it
  ([use-move-interaction](../hooks/use-move-interaction.md)).
- The table scrolls to keep the current move in view; it never scrolls the page.
- Opening a folded refutation puts it on the board as a side branch; folding it again returns to the line.
- At the `test` reveal level, moves after the one being asked are not listed at all, and the moves so far cannot be
  hovered into a preview of anything later ([reveal](../patterns/reveal.md)).
- Keys belong to the step buttons, not to the table; Tab moves through the chips.

## Composed of

[move-chip](move-chip.md), [move-run](move-run.md), [verdict-badge](verdict-badge.md), [rich-text](rich-text.md)
(paragraphs).

## Used by

[board](board.md) (`Board.Moves`); [line-story](line-story.md) (paragraphs); [step-row](step-row.md) (inline); pages
[step](../pages/step.md), [review](../pages/review.md), [drill](../pages/drill.md), [line](../pages/line.md),
[analysis](../pages/analysis.md), [line-editor](../pages/line-editor.md).

## From v1

Keep `apps/web/src/components/move-list.tsx` (`MoveList`: `table`, `inline`, `paragraphs`, `MoveState`, `current`,
`onSelect`, `truncated`) and `lib/move-paragraphs.ts`. What changes: each move becomes a move chip, it reads the board
model instead of `current` and `onSelect`, and side lines are folded in.
