# Search box

A forgiving search over openings, variations, lines and ideas, ranked by relevance, each result saying why it matched.

## Shows

- A text box with a search icon and a placeholder that hints at the range: "Search openings, lines, ideas: caro,
  fried liver, fork".
- A button beside it, **Search by position**, opening [board-search](board-search.md).
- Results, in the `page` form, as one ranked list of mixed kinds, each labelled: an [opening-card](opening-card.md), a
  [line-row](line-row.md) card, an [idea-badge](idea-badge.md) with its summary.
- Under each result, **why it matched**: "Name", "Lines inside: Fried Liver Attack, Traxler Counterattack", "In its
  description", "Close to 'Caro-Kann'" (a forgiven slip).
- A count and a clear button once something is typed: "14 results, clear".

## Configuration

- `form`: `page` (the search page: box, filters, results), `compact` (the map index, the header: box only, results in
  a drop-down of the top eight), `filter` (filters a list in place, such as the openings page).
- `kinds`: which kinds to search (openings, variations, lines, ideas, positions by name).
- `filters`: what [filter-toggle](filter-toggle.md)s sit beside it (who plays it, side, scope, line kind, as v1; level
  on the openings page).
- Reads `level.includeRare` (rare lines found but ranked lower) and nothing else.

## Behaviour

- Forgiving: accents and case ignored, words may run together ("carokann"), small slips are allowed (none in a word
  under five letters, one from five, two from eight: "scandanavian"), and every word must match somewhere.
- Ranked by relevance: a name match first, then a match in a line's name, then the text around it.
- Results update as the learner types, with no submit; Enter opens the first result; in `compact` form Up and Down
  move through the drop-down and Escape closes it.
- `/` focuses the search box from anywhere on the page ([use-shortcuts](../hooks/use-shortcuts.md)); typing in it
  never triggers other keys.
- The query and filters are kept in the address hash, so a refresh or a shared link restores them
  ([use-hash-state](../hooks/use-hash-state.md)).
- Nothing found: "Nothing matches 'xyz'. Try fewer words, or search by position", with the board search button
  ([empty-state](empty-state.md)).
- Authored openings are searched too, marked "Yours".

## Composed of

shadcn `Input`, [filter-toggle](filter-toggle.md), [opening-card](opening-card.md), [line-row](line-row.md),
[idea-badge](idea-badge.md), [board-search](board-search.md), [empty-state](empty-state.md).

## Used by

[search](../pages/search.md), [openings](../pages/openings.md) (filter form), [ideas](../pages/ideas.md),
[map-index](map-index.md) (compact), [answer-input](answer-input.md) (shares its matcher), the header's search
([menu](../navigation/menu.md)).

## From v1

**Keep**, behaviour unchanged: matching, ranking, "why it matched", the filters and the hash all work as in v1.
`apps/web/src/features/search/search-page.tsx` searches courses and lines with `editDistance`, `matchesText` and
`relevance` (`packages/core/src/search/text-match.ts`) and says why with `matchReason`
(`packages/core/src/search/filter.ts`); the query lives in the hash (`apps/web/src/features/search/hash-state.ts`).
v2 adds ideas and authored openings to what is searched, plus the compact drop-down and the `/` key, which change
nothing about how a search matches.
