# Mode counts

What there is to do in an opening, per mode, each in its own colour: "Learn 12/40, Review 6 due, Puzzles 3/15".

## Shows

A row of small coloured pills, one per mode, in a fixed order, each with an icon, the mode's name and a count:

| Mode    | Count                                       | Example      |
| ------- | ------------------------------------------- | ------------ |
| Learn   | steps passed out of steps in the opening    | Learn 12/40  |
| Review  | moves and questions due now                 | Review 6 due |
| Drill   | lines drilled clean out of lines with cards | Drill 4/18   |
| Puzzles | puzzles solved out of puzzles matched       | Puzzles 3/15 |
| Play on | positions held out of Play on positions     | Play on 1/3  |

Each mode's colour comes from the one table in [colours](../patterns/colours.md), the same colour as that mode's tile
on the practice page and its pill in the menu, so the colour alone soon says which mode.

A mode with nothing to count is left out (an opening with no puzzles shows no Puzzles pill). Review shows "Review: none
due" in a quiet tone when nothing is due, since that is good news.

## Configuration

- `scope`: an opening (the usual), a variation, or the repertoire (the counts summed).
- `modes`: which modes to show, in the fixed order (Today shows Learn and Review only).
- `size`: `full` (name and count) or `compact` (icon and count, the name in a hint).
- Reads `review.newPerDay` (Learn shows "2 new today" when today's allowance is not used) and `level.includeRare`.

## Behaviour

- Each pill is a link straight into that mode for the scope: Learn opens the next step, Review starts the due session
  for this opening, Puzzles starts puzzles from it, and so on.
- Hover or long-press: a [hint](hint.md) with what the count means ("12 of 40 steps passed; 2 new moves left today").
- Counts update after each answer; no number jumps while a session is running on the same page.
- Loading: grey pills of the right width with no numbers.

## Composed of

[hint](hint.md), shadcn `Badge`.

## Used by

[opening-card](opening-card.md), [repertoire-slots](repertoire-slots.md), [opening](../pages/opening.md) header,
[variation](../pages/variation.md), [today](../pages/today.md), [practice](../pages/practice.md) (per opening in the
set-up's source list).

## From v1

New. Chessreps' per-course counters, in the survey. v1 computes the pieces separately: due count and new cards per
course in `loadRows` (`apps/web/src/features/profile/overview/overview-page.tsx`), unit states on the Path tab.
