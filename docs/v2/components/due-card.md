# Due card

The reviews due now, how long they will take, and one button into them.

## Shows

- A card in the Review mode's colour with the count as a large number: "14 due", and under it "about 6 minutes".
- A short breakdown by opening, as [opening-name](opening-name.md)s with counts ("Italian Game 9, Caro-Kann 5"), and by
  kind when there are several ("12 moves, 2 questions", later "3 puzzles, 1 from your games").
- New moves waiting today: "+ 4 new moves today" (from the daily allowance), quieter than the due count.
- When the next review falls: "Next one due in 3 hours" once nothing is due now.
- The button: **Review now**.

## Configuration

- `scope`: the repertoire (Today, Practice) or one opening (its page).
- `form`: `card` or `inline` (one line, "14 due, about 6 minutes, Review now", for the header menu and the opening
  card).
- Reads `review.newPerDay` (the new moves line), `review.sessionSize` (the button says "Review 20 of 34" when more are
  due than one session holds) and `review.order` (due first, by opening, mixed: worded on hover).

## Behaviour

- **Review now** starts the scheduled session at once, with no set-up card ([review](../pages/review.md), the
  `#start=due` address of v1 kept).
- Click an opening's count: the same session limited to that opening.
- Hover the time estimate: "From your average time per answer over the last two weeks" ([hint](hint.md)).
- Nothing due and nothing new: the card turns quiet: "Nothing due. Next review tomorrow morning", and offers free
  practice ("Practise anyway: never changes your schedule") through [practice-setup](practice-setup.md).
- Many due (more than three sessions): "34 due. One session of 20 is a good start", with no alarm colours.
- Loading: the card with a skeleton number. The count is re-read after every finished session.

## Composed of

[opening-name](opening-name.md), [hint](hint.md), shadcn `Card` and `Button`.

## Used by

[today](../pages/today.md), [practice](../pages/practice.md), [opening](../pages/opening.md) (scope one opening),
[next-action](next-action.md) (uses its count to decide whether review comes first).

## From v1

Repurpose. Home shows the due count as a tile and on the Quiz button (`apps/web/src/features/home/home-page.tsx`, via
`storage.cards.countDue`); Overview lists due and new counts per enrolled course
(`apps/web/src/features/profile/overview/overview-page.tsx`, `loadRows`); both link to `dueQuizHref`
(`apps/web/src/router/hrefs.ts`). v2 joins them into one card with a time estimate.
