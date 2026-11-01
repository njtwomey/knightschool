# Idea badge

An idea's name as a small chip: hover for what it is, click to go to its page.

## Shows

- the idea's name ("Fork", "Minority attack", "Carlsbad structure", "Develop before attacking", "Fried Liver");
- a small icon for its kind: tactic, plan, structure, principle, trap pattern (one icon each, the same in the
  [ideas](../pages/ideas.md) list);
- optionally the learner's progress with it as a dot: not seen, seen, practised ([state-badge](state-badge.md)
  colours).

## Configuration

- `idea`: its id, from the ideas in content (v1's motifs carried over).
- `progress`: show the dot or not (on in the Done stage of a step and on Today, off in running text).
- `size`: inline (in a sentence) or chip (in a row of badges).
- Settings read: none.

## Behaviour

- **Hover, focus or long-press**: a [hint](hint.md) card with the idea's one-sentence summary and, for a tactic, a
  [board-thumb](board-thumb.md) of its clearest example position.
- **Click or Enter**: the [idea](../pages/idea.md) page. In the middle of an exercise the link opens in a new tab, or
  waits until the exercise is answered, so a session is never lost to a click.
- Hidden at the `test` reveal level when the idea would name the answer ("Fork" on a puzzle before it is solved), and
  shown at `answered` ([reveal](../patterns/reveal.md)).
- An idea id that no longer exists shows as plain text, never a broken link.

## Composed of

shadcn `Badge`, [hint](hint.md), [board-thumb](board-thumb.md).

## Used by

[board-notes](board-notes.md), [move-explanation](move-explanation.md), [verdict-note](verdict-note.md),
[board-feedback](board-feedback.md), [position-features](position-features.md), [rich-text](rich-text.md) (ideas named
in text), [step-row](step-row.md), [opening-intro](opening-intro.md), [puzzle-card](puzzle-card.md); pages
[step](../pages/step.md) (Done: what you learned), [ideas](../pages/ideas.md), [idea](../pages/idea.md),
[opening](../pages/opening.md), [today](../pages/today.md).

## From v1

Repurpose the motif badges: motifs from `content/motifs.yaml` shown on v1's course page and searchable in the Glossary
(`apps/web/src/features/glossary`), drawn with `components/tags/tag-badge.tsx`; motifs on a move's annotation
(`Explanation.motifs` in core `explain/types.ts`). Motif tags in core `content/tags.ts` become idea ids.
