# Sortable table

A table whose headings sort it up, then down, then back to its own order, and whose rows are links.

## Shows

- A table with a heading row; each sortable heading is a button with an arrow showing the sort (up, down, or a faint
  double arrow when not sorted by it).
- Rows with a stretched link: a click anywhere on the row opens it, while the buttons and links inside the row keep
  their own clicks.
- An actions column at the end, when rows have icon actions, with a heading read only by screen readers.
- On a phone, each row becomes a card with the same content stacked (the table never scrolls sideways).

## Configuration

- `columns`: key, heading, how to compare, and classes (numbers right-aligned).
- `initial`: the table's own order (study order, newest edit first), which need not be a column.
- `fallback`: how ties are broken.
- `rows`, and for each row its link (an address) or an action (select it on the page's board).
- `filters`: [filter-toggle](filter-toggle.md)s and a compact [search-box](search-box.md) above the table, when
  wanted.
- Reads nothing from settings; the sort is not stored (it resets with the page), unless the page keeps it in its hash.

## Behaviour

- Click a heading: sort by it, ascending. Again: descending. A third time: back to the table's own order. A heading
  that is the table's own order has just two states.
- Ties keep the table's own order, so sorting is stable.
- The row link is one focus stop for the keyboard and one link for screen readers, named by the row's main text;
  controls inside the row are separate stops. **Never an `onClick` on a row.**
- The active heading carries `aria-sort`.
- Empty: the heading row stays and one row says why ([empty-state](empty-state.md)): "No openings for Black match these
  filters".
- Loading: three skeleton rows.

## Composed of

shadcn `Table` and `Button`, [icon-action](icon-action.md), [empty-state](empty-state.md),
[filter-toggle](filter-toggle.md), [search-box](search-box.md) (optional).

## Used by

[openings](../pages/openings.md) (the table view), [opening](../pages/opening.md) (every line, as
[line-row](line-row.md)s), [stats](../pages/stats.md) (most missed, slowest moves), [create](../pages/create.md),
[create-opening](../pages/create-opening.md) (its lines), [your-games](../pages/your-games.md). The row link is also
used by cards: [opening-card](opening-card.md), [step-row](step-row.md), [line-row](line-row.md).

## From v1

Keep. `apps/web/src/components/sortable-table.tsx` (`SortableHeader`, `RowLink`, `ABOVE_ROW_LINK`) with
`apps/web/src/hooks/use-sort.ts` (`useSort`) and `apps/web/src/lib/sort.ts` (`nextSort`: up, down, back to the
initial order; `sortRows` with a fallback). v2 adds the phone card layout and optional filters above.
