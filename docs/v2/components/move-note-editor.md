# Move note editor

Everything an author writes about one move: its comment, its symbol, the ideas it shows and its tags. Sits beside the
board in the line editor and edits the move the board is on.

## Shows

- **Heading**: the move as a [move-chip](move-chip.md) ("Note on 4...Nf6") and the line it belongs to.
- **Comment**: a text box for one to three sentences, neutral and for both sides ("Black attacks e4 and gets ready to
  castle"). Positions and moves can be written inline and show as chips in the preview, as in [rich-text](rich-text.md).
- **Symbol**: a one-of-several choice of none, `!`, `!!`, `!?`, `?!`, `?`, `??` (written as PGN NAGs). Choosing `?` or
  `??` on a move of the line itself is refused with a pointer to [refutation-editor](refutation-editor.md): a wrong
  move is a refutation, never part of a line.
- **Ideas**: [idea-badge](idea-badge.md)s chosen from the ideas list with a search ("fork", "fianchetto"); a new name is
  offered as "Suggest a new idea", kept as a plain tag until the ideas list has it.
- **Tags**: tip, trap, common blunder, and any word (v1's set).
- **Preview**: the note as a learner sees it in [board-notes](board-notes.md), under the editor.

## Configuration

- `move`: the move being edited (line id and ply).
- `owner`: which line owns the comment. A move has **one comment across the whole site**; if another line already
  gives it, the comment is read-only here, with "Written in the line Two Knights main" as a link. Symbol, ideas and
  tags can still be added.
- `editable`: false for a shipped line seen inside Create (read-only, with its owner named).

## Behaviour

- **Saves when you leave the box** (blur, or moving the board to another move), as one undoable action named "edit the
  note on 4...Nf6"; see [undo-button](undo-button.md). No Save button.
- A comment that clashes with a shipped one for the same move shows in [problems-list](problems-list.md) rather than
  being lost.
- Empty is allowed while writing; the opening's bar (courses.md: a comment on every learner move) shows as a problem
  on Publish, not as a nag here.
- Keyboard: Tab from comment to symbol to ideas to tags; the arrow keys do not step the board while typing.

## Composed of

[move-chip](move-chip.md), [idea-badge](idea-badge.md), [filter-toggle](filter-toggle.md) (symbol),
[rich-text](rich-text.md) (preview), [board-notes](board-notes.md) (preview), shadcn `Textarea`, `Input`, `Badge`.

## Used by

Page [line-editor](../pages/line-editor.md); [refutation-editor](refutation-editor.md) reuses it for the wrong move's
note.

## From v1

Keep, extend. `features/create/move-note.tsx` (free text and tags, read-only when another line owns the comment,
`MOVE_TAGS`), saved through core's `setMoveNote` in `authoring/chapter-edit.ts`. Symbols and ideas are new; learners
see tags today through `components/move-tags.tsx`.
