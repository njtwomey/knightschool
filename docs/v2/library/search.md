# search

Finding things: a forgiving text match with "why it matched", filters over openings and lines, and positions to the
lines that pass through them.

## Gives

- **Text match**: `fold` (lower case, accents and punctuation gone), `words`, `editDistance`, `matchesText`,
  `matchesAll`, `matchesExactly`, `relevance(query, fields) → score`, and `matchReason` ("name", "a line's name", "an
  idea", with the matched words) for the "why it matched" line.
- **Filters**: `filterOpenings(catalog, { side, level, style, repertoire })` and `searchLines(catalog, query, filters)`,
  `inStudyOrder` (tracks' order), `allLines`. As built, in `components/finding/search.ts`: `passesWho`, `passesScope`,
  `passesKind`, `openingRole`, `nearestName`, `quoteFrom`.
- **By position**: every opening and line through a position, transpositions included. As built: `indexLines(lines)` in
  memory over the openings' trees, `linesAt(index, epd, played, kind)`, `nextMoves(hits)`, `throughPosition(items, hits)`;
  there is no `lines_at` table yet.
- **Ideas**: ideas are searchable by name, summary and kind, and an idea's results list what links to it.
- **`rankResults(results, query)`**: the SQLite full-text results (`knowledge.sqlite` `search`) re-ranked with
  `relevance` and `editDistance`, so a slip in spelling still finds the opening.

## Takes

[tree](tree.md) and the catalogue's shapes from [schema](schema.md); [chess](chess.md) for EPDs. Nothing else.

## Rules

- **Forgiving** (v1's rules): words run together ("carokann" finds "Caro-Kann"), and small slips (none for short words,
  one from five letters, two from eight; a swap of neighbouring letters counts as one) still match in titles, never in
  prose; every query word must match something, in one field or across them.
- **Ranked by relevance** (`searchItems`, weights in `search.weights`): where it matched sets the tier (the name, a line
  inside, the opening around it, a description, a comment), how well it matched moves it up to 40% within the tier, so a
  slip in a name stays above an exact word in a description; ties keep the order given, which is study order.
- **Every result says why it matched**, in words the search box shows under it.
- **Transpositions match**: board search goes by EPD, so a position reached by another order finds the same lines.
- **Authored openings** are searched in memory and merged with the shipped results (v1 left them out of board search;
  v2 includes them, built.md).
- The settings page's search uses the same match over the registry's labels and hints ([settings](settings.md)).

## Used by

[settings](settings.md) (`settingRows`); [search-box](../components/search-box.md),
[board-search](../components/board-search.md), [filter-toggle](../components/filter-toggle.md) (the filters' values),
[map-index](../components/map-index.md), [catalog store](../stores/catalog.md); pages [search](../pages/search.md),
[openings](../pages/openings.md), [ideas](../pages/ideas.md), [settings](../pages/settings.md);
`scripts/content-build.ts` (the `lines_at` and `search` tables).

## From v1

- `packages/core/src/search/text-match.ts`: **keep**.
- `packages/core/src/search/filter.ts` (`filterCourses`, `searchLines`, `matchReason`, `inStudyOrder`, `roleOf`):
  **keep**, renamed to openings; the "play it / against it" role gives way to repertoire slots and style.
- `packages/core/src/search/position-search.ts` (`buildSearchIndex`, `searchAt`): **keep**, over `lines_at` in v2.
- `packages/core/src/search/progress.ts`: moves to [training](training.md).
- `rankResults`, idea search: **new**.

## Tests

The existing `filter` and `position-search` tests stay; text-match gains table-driven cases for run-together words,
slips at each length, accents, and the reason given. New: authored openings merged into board search; ranking ties keep
study order.
