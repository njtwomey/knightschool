# Idea

One idea ("the fork", "the minority attack", "the Carlsbad structure"): what it is in a paragraph and a diagram or two,
then every step, move and puzzle that shows it. For learners following an idea's name from a step, a verdict or a
puzzle's theme.

## Address

`/ideas/<idea>`, `<idea>` a slug from `content/ideas.yaml` (v1 motif ids kept). Hash: `#m=<uci.uci...>` when the board
has been moved off the diagram ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

Any [idea-badge](../components/idea-badge.md): in a step's Read and Done stages,
[board-notes](../components/board-notes.md), [verdict-note](../components/verdict-note.md) ("this is a fork"), a
puzzle's themes, the opening introduction; the [ideas](ideas.md) list; [search](search.md)
([../navigation/cross-links.md](../navigation/cross-links.md)).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Ideas › (idea, a menu of ideas of the same kind).

1. Heading: the name, its kind, the learner's progress on it ([state-badge](../components/state-badge.md)).
2. Two columns from lg:
   - Left: the explanation as [rich-text](../components/rich-text.md), with its positions clickable, and "related
     ideas" as [idea-badge](../components/idea-badge.md)s.
   - Right: a [board](../components/board.md) in the `study` preset on the first diagram, with
     [board-controls](../components/board-controls.md), [board-notes](../components/board-notes.md),
     [position-features](../components/position-features.md) (hovering "the knight forks king and rook" lights both)
     and [mark-key](../components/mark-key.md). A second diagram, when written, is a second stop on the stepper.
3. **Steps that show it**: [step-row](../components/step-row.md)s, the learner's openings first, each with its opening.
4. **Moves that show it**: [position-card](../components/position-card.md)s for moves tagged with it, each with its
   [move-run](../components/move-run.md) and opening.
5. **Puzzles**: [puzzle-card](../components/puzzle-card.md)s matched at the "same idea" level, preferring positions
   from the learner's repertoire ([../puzzles.md](../puzzles.md)), and **Practise this idea**.

## Behaviour

- Board `study`: marks, eval and explorer all shown. Clicking a step row's moves or a position card puts that position
  on this board; it never leaves the page until a name is clicked.
- With no repertoire, steps and puzzles are drawn from the whole catalogue and say so.
- An idea with no puzzles (a principle such as "develop before attacking") shows the steps and moves only; the
  puzzles section is left out, not shown empty.
- An unknown idea goes to [not found](not-found.md), with the nearest names offered.

## Leads to

[step](step.md), [line](line.md) from a position card, [puzzles](puzzles.md) (`/practice/puzzles/ideas/<idea>` for
**Practise this idea**, `/practice/puzzle/<id>` for one), another [idea](idea.md), [opening](opening.md).

## From v1

Glossary entries (`features/glossary/glossary-page.tsx`, `motif-chip.tsx`) had no page of their own; `explain/motif.ts`
spots some motifs on the board. Verdict: **new**.
