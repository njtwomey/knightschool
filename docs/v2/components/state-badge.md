# State badge

How far along something is, as one small badge with an icon, a word and a colour that look the same everywhere.

## Shows

One of five states, each with a fixed icon and colour from [colours](../patterns/colours.md):

| State    | Icon          | Word     | Meaning, on hover                                                                                            |
| -------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| locked   | padlock       | Locked   | "Opens when step 3 is known, or test out." (names what opens it)                                             |
| open     | empty circle  | Open     | "Nothing studied yet."                                                                                       |
| learning | half circle   | Learning | "Some moves are in your reviews, not all sure yet."                                                          |
| known    | ticked circle | Known    | A move or step: "Every move right in its last two answers." A variation: "Its checkpoint is cleared."        |
| mastered | cap           | Mastered | A move or step: "Every move is now asked a week or more apart." A variation: "Every step in it is mastered." |

Moves, steps and variations use all five, with the same words (one set of states, [model](../model.md)). An opening has
no badge: it shows a [progress-ring](progress-ring.md) and whether its final test is cleared. An idea uses open,
learning (seen) and known (practised). The rules behind known and mastered are config (`judge.knownRule`,
`judge.masteredDays`, [config](../config.md)).

## Configuration

- `state`, and `of`: step, variation, opening, move or idea (chooses the word and the hover sentence).
- `size`: `badge` (word and icon) or `dot` (icon only, coloured; the map, move chips, stage dots).
- `reason`: an override for the hover sentence ("Opens when step 3 (Giuoco Piano) is known").
- Reads `teach.gates` (config) and the learner setting `learning.gatesRelaxed`: with gates off or relaxed, locked is
  drawn as open with a "suggested later" hover, never a padlock.

## Behaviour

- Hover or long-press: a [hint](hint.md) with the meaning and, for locked, what opens it.
- Not clickable on its own; the row or card around it carries the link.
- A screen reader reads the word and the reason, never the icon.
- The state is always derived from the answers ([use-progress](../hooks/use-progress.md)); the badge never stores it.

## Composed of

[hint](hint.md), shadcn `Badge`.

## Used by

[step-row](step-row.md), [variation-list](variation-list.md), [opening-card](opening-card.md), [map-tree](map-tree.md)
and [map-legend](map-legend.md) (the dot form, for move states), [idea-badge](idea-badge.md), [line-row](line-row.md)
(its bar's key), [stats](../pages/stats.md).

## From v1

Repurpose. `apps/web/src/features/path/unit-state.ts` (`STATE`) names, draws and explains v1's unit states (locked,
ready, learning, passed, graduated) with lucide icons and a blurb. v2 renames "ready" to open, "passed" to known and
"graduated" to mastered, and widens it from units to every piece.
