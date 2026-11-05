# Line row

One line in a list: its name, kind, moves and what the learner knows of it, with ways to see, learn and drill it.

## Shows

- The line's name ("Fried Liver Attack") and, when the list mixes openings, the opening it is seen in.
- A [kind-badge](kind-badge.md): main, sideline, rare, gambit, trap to spring, trap to avoid; with its risk when set.
- The opponent's move that reaches it ("after 4...Na5"), as a [move-chip](move-chip.md).
- Its moves from where it branches as a [move-run](move-run.md), truncated with "and 6 more" on a narrow row.
- What the learner knows of it: a thin bar (share of its learner moves known and mastered), since a line has no state
  of its own ([model](../model.md)).
- In `card` form, a [board-thumb](board-thumb.md) of the position that names it.
- Icon actions at the end: Show (on the page's board), Learn, Drill.

## Configuration

- `form`: `row` (a table row, the opening page's every-line table) or `card` (search results, the map's index hover,
  "what grows from it").
- `opening`: the opening it is opened in; links are built for that opening.
- `columns` in `row` form: which of kind, opponent, moves, known appear.
- `match` and `showKnown` in `card` form: "why it matched" under the moves, and the known bar, off in search, which does
  not load the learner's progress.
- Reads `board.notation` (letters or figurines, through the move chips).

## Behaviour

- The row is a link to the line's page ([line](../pages/line.md)); the icon actions keep their own clicks.
- **Show** puts the line's last position on the page's board without leaving the page.
- Hover a chip: highlight on the page's board, or a [position-preview](position-preview.md) when there is none.
- Hover the kind badge: what the kind means ([hint](hint.md)).
- Lines are always openable, whatever the path says (free choice beside the path).
- An alternative line (a second answer) is marked "Alternative: shown, not drilled", and Drill is absent.

## Composed of

[kind-badge](kind-badge.md), [move-chip](move-chip.md), [move-run](move-run.md), [board-thumb](board-thumb.md),
[icon-action](icon-action.md), [hint](hint.md), and [sortable-table](sortable-table.md) for the row form.

## Used by

[opening](../pages/opening.md) (every line, grouped by variation), [variation](../pages/variation.md),
[line](../pages/line.md) (what it grows from and what grows from it), [search](../pages/search.md),
[map-index](map-index.md) (its hover), [idea](../pages/idea.md).

## From v1

Repurpose. `apps/web/src/features/course/lines-table.tsx` draws a course's lines grouped by section and kind with
tags, ECO link and show, learn and drill icons; `apps/web/src/features/search/variation-card.tsx` is the card form
with a thumb. v2 merges them into one component with two forms and adds the known bar.

## Columns

`lineColumns(keys)` gives the row's cells as [sortable-table](sortable-table.md) columns (name, kind, variation,
opponent, moves, known) and `LineActions` its actions, for the opening's Lines tab; `LineTable` stays for plain lists.
