# Move chip

One move as a small button: every move shown anywhere on the site is one, so hovering and clicking a move does the same
thing in a table, a sentence, an engine line, the explorer or a search result.

## Shows

- the move number when it starts a move or stands alone ("3.Bc4", "3...Nf6"), left out inside a run where the run
  writes it ([move-run](move-run.md));
- the SAN, in letters or figurines;
- the symbol when the move has one (`!`, `!?`, `?!`, `?`, `??`), in its verdict colour;
- its state as weight and colour: played, still to come, explored, leading in, the point of the step, passed, current
  (a filled background);
- optionally a [verdict-badge](verdict-badge.md) after it, in the tries table and the explorer.

## Configuration

- `move`: the position before it (EPD), its UCI and SAN, its ply. Every chip knows both positions, so it can always be
  previewed and gone to.
- `state`, `symbol`, `verdict` as above.
- `board`: which board it talks to. By default the nearest enclosing [board](board.md), else the page's primary board,
  else none.
- `href`: where a click goes when there is no board (the [line](../pages/line.md) or [analysis](../pages/analysis.md)
  page at that position).
- Settings read: `board.notation`, `display.previews` (whether hover may open a position preview).

## Behaviour

All of it from [use-move-interaction](../hooks/use-move-interaction.md), following
[interactions](../patterns/interactions.md):

- **Hover or focus**, with a board: if the move is on the board's moves, the board previews the position after it; if
  it can be played from the board's current position (explorer, engine line), it is drawn as a candidate arrow. Either
  way its from and to squares are lit, and leaving puts the board back.
- **Hover or focus**, with no board, or when the position is not the board's: after a short delay the
  [position-preview](position-preview.md) card opens beside the chip
  ([use-position-preview](../hooks/use-position-preview.md)).
- **Click, Enter or Space**: go there. On a board, the cursor moves to it (or the move is played as an explored move);
  with no board, the `href` opens.
- **Touch**: tap goes there; long-press previews (the card, or the board preview while the finger is down).
- **Escape** closes an open preview. Only one preview is ever open.
- **Testing**: at the `test` reveal level a chip for a move not yet answered is not drawn at all, and chips of moves
  already played never preview later positions ([reveal](../patterns/reveal.md)).
- **Screen readers** hear the move in words: "3, bishop c4" or "3, black, knight f6, a mistake".

## Composed of

shadcn `Button` (link style), [verdict-badge](verdict-badge.md).

## Used by

[move-run](move-run.md), [move-table](move-table.md), [tries-table](tries-table.md),
[board-explorer](board-explorer.md), [board-eval](board-eval.md), [verdict-note](verdict-note.md),
[move-explanation](move-explanation.md), [rich-text](rich-text.md), [position-features](position-features.md),
[step-row](step-row.md), [line-row](line-row.md), [map-tree](map-tree.md) pills (same behaviour),
[gap-link](gap-link.md).

## From v1

New as one component. Today each list makes its own buttons: `apps/web/src/components/move-list.tsx` (`onSelect`),
the explorer's move buttons (`features/explorer/explorer-panel.tsx`), plain text in
`components/engine/engine-lines.tsx`. The hover-to-show-on-the-board idea is v1's `previewable` boards and
`board/preview.ts` (`usePreview`: show, hide, toggle to pin), used today only by position links in
`components/rich-text.tsx`. Move labels keep core `chess/notation.ts` (`numberedMove`, `moveNumberLabel`).
