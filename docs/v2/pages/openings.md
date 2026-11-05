# Openings

Every opening in the catalogue, shipped and authored, with filters and the curriculum's tracks. For choosing a first
opening, filling a slot, or browsing what else there is.

## Address

`/openings`. Hash, written only where it differs from the default
([../navigation/url-state.md](../navigation/url-state.md)):

- `side=white|black`, `against=e4|d4|c4|other`, `style=solid|attacking|gambit|traps`, `level=<n>`;
- `track=<id>` (one curriculum track), `q=<text>`, `view=cards|table`.

v1's `/courses` lands here, and so does v1's `/openings` (an alias of Search in v1), its side filter carried over;
v1's `/browse` and `/search` go to [search](search.md).

## Reached from

- **Learn** in the menu, when there is no repertoire; **All openings** beside the repertoire's breadcrumbs.
- [Repertoire](repertoire.md): an empty slot's **Browse**, a filled slot's **Change** (filters set to that slot).
- [First visit](first-visit.md): **Look around first**. Any [opening-name](../components/opening-name.md) in a trail.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Openings › All openings.

1. A line at the top: **No idea what to pick?** Three questions to a first repertoire.
2. Filters in one row: [filter-toggle](../components/filter-toggle.md)s for side (Both, White, Black), against (for
   Black: 1.e4, 1.d4, 1.c4, other), style (solid, attacking, gambit, trap-heavy) and level; a
   [search-box](../components/search-box.md) for names; cards or table.
3. **Tracks**, when no filter is set: each curriculum track ("A first repertoire with 1.e4", "Traps every beginner
   should know") as a titled row of [opening-card](../components/opening-card.md)s in study order, with how far along
   it the learner is.
4. **Every opening**: [opening-card](../components/opening-card.md)s in a grid, each with its
   [opening-name](../components/opening-name.md) and ECO, side, style tags, a
   [board-thumb](../components/board-thumb.md), [mode-counts](../components/mode-counts.md) and
   [progress-ring](../components/progress-ring.md) once started, and "In your repertoire" on the ones that are. Or, in
   table view, a [sortable-table](../components/sortable-table.md): name, side, against, style, lines, steps, progress;
   every heading sorts up, down, then back to study order.
5. **Your own openings** from Create, as cards with "written by you", at the end.

## Behaviour

- The page opens on study order with tracks showing. Any filter hides the tracks and filters the grid; filters and
  view stay in the hash.
- A card's whole area opens the opening (a row link, [../patterns/interactions.md](../patterns/interactions.md)); its
  **Add to repertoire** [icon-action](../components/icon-action.md) keeps its own click and asks which slot when two
  fit.
- Arriving from a slot's **Change**, the cards show **Use for this slot** instead, and choosing returns to the
  repertoire.
- No match: [empty-state](../components/empty-state.md) "No opening fits these filters" with **Clear filters**.

## Leads to

- A card → [opening](opening.md) (`/openings/<opening>`).
- **No idea what to pick?** → [onboarding](onboarding.md); a mode count → that mode scoped to the opening.
- **Use for this slot** → [repertoire](repertoire.md).

## From v1

`features/courses/courses-page.tsx` (one sortable table filtered by side) and the course cards of Search
(`features/search/course-card.tsx`), with tracks from `content/curriculum.yaml`. Verdict: **repurpose**: the table
stays as a view, cards with style tags and mode counts are new.

## As built

A [sortable-table](../components/sortable-table.md), one row per opening: a board, the name, the side, what it is about,
then variations, steps and time, each sortable. A plain search above it matches the name and description only; the
deeper search, with moves and filters, is [search](search.md). A click anywhere on a row opens the opening.
