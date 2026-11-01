# Line editor

Writing one line: playing its moves, writing a note and drawing marks on each, adding refutations for wrong moves,
and branching new lines off it. Where most of an author's time goes.

## Address

`/create/<opening>/<line>`. Hash: `#m=<uci.uci...>` for the move being looked at, so a refresh returns to it
([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

A row on the Lines tab of [create-opening](create-opening.md); a step's stretch on its Steps tab; **Edit** beside a
line on the learner's [line](line.md) page of an authored opening; **New line** and **Branch here**.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Create › opening › (line, a menu of the opening's lines), with previous
and next line, **View as learner** and [undo-button](../components/undo-button.md) on the right.

1. The line's details in a row: title, [kind-badge](../components/kind-badge.md) as a select, variation (a select with
   "New variation…"), the opponent's move that reaches it, description.
2. Two columns from lg (`.board-columns`):
   - Board side: a [board](../components/board.md) in the `author` preset with
     [board-controls](../components/board-controls.md) and [step-buttons](../components/step-buttons.md); moves are
     played at the end of the line; [board-eval](../components/board-eval.md) as the strip (the engine's check of each
     move); [mark-key](../components/mark-key.md).
   - Panel side: [move-table](../components/move-table.md) of the line, refutations folded under their moves; for the
     move looked at, [move-note-editor](../components/move-note-editor.md) (comment, symbol, ideas, tags) and
     [marks-editor](../components/marks-editor.md) (colour, tapping, clear);
     [refutation-editor](../components/refutation-editor.md) (**Add a wrong move**: play it, write why, play the
     punishment); [board-explorer](../components/board-explorer.md) for what players at the band play here, the replies
     worth answering marked.
3. [problems-list](../components/problems-list.md) under the board, each problem at the move it concerns.

## Behaviour

- The board is in `author` mode: play to extend the line, or draw marks with a right-drag (Shift red, Alt blue, both
  yellow, as on Lichess) or by tapping in the picked colour
  ([../patterns/interactions.md](../patterns/interactions.md)).
- **Branch here** makes the next move the start of a new line; a second answer where the author moves is listed as an
  alternative, since an opening has one answer per position.
- A comment another line already gives is read-only here with a link to that line: one comment per move.
- Truncating the line asks first and names what grows from it; every edit is one undoable action.
- The engine's check runs as moves are added; a move losing over a pawn is flagged with its cost and the better move,
  never blocked ([../hooks/use-judgement.md](../hooks/use-judgement.md)).
- An unknown line in a known opening goes to the opening's Lines tab with a [notice](../components/notice.md).

## Leads to

Previous and next line, a new line → [line-editor](line-editor.md); **View as learner** → [line](line.md)
(`/openings/<opening>/lines/<line>`); [create-opening](create-opening.md).

## From v1

`features/create/line-page.tsx` with `line-editor.tsx`, `line-details.tsx`, `move-note.tsx`, `move-marks.tsx`,
`mark-colour.ts` and the store's line, move and group slices. Verdict: **keep**; refutations, symbols, ideas on moves,
the explorer and the engine's check are new.
