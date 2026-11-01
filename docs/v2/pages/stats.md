# Stats

How the learner is doing over time: accuracy, the moves they miss and the ones that take longest, learning status by
opening, Speed records and puzzle results. For the learner who wants evidence, and for working out what to practise.

## Address

`/you/stats`; `/you` leads here. Hash: `#range=7d|30d|90d|all&opening=<opening>`
([../navigation/url-state.md](../navigation/url-state.md)). v1's `/stats` and `/profile/stats` land here.

## Reached from

The header's right side: **You** › Stats ([../navigation/menu.md](../navigation/menu.md)); the
[streak](../components/streak.md) and calendar on [Today](today.md); a session summary's **See your stats**.

## Layout

[breadcrumbs](../components/breadcrumbs.md): You › tabs Stats, Settings, Data.

1. Filters: [filter-toggle](../components/filter-toggle.md)s for the range and one opening or all.
2. Headline numbers in a row: moves known and mastered (with [progress-ring](../components/progress-ring.md)), accuracy
   right first time, reviews done, [streak](../components/streak.md).
3. **Learning over time**: a chart of moves by state (new, learning, known, mastered) week by week, so the growth is
   visible.
4. **Accuracy over time**: right first time per week, split by mode (review, drill, checkpoint), in mode colours
   ([../patterns/colours.md](../patterns/colours.md)).
5. [activity-calendar](../components/activity-calendar.md): the past months, one square per day.
6. **Most missed moves** and **Slowest moves**: two [sortable-table](../components/sortable-table.md)s, each row a
   [move-chip](../components/move-chip.md) with its opening and step, misses or mean time, and the average centipawn
   cost of the wrong tries (from the tries log). A row opens the position.
7. **By opening**: each repertoire opening's [opening-card](../components/opening-card.md) with
   [mode-counts](../components/mode-counts.md) and its checkpoints cleared.
8. **Speed records** per set-up, **Puzzles** solved by rating band and theme, **Name it** credit.

## Behaviour

- Everything is worked out from the answer logs on arrival; nothing is stored for this page
  ([../hooks/use-progress.md](../hooks/use-progress.md)).
- Charts follow the dataviz rules of the site's tokens, light and dark; every chart has its numbers in a table for
  screen readers ([../patterns/accessibility.md](../patterns/accessibility.md)).
- No answers yet: [empty-state](../components/empty-state.md) "Stats appear once you have practised", with the next
  step.
- A missed move's row offers **Practise these**: a review of the ten most missed moves, free practice.

## Leads to

A move row → [step](step.md) that teaches it, or [review](review.md) of the most missed (`/practice/review/<opening>`
with the hardest-moves source); an opening card → [opening](opening.md); Speed records → [speed](speed.md).

## From v1

`features/profile/stats/stats-page.tsx` (with `describe-card.ts`). Verdict: **keep**, gaining learning status over time
(features.md P5), the cost column and puzzles; Overview's dashboard parts go to [Today](today.md).

## Open questions

- The "hardest moves" source (features.md T8) has no address of its own; it is a set-up card source, so the link opens
  Review with that source chosen rather than a path.
