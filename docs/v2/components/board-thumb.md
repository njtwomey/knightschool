# Board thumb

A small still picture of a position for cards, lists and previews: the same look as the main board, nothing to press.

## Shows

The position, turned to the side asked, with its last move tinted and, if asked, the author's marks. No coordinates,
no controls, no eval. An optional caption under it ("after 5.d4").

## Configuration

- `position`: a FEN, an EPD, or a PGN played to a ply (or to its end).
- `side`: which way up; defaults to the side the opening or line is written for, else White.
- `marks`: off by default; on in idea pages and step rows that show the step's key position.
- `highlight`: squares to tint (a position feature, a square named in text).
- `size`: from 6rem in a list to 14rem in a [position-preview](position-preview.md).
- Settings read: `board.theme`, `board.pieces`, `access.highContrast`, so a thumb always matches the main board.

## Behaviour

- Drawn only when it comes near the screen, so a page of a hundred results does not build a hundred boards at once.
  Until then it keeps its square space with a muted background.
- Not interactive: clicks go to whatever holds it (a card's [row link](sortable-table.md), a chip), never to the board.
- A position that cannot be read shows a dashed square with a short message, not a broken board.
- Hidden from screen readers; the card or chip holding it carries the words ("Italian Game after 3.Bc4").

## Composed of

[board-surface](board-surface.md) with interaction and every layer but last move, marks and highlights off.

## Used by

[position-preview](position-preview.md), [position-card](position-card.md), [opening-card](opening-card.md),
[line-row](line-row.md), [step-row](step-row.md), [puzzle-card](puzzle-card.md), [rich-text](rich-text.md) (inline
boards), [board-search](board-search.md) results; pages [search](../pages/search.md), [ideas](../pages/ideas.md),
[openings](../pages/openings.md).

## From v1

Keep and merge `apps/web/src/components/board/board-thumb.tsx` (drawn when near the screen) and
`board/static-board.tsx` (a FEN, EPD or PGN at a ply through `resolvePosition` in core `chess/position.ts`, a message
for bad input). New: marks and highlights on a thumb.
