# State badge

How far along something is, as one small badge with an icon, a word and a colour that look the same everywhere.

## Shows

One of five states, each with a fixed icon and colour from [colours](../patterns/colours.md):

| State    | Icon          | Word on a step | Word on a move | Meaning, on hover                                   |
| -------- | ------------- | -------------- | -------------- | --------------------------------------------------- |
| locked   | padlock       | Locked         | (not used)     | "Pass step 3 first, or test out." (names the step)  |
| open     | empty circle  | Open           | New            | "Nothing studied yet."                              |
| learning | half circle   | Learning       | Learning       | "Some moves are in your reviews, not all sure yet." |
| known    | ticked circle | Passed         | Known          | "Every move right in its last two answers."         |
| mastered | cap           | Mastered       | Mastered       | "Every move is now asked a week or more apart."     |

A variation uses locked, open and passed (its checkpoint); an opening uses open, learning, passed (final test) and
mastered. An idea uses open, learning (seen) and known (practised).

## Configuration

- `state`, and `of`: step, variation, opening, move or idea (chooses the word and the hover sentence).
- `size`: `badge` (word and icon) or `dot` (icon only, coloured; the map, move chips, stage dots).
- `reason`: an override for the hover sentence ("Opens when you pass step 3 (Giuoco Piano)").
- Reads `learning.gates`: with gates off, locked is drawn as open with a "suggested later" hover, never a padlock.

## Behaviour

- Hover or long-press: a [hint](hint.md) with the meaning and, for locked, what opens it.
- Not clickable on its own; the row or card around it carries the link.
- A screen reader reads the word and the reason, never the icon.
- The state is always derived from the answers ([use-progress](../hooks/use-progress.md)); the badge never stores it.

## Composed of

[hint](hint.md), shadcn `Badge`.

## Used by

[step-row](step-row.md), [variation-list](variation-list.md), [opening-card](opening-card.md),
[map-tree](map-tree.md) and [map-legend](map-legend.md) (the dot form, for move states), [idea-badge](idea-badge.md),
[line-row](line-row.md) (its bar's key), [stats](../pages/stats.md).

## From v1

Repurpose. `apps/web/src/features/path/unit-state.ts` (`STATE`) names, draws and explains v1's unit states (locked,
ready, learning, passed, graduated) with lucide icons and a blurb. v2 renames "ready" to open and "graduated" to
mastered, and widens it from units to every piece.

## Open questions

- The index brief says "known", model.md says a step is "passed". This file keeps one look with two words (Passed on a
  step, variation or opening; Known on a move). Agree whether to use one word everywhere.
