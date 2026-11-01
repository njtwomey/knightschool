# Position card

A position as a card in a list: a thumb, its name, how often players reach it, and the lines and openings that pass
through it.

## Shows

- a [board-thumb](board-thumb.md), turned to the side that matters for the list;
- the [opening-name](opening-name.md) of the position (or the deepest named position before it) and the moves that
  reach it as a short [move-run](move-run.md), cut with "…" at the front;
- how often it is reached at the learner's band ("reached in 8% of games at 1000 to 1600");
- the lines through it, as up to three [line-row](line-row.md) links in compact form and "and 4 more", with each line's
  [kind-badge](kind-badge.md); transpositions count, so a position reached by two move orders lists both;
- the openings that teach it, and the learner's state there when it is in their repertoire
  ([state-badge](state-badge.md));
- optionally [eval-words](eval-words.md), and a reason it is in this list ("matches your board search", "shows a
  fork").

## Configuration

- `position`: an EPD, with the context (a search, an idea, a gap).
- `show`: which of share, lines, openings, state, eval to include; `layout`: card (grid) or row (list).
- Settings read: `level.band`, `board.theme`, `board.pieces`.

## Behaviour

- The whole card is a link ([sortable-table](sortable-table.md)'s row link): a click anywhere opens the position on
  the [board](../pages/board.md) page, or on the [line](../pages/line.md) page when the card is for one line.
  The line links inside keep their own clicks.
- Hover the thumb: nothing extra (it is already a picture). Hover a line link: the
  [position-preview](position-preview.md) of where that line goes.
- Loading: the card keeps its size with a muted thumb; share and lines fill in.
- Empty fields are left out, never shown as "0" or "none".

## Composed of

[board-thumb](board-thumb.md), [opening-name](opening-name.md), [move-run](move-run.md), [line-row](line-row.md),
[kind-badge](kind-badge.md), [state-badge](state-badge.md), [eval-words](eval-words.md).

## Used by

[board-search](board-search.md) results, [search](../pages/search.md), [idea](../pages/idea.md) (positions that show
it), [your-games](../pages/your-games.md) (where each game left the repertoire), [repertoire](../pages/repertoire.md)
(the biggest gaps), [map](../pages/map.md) (the picked move, on a phone).

## From v1

Repurpose the line cards with board thumbnails on the Search page
(`apps/web/src/features/search/variation-card.tsx`) and the board search results
(`features/search/board-search.tsx`, over `search.json`, which maps every position to the lines through it).
Popularity per position comes from `content/popularity/popularity.json`, as `node.popularity` in
`features/course/position-details.tsx` shows today.
