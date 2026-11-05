# Search

Openings, variations, lines, ideas and positions in one forgiving search, plus search with an opening: play its moves on
a board and find every opening and line through that position, transpositions included. For anyone who knows roughly
what they want: "the fried liver", "Caro", a position from a game. **v1's search, kept as it is**: the forgiving text
search with "why it matched", the filters, board search and the hash state all work as they do now; v2 only adds ideas
to the results and authored openings to both searches.

## Address

`/explore/search`. Hash, written only where it differs from the default
([../navigation/url-state.md](../navigation/url-state.md)):

- `q=<text>`, `role=play|against` (who plays it), `side=all|white|black`, `scope=all|openings|variations|lines|ideas`,
  `kind=main|sideline|rare|gambit|trap`;
- `bm=<moves>` and `bk=lines|traps`, the board search's moves and its lines-or-traps filter (v1's `bk=refutations` still
  reads as `traps`).

v1's `/search` and `/browse` show this page and settle on this address with their hash carried over: `q`, `role`, `side`, `scope` (v1's `courses` read
as `openings`), `bm` and `bk` keep their meaning; only `tier` is dropped, as tiers are parked. v1's `/openings` (also
Search in v1) now opens v2's [openings](openings.md) page.

## Reached from

**Explore** › Search in the menu; the search key from anywhere
([../navigation/shortcuts.md](../navigation/shortcuts.md)); the map index's search box (**Search everything**); a gap on
the [map](map.md) (**Find an opening that does**, with the position as a board search); [not found](not-found.md), with
the address's words as the query. Built so far: the Search link in the header, the `/` key, and **Search lines and ideas**
on the [openings](openings.md) page, which carries what is typed there.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Explore › Search.

1. [search-box](../components/search-box.md), wide, focused on arrival, with **Search by position** beside it.
2. Filters, as in v1: [filter-toggle](../components/filter-toggle.md)s for **who plays it** (play it, against it: from
   the opening's side, now that `openings.yaml` is parked: an opening plays the named moves when its side is the side
   that makes them, as "Italian Game, as White"; it plays against them otherwise, as "Italian Game, as Black"), side,
   scope and line kind.
3. Results ranked by relevance, one list of mixed kinds, each with "why it matched" ("name, 'fried' and 'liver'"):
   - an opening: [opening-card](../components/opening-card.md), small;
   - a variation: its [opening-name](../components/opening-name.md) and the opening it belongs to;
   - a line: [line-row](../components/line-row.md) with a [board-thumb](../components/board-thumb.md) and
     [kind-badge](../components/kind-badge.md);
   - an idea: [idea-badge](../components/idea-badge.md) with its summary and the openings that teach it. There are no
     idea pages yet, so an idea opens the first of those openings.
4. **Search by position** opens [board-search](../components/board-search.md) in a dialog, as in v1: play the moves of
   an opening and see every opening and line through that position, transpositions included.

## Behaviour

- Matching forgives words run together and small slips, and ranks names above comments.
- Empty query: not every line at once, as there are hundreds. Sections, each its first `search.browseSize` with Show
  more: Openings in study order; Lines, main lines first (`search.lineOrder`); Variations; Ideas by kind. A scope or a
  line kind turns that into one list of `search.pageSize` at a time.
- Typed: one ranked list, `search.pageSize` at a time. Equal matches go by `search.lineOrder`, so "caro" lists the
  opening, its variations, then its main lines before its sidelines.
- Filters count what they would show, and a choice with nothing to show is disabled. A line kind narrows the list to
  lines, so choosing one leaves a scope of openings, variations or ideas, and the other way round. Against it is
  disabled while no opening plays against its named moves.
- A comment counts for the line that first plays the move, not every line through it: a line's text is what is said from
  where it branches, with its steps and follow-ups. Slips are forgiven in titles only, as in prose they find the wrong
  word ("black" for "block"). Words spread across fields match too ("italian fried liver").
- The moves search narrows the page behind it, as in v1: a card for the position (it opens on the board, with Clear the
  position beside it), and the openings, variations and lines through it. A line opens at this position.
- No result: [empty-state](../components/empty-state.md) "Nothing matches 'karo'. Did you mean Caro-Kann Defence?", the
  nearest name offered; with filters on, Clear the filters instead.
- Board search covers shipped lines and authored openings alike.

## Leads to

[opening](opening.md), [variation](variation.md), [line](line.md) (`/lines/<line>`), [idea](idea.md); a position card →
the [map](map.md) at that position or [board](board.md) with it.

## From v1

`features/search` (`search-page.tsx`, `board-search.tsx`, `board-query.ts`, `hash-state.ts`, `course-card.tsx`,
`variation-card.tsx`). Verdict: **keep**, behaviour unchanged, under Explore. Ideas join the results and authored
openings join both searches; the play-it / against-it filter stays, worked out from the opening's side instead of
`openings.yaml`.
