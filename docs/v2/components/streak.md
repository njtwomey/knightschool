# Streak

Days in a row the learner has practised, kept light: a number and a small flame, nothing to buy, lose or win.

## Shows

- A small icon and a number: "6 days". Under it, in the `full` form, "Practised every day since Monday" and today's
  state: "Done today" with a tick, or "Not yet today" in a quiet tone.
- The longest streak so far, in muted text: "Longest: 21 days".
- No currency, freezes for sale, wheel, gifts, badges or leagues (features.md P4: reviewers say they crowd out the
  teaching, and leagues would need a server).

## Configuration

- `form`: `chip` (the header, beside coverage) or `full` (Today, Stats).
- What counts as a day practised: any graded answer (a review, a step's Try, a drill, a puzzle, a Speed line, a Name it
  answer), in the learner's local day. Learn alone, with every move shown, does not count.
- Reads `progress.showStreak` (on by default; off hides the chip and the Today block entirely, for learners who find a
  streak stressful) and the learner's time zone through `lib/days`.

## Behaviour

- Hover or long-press the chip: a [hint](hint.md) with "6 days in a row. Answer one review today to make it 7", or "Done
  for today" once something has been answered.
- Click the chip: [stats](../pages/stats.md), scrolled to the [activity-calendar](activity-calendar.md).
- A missed day resets to 0 quietly: no message, no warning banner. The number simply restarts tomorrow. Today being not
  yet practised never breaks the streak until the day is over.
- Zero: the chip shows nothing in the header (a "0 days" chip nags); Today shows "Start a streak: answer one review".
- Derived from the answer log every time; nothing about the streak is stored.

## Composed of

[hint](hint.md), an icon from lucide.

## Used by

The header ([menu](../navigation/menu.md)), [today](../pages/today.md), [stats](../pages/stats.md),
[activity-calendar](activity-calendar.md) (its summary line).

## From v1

Repurpose. `streak(reviewDays, today, previous)` in `packages/core/src/training/stats.ts` already counts days in a row
from review days, and `apps/web/src/features/profile/stats/stats-page.tsx` shows it; `localDay` and `previousDay` are
in `apps/web/src/lib/days.ts`. v2 counts every graded answer, not only reviews, and shows it in the header.

## Open questions

- `progress.showStreak` is a proposed key; settings.md does not list a streak setting yet.
- Whether a Learn session (every move shown) should count as practice. This file says no.
