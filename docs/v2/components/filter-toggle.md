# Filter toggle

A row of joined buttons, one of them chosen: every one-of-several choice and filter on the site.

## Shows

- Two to six joined buttons in a row, the chosen one filled. Each has a short label ("Both", "White", "Black") and,
  optionally, an icon or a count ("Gambit 4").
- An optional label before the row for sighted users ("Side"); the group is always named for screen readers.
- Shared option sets so the same choice reads the same everywhere: side (Both, White, Black), level (Beginner,
  Improver), kind (main, sideline, rare, gambit, traps), scope (All, Openings, Variations, Lines, Ideas), who plays it (Any, Play it, Against it), weighting (At random,
  Favour popular), and the per-mode fields of the practice card.

## Configuration

- `value`, `onChange`, `options` (value, label, hint, disabled, count).
- `allValue`: the value meaning "no filter"; choosing the chosen button again goes back to it. Without one, choosing
  the chosen button again does nothing.
- `label`, `size` (`sm` or default), `disabled`.
- Settings drawn as one-of-several (from the registry, `control: { kind: 'toggle' }`) are rendered with this, so a
  setting on the settings page and the same choice on the practice card look identical.

## Behaviour

- Click or tap a button: chooses it at once (no Apply). The page decides whether that filters, changes a setting or
  edits a draft.
- Hover or long-press a button with a hint: the hint explains it ([hint](hint.md)): "Gambit: gives material early for
  quick development".
- The chosen item is marked by `aria-checked` or `aria-pressed`, never by its data state, because a hint wrapped round
  an item overwrites that.
- Keyboard: Tab enters the group, Left and Right move, Space or Enter chooses.
- A disabled option stays visible with a hint saying why ("No Black openings yet").
- On a narrow screen the row wraps rather than scrolling sideways.

## Composed of

shadcn `ToggleGroup`, [hint](hint.md).

## Used by

[practice-setup](practice-setup.md), [search-box](search-box.md), [board-search](board-search.md),
[openings](../pages/openings.md), [map](../pages/map.md) (side), [stats](../pages/stats.md) (period),
[settings-row](settings-row.md) (one-of-several settings), [sortable-table](sortable-table.md) (filters above tables).

## From v1

Keep. `apps/web/src/components/filter-toggle.tsx` (`FilterToggle`: one chosen, `allValue`, hints, a label for screen
readers) with its option sets in `apps/web/src/components/filter-options.ts` (`SIDE_FILTER_OPTIONS` and others); the
`aria-checked` rule is in `apps/web/src/components/ui/toggle.tsx`. v2 adds counts on options and the registry's toggle
control.
