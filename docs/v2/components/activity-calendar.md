# Activity calendar

The days the learner practised over the past months, as a grid of small squares, darker for more answers.

## Shows

- A grid of days: one column per week, seven rows (Monday to Sunday), the last 26 weeks by default, today at the
  bottom right. Month names along the top, the initials M, W, F down the side.
- Each square shaded by the number of graded answers that day, in four steps from none to many, in one colour from
  [colours](../patterns/colours.md) (the Review mode's), so the eye reads density, not a rainbow.
- Below: the [streak](streak.md) summary ("6 days in a row, longest 21") and a total ("Practised on 84 days since
  May").

## Configuration

- `weeks`: 13 (Today, a phone), 26 (Stats), 52 (Stats on a wide screen).
- `scope`: everything, or one opening (the opening page's stats).
- `split`: off, or by mode, which tints each square with the colour of the mode answered most that day.
- Reads `progress.showStreak` (with streaks off, the summary line drops the streak and keeps the total) and the
  week's first day from the browser's locale.

## Behaviour

- Hover or long-press a square: a [hint](hint.md) with the date and what was done: "Tuesday 14 October: 32 answers,
  27 right; 2 steps known".
- Click a square: [stats](../pages/stats.md) filtered to that day (the moves answered, the misses).
- Keyboard: the grid is one focus stop; arrow keys move a day or a week, and the hint follows the focus.
- Before any practice: the empty grid with one line, "Your practice will show here, one square a day."
- Days before the learner's first answer are drawn faintly, not as misses.
- Derived from the answer log; nothing stored.

## Composed of

[hint](hint.md), an inline SVG grid (no chart library); the shading steps come from
[colours](../patterns/colours.md).

## Used by

[stats](../pages/stats.md), [today](../pages/today.md) (13 weeks, under the streak), [opening](../pages/opening.md)
(one opening, in its stats panel).

## From v1

Repurpose. `apps/web/src/features/profile/stats/stats-page.tsx` draws the last 14 days as bars of answers and recalled
answers, from `dailyCounts` in `packages/core/src/training/stats.ts` and `lastDays` in `apps/web/src/lib/days.ts`. v2
widens the window, draws it as a calendar, and counts every graded answer, not only reviews.
