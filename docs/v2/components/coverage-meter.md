# Coverage meter

How much of what players at the learner's band actually play the learner knows: the share of games that stay inside
their repertoire, by move 5, 10 and 15.

## Shows

- Three short horizontal bars, labelled **By move 5**, **By move 10**, **By move 15**, each filled to the share of
  games at the band that are still inside what the learner knows at that move ("92%, 71%, 48%").
- Each bar in two tones: what the learner knows (solid) and what the opening covers but the learner has not learned yet
  (outline). The gap to the end of the bar is what nothing covers.
- A caption naming the band and the side: "Against 1.e4, in games at 1000 to 1600".
- The target as a tick on each bar, when a coverage target is set.
- In compact form, one figure only: "Covers 71% of games to move 10".

## Configuration

- `side`: white, or against 1.e4, against 1.d4 (one slot); or `repertoire` (all slots, each its own row).
- `form`: `bars` (the repertoire page, Today), `compact` (the header, slot tiles, opening cards).
- `depths`: default 5, 10, 15.
- Reads `level.band` (the band; the baked data is 1000 to 1600, other bands use the live explorer through
  [use-explorer](../hooks/use-explorer.md)) and `level.coverageTarget` (the tick, and what counts as a reply worth
  answering: 1 game in 20 by default).

## Behaviour

- Hover a bar or long-press: a [hint](hint.md) explaining it in words: "Of 100 games against your 1.e4 at this level,
  71 are still in moves you know at move 10. Learning the Two Knights would add 9."
- Click a bar: the [map](../pages/map.md) for that side, with the coverage overlay on and scrolled to that depth.
- The [gap-link](gap-link.md) usually sits right under it.
- No data for a position (the popularity file has none): those games count as unknown, and the hint says "Some
  replies have no data yet". A band with no baked data and no token says so and offers Settings.
- Rises after each step passed; it is the one number that should always go up as the learner works.

## Composed of

[hint](hint.md), [gap-link](gap-link.md) (beside it on the repertoire page), shadcn `Progress`.

## Used by

[repertoire](../pages/repertoire.md), [today](../pages/today.md), [repertoire-slots](repertoire-slots.md), the header
([menu](../navigation/menu.md)), [opening](../pages/opening.md) (for its own side).

## From v1

New, over repurposed logic. `scripts/gaps.ts` (`make gaps`) walks a side's merged repertoire against
`content/popularity/popularity.json` and weighs each unanswered reply by its games; its walk moves into core and is run
over what the learner knows instead of what the catalogue has.

## Open questions

- Whether "knows" means known (two right in a row) or merely learning; known is stricter and more honest.
