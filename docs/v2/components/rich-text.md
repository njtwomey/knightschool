# Rich text

Written text, an opening's introduction, a step's text, a move's comment, with positions, moves, squares and ideas
inline, each hoverable and tied to the board beside it.

## Shows

Plain paragraphs with these inline:

- **positions**: words that stand for a position ("[the position after Nxf7](FEN)"), underlined with dots;
- **moves**: a move written in the text ("3...Nf6", "4. Ng5 d5") as [move-chip](move-chip.md)s or a
  [move-run](move-run.md), resolved against the line or step the text belongs to;
- **squares and pieces**: "the d5 square", "the bishop on b5", which light up on the board;
- **ideas**: an idea named in the text, as an inline [idea-badge](idea-badge.md);
- **boards**: an inline [board-thumb](board-thumb.md) where the author asks for a diagram (idea pages, introductions).

## Configuration

- `text`: the authored string in the content format.
- `context`: the line or step it belongs to (to resolve moves) and the side (for "you").
- `board`: which board its positions and squares talk to; the nearest, else the page's primary board, else none.
- Settings read: `board.notation`, `display.previews`.

## Behaviour

- **Hover or focus a position**: the board beside the text shows it as a preview and returns when the pointer leaves.
  With no board, the [position-preview](position-preview.md) card opens. **Click** pins the board on that position
  until clicked again or the board is stepped; on touch, a tap pins and a second tap unpins.
- **Hover a square or piece**: a ring on that square on the board's highlight layer, in the Target or Idea colour.
- **Moves** behave as chips ([use-move-interaction](../hooks/use-move-interaction.md)).
- A link whose target does not read as a position stays as its plain words; text is never broken by bad markup.
- Without a board (search results, a card's summary), positions read as plain words and moves as plain text.
- Hidden or plain at the `test` reveal level following the part that holds it ([reveal](../patterns/reveal.md)).

## Composed of

[move-chip](move-chip.md), [move-run](move-run.md), [idea-badge](idea-badge.md), [board-thumb](board-thumb.md),
[position-preview](position-preview.md).

## Used by

[board-notes](board-notes.md), [move-explanation](move-explanation.md), [verdict-note](verdict-note.md),
[board-feedback](board-feedback.md), [move-table](move-table.md) (paragraphs), [line-story](line-story.md),
[opening-intro](opening-intro.md), [step-row](step-row.md); pages [step](../pages/step.md) (Read),
[idea](../pages/idea.md), [opening](../pages/opening.md), [variation](../pages/variation.md).

## From v1

Repurpose `apps/web/src/components/rich-text.tsx` (position links that show on the nearest `previewable` board on
hover, pin on click) over core `content/rich-text.ts` (`parseRichText`, `plainText`: `[label](FEN or EPD)`) and
`components/board/preview.ts`. New: moves, squares, ideas and inline boards, and the preview card when no board is
near.

## Open questions

- The written syntax for moves, squares and ideas in text is a content-format decision (content/README.md for v2):
  marked explicitly, like position links, or recognised from plain "3...Nf6" and "d5"? Explicit is safer to check at
  build.
