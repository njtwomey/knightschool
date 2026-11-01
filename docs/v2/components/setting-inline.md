# Setting inline

A setting offered where it bites: one short line with the control right there, such as "Too fast? Slow the feedback
down" at the end of a step. The same registry entry as the settings page, met at the moment it matters.

## Shows

- **A question or observation** in muted text, written for the moment: "Too fast? Slow the feedback down", "40 reviews
  due. Fewer new moves a day?", "These puzzles too hard? Lower the rating range."
- **The control**, as a compact [settings-row](settings-row.md) without its label (the line is the label).
- **Not now** and **More settings** (a link to the group on the settings page, `/settings#group=feedback`).

## Configuration

- `setting`: the registry key.
- `prompt`: the line's words; one per place, written with the page.
- `layer`: usually `you`; on an opening's page `opening`.
- `when`: the condition the page checks before showing it (below). The component never decides on its own.

## Behaviour

- **When it appears**, examples:
  - End of a step ([session-summary](session-summary.md)): three or more misses in the step, each played in under a
    second, offers `feedback.speed`.
  - [due-card](due-card.md) on Today: more reviews due than a session holds three days running offers
    `review.newPerDay`.
  - After five puzzles in a row missed, offers the puzzle rating range.
  - A line drilled with the engine strip hidden offers `engine.on` on the drill's end screen.
- **At most once per session** for a given setting, and never during a test (only on summaries, end screens and pages
  that are not testing).
- **Changing it** saves at once, as any row: a [notice](notice.md) with [undo-button](undo-button.md). The line then
  says "Saved. Feedback is now slow everywhere." and fades after the next action.
- **Not now** hides it for this session; three "Not now"s for the same setting stop it for good (a device setting,
  "Suggest settings", which the settings page can turn back on).

## Composed of

[settings-row](settings-row.md), [notice](notice.md), [undo-button](undo-button.md), shadcn `Button`.

## Used by

[session-summary](session-summary.md), [due-card](due-card.md), [practice-setup](practice-setup.md); pages
[step](../pages/step.md), [puzzles](../pages/puzzles.md), [opening](../pages/opening.md).

## From v1

New. v1 sets the training values only on the settings page (`features/profile/settings/training-section.tsx`) and
the board's look in the gear (`components/board/board-settings.tsx`).

## Open questions

- The triggers above are guesses. Which three are worth building first?
