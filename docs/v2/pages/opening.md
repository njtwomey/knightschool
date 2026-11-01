# Opening

One opening for one side ("Italian Game, as White"): its introduction, what to do next, its variations with their
steps in order, a board to study from, and every line, openable freely. The page a learner returns to between steps.

## Address

`/openings/<opening>` (Overview), with tabs `/openings/<opening>/lines` and `/openings/<opening>/map` (the
[map](map.md) scoped to this opening). `<opening>` is the v1 course id, unchanged. Hash on Overview:
`#v=<variation>&m=<uci.uci...>`: the variation unfolded and the board's moves
([../navigation/url-state.md](../navigation/url-state.md)). Reserved words under an opening: `step`, `lines`, `map`,
`test`; no variation may use them ([../navigation/routes.md](../navigation/routes.md)).

## Reached from

[opening-card](../components/opening-card.md)s on [Today](today.md), [repertoire](repertoire.md),
[openings](openings.md) and [search](search.md); the opening crumb of every page below it
([../navigation/trails.md](../navigation/trails.md)).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › (opening, a menu of every opening) › tabs Overview, Lines, Map.

1. Heading: [opening-name](../components/opening-name.md) with ECO and Lichess link, side, style tags,
   [progress-ring](../components/progress-ring.md), and **Add to repertoire** or "In your repertoire".
2. [mode-counts](../components/mode-counts.md): Learn 12/40, Review 6 due, Drill, Puzzles 3/15, each a link.
   Beside it [next-action](../components/next-action.md) for this opening only, and its own coverage by move
   10 with its biggest gap ([gap-link](../components/gap-link.md)).
3. Two columns from lg (`.board-columns`, [../patterns/layout.md](../patterns/layout.md)):
   - Left: [opening-intro](../components/opening-intro.md) (summary, then idea, risks, who it suits in three columns,
     origin), its ideas as [idea-badge](../components/idea-badge.md)s, then
     [variation-list](../components/variation-list.md): each variation's name, two-sentence introduction, its
     [step-row](../components/step-row.md)s with [state-badge](../components/state-badge.md)s, and its checkpoint row.
     At the end, the **final test** row.
   - Right: a [board](../components/board.md) in the `study` preset with
     [board-controls](../components/board-controls.md), [board-eval](../components/board-eval.md) (strip),
     [board-notes](../components/board-notes.md) and [mark-key](../components/mark-key.md); hovering a step row shows
     where it starts.
4. **Puzzles from this opening**: three [puzzle-card](../components/puzzle-card.md)s (family and named-variation level).
5. **Settings for this opening**: [setting-inline](../components/setting-inline.md) rows on the "this opening" layer
   (only main lines here, include rare lines), each saying where its value came from.
6. [sources-list](../components/sources-list.md).

**Lines tab**: a [sortable-table](../components/sortable-table.md) of [line-row](../components/line-row.md)s (name,
[kind-badge](../components/kind-badge.md), variation, moves as a [move-run](../components/move-run.md), state), filtered
by kind with a [filter-toggle](../components/filter-toggle.md); a row opens the line.

## Behaviour

- Every line and every step can be opened from here, whatever the path says (free choice beside the path). The first
  step is always open; opening a later locked step asks once per opening, "Start here? Earlier steps stay open to come
  back to", and never again ([../experience.md](../experience.md), Guards).
- A locked variation shows its checkpoint's **Test out** beside the lock.
- Clicking a move anywhere on the page moves the board there
  ([../hooks/use-move-interaction.md](../hooks/use-move-interaction.md)); arrow keys step the board
  ([../navigation/shortcuts.md](../navigation/shortcuts.md)).
- An authored opening shows **Edit**. An unknown id goes to [not found](not-found.md).

## Leads to

[step](step.md), [variation](variation.md), [line](line.md) (`/openings/<opening>/lines/<line>`),
[checkpoint](checkpoint.md) (variation checkpoint and final test), [drill](drill.md), [review](review.md) and
[puzzles](puzzles.md) scoped to this opening, [map](map.md), [create-opening](create-opening.md) for **Edit**.

## From v1

`features/course/course-page.tsx` (with `course-intro.tsx`, `lines-table.tsx`, `board-panel.tsx`) and the Path tab
(`features/path/path-page.tsx`, `unit-row.tsx`). Verdict: **repurpose**: the Overview and Path tabs become one page
of variations and steps; the course Tree tab becomes Map.
