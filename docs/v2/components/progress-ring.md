# Progress ring

A small ring showing the share of the learner's moves known and mastered, for a step, variation, opening or the whole
repertoire.

## Shows

- A ring in two arcs: mastered (solid) and known but not yet mastered (lighter), over a faint track for the rest. The
  colours are the known and mastered state colours ([colours](../patterns/colours.md)).
- In the middle, the share known, as a whole percentage ("62%"). At `size="xs"` there is no number.
- Beside it, optionally, a label: "26 of 42 moves known, 9 mastered".
- A small tick in place of the number once everything is mastered, and a flag once the final test (or checkpoint) is
  cleared.

## Configuration

- `scope`: a step, a variation, an opening or the repertoire; the counts come from
  [use-progress](../hooks/use-progress.md).
- `size`: `xs` (inline in rows), `sm` (cards), `md` (the opening page header).
- `label`: none, short ("62%"), or long (the sentence above).
- Reads the setting `level.includeRare` (rare-line moves count only when they are being learned) and the config keys
  `judge.knownRule` and `judge.masteredDays` (what counts as known and mastered: two right in a row, seven days and more
  by default).

## Behaviour

- Hover or long-press: a [hint](hint.md) with the long label and the breakdown ("Known 17, mastered 9, learning 6, not
  started 10").
- Not a link by itself; it sits inside a card or row that is.
- Animates once from its last value when it changes after an answer; no animation under reduced motion
  (`access.reducedMotion`).
- Nothing started: an empty track with "0%" and the label "Not started".
- Loading: a grey ring with no number.

## Composed of

[hint](hint.md), an inline SVG ring (no chart library).

## Used by

[opening-card](opening-card.md), [repertoire-slots](repertoire-slots.md), [variation-list](variation-list.md),
[opening](../pages/opening.md) header, [today](../pages/today.md), [ideas](../pages/ideas.md) (per idea, practised).

## From v1

New, over existing counts. v1 shows a course's progress as a straight bar (`Progress` in
`apps/web/src/features/search/course-card.tsx`, from `courseProgress` in `packages/core/src/search/progress.ts` and
`percent` in `apps/web/src/data/progress-store.ts`), with learned moves only. The ring adds the mastered split.
