# Search

Openings, variations, lines, ideas and positions in one forgiving search, plus search by setting up a position. For
anyone who knows roughly what they want: "the fried liver", "Caro", a position from a game.

## Address

`/explore/search`. Hash, written only where it differs from the default
([../navigation/url-state.md](../navigation/url-state.md)):

- `q=<text>`, `scope=all|openings|variations|lines|ideas`, `side=all|white|black`, `kind=<line kind>`;
- `bm=<moves>`, the board search's moves.

v1's `/search` and `/browse` land here with their hash carried over where it still means something. v1's `/openings`
(also Search in v1) now opens v2's [openings](openings.md) page.

## Reached from

**Explore** › Search in the menu; the search key from anywhere
([../navigation/shortcuts.md](../navigation/shortcuts.md)); the map index's search box (**Search everything**); a gap on
the [map](map.md) (**Find an opening that does**, with the position as a board search); [not found](not-found.md), with
the address's words as the query.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Explore › Search.

1. [search-box](../components/search-box.md), wide, focused on arrival, with **Search by position** beside it.
2. Filters: [filter-toggle](../components/filter-toggle.md)s for scope, side and line kind.
3. Results ranked by relevance, one list of mixed kinds, each with "why it matched" ("name, 'fried' and 'liver'"):
   - an opening: [opening-card](../components/opening-card.md), small;
   - a variation: its [opening-name](../components/opening-name.md) and the opening it belongs to;
   - a line: [line-row](../components/line-row.md) with a [board-thumb](../components/board-thumb.md) and
     [kind-badge](../components/kind-badge.md);
   - an idea: [idea-badge](../components/idea-badge.md) with its summary.
4. **Search by position** opens [board-search](../components/board-search.md) in a dialog: play moves or set up the
   board; results are [position-card](../components/position-card.md)s listing every line through it, transpositions
   included.

## Behaviour

- Matching forgives words run together and small slips, and ranks names above comments.
- Empty query: the page shows the openings in study order and the ideas by kind, as a starting point.
- No result: [empty-state](../components/empty-state.md) "Nothing matches 'karo'. Did you mean Caro-Kann?", the
  nearest name offered.
- Board search covers shipped lines; authored openings are searched by name only, and the dialog says so.

## Leads to

[opening](opening.md), [variation](variation.md), [line](line.md) (`/lines/<line>`), [idea](idea.md); a position card
→ the [map](map.md) at that position or [analysis](analysis.md) with it.

## From v1

`features/search` (`search-page.tsx`, `board-search.tsx`, `board-query.ts`, `hash-state.ts`, `course-card.tsx`,
`variation-card.tsx`). Verdict: **keep**, under Explore; ideas join the results and the play-it / against-it filter
goes with `openings.yaml`.
