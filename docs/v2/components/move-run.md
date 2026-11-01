# Move run

A run of moves written inline, "1. e4 e5 2. Nf3 Nc6 3. Bc4", every move a chip, flowing like text.

## Shows

- moves as [move-chip](move-chip.md)s with the numbers written by the one rule: a space after each number in a run
  ("1. e4 e5 2. Nf3", "3... Nf6 4. Ng5"), the number repeated for Black only at the start or after a break;
- "…" in front when earlier moves are left out, itself a chip that previews where the run starts;
- optional emphasis on a stretch: the step's own moves bold, the moves leading in muted;
- the learner's moves bold when asked (a step row: "yours in bold").

## Configuration

- `moves`: a start position and the moves from it (or a path through the tree).
- `from`, `to`: the stretch to show; `truncate` to a number of moves with "…".
- `emphasis`: which moves are the point, which lead in, which are the learner's.
- `board`: passed on to every chip (nearest board by default).
- `wrap`: flows and wraps like a sentence (default), or stays on one line and fades at the edge (engine lines, tables).
- Settings read: `board.notation`.

## Behaviour

- Each move behaves as a chip: hover previews it, click goes there
  ([use-move-interaction](../hooks/use-move-interaction.md)).
- Hovering the run as a whole does nothing of its own; only the move under the pointer counts.
- In a one-line run the full run is in its accessible name and in a [hint](hint.md) when cut short.
- At the `test` reveal level a run never includes moves not yet answered.

## Composed of

[move-chip](move-chip.md).

## Used by

[move-table](move-table.md) (inline layout), [board-eval](board-eval.md) (engine lines), [verdict-note](verdict-note.md)
(the refutation), [rich-text](rich-text.md) (moves in text), [step-row](step-row.md), [line-row](line-row.md),
[position-card](position-card.md), [opening-card](opening-card.md), [search-box](search-box.md) results,
[gap-link](gap-link.md).

## From v1

Repurpose the `inline` layout of `apps/web/src/components/move-list.tsx` and the path's
`features/path/stretch-moves.tsx` (a unit's moves, the learner's in bold). Numbering stays core `chess/notation.ts`
(`numberedLine`, `runMove`); never written by hand.
