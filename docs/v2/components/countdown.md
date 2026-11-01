# Countdown

The five-second count before a timed run and between its lines, with the name of what comes next.

## Shows

- A panel over the board area (the header stays visible and usable), with:
  - "Next up", the opening's name large, and the variation under it ("Italian Game", "Two Knights Defence");
  - the side the learner plays ("You play White");
  - the seconds left as a large number, 5 to 1, and a bar emptying under it;
  - **Start now**.
- Before the first line of a run, the same panel with "Get ready" and the run's shape ("5 lines, to move 10").

## Configuration

- `next`: the opening and line coming up (or the first one).
- `seconds`: the length, from `FEEDBACK_DELAYS.betweenLines` scaled by `feedback.speed` (slow, normal, fast).
- `onDone`: called when the count reaches zero or Start now is pressed.
- Reads `access.reducedMotion` (no emptying animation, only the number changing) and `feedback.speed`.

## Behaviour

- The count runs by itself and the run starts at zero; nothing waits for a click
  ([feedback-timing](../patterns/feedback-timing.md)).
- **Start now** (or Enter, or Space) skips the rest of the wait.
- Escape pauses the count and offers Resume and Stop the run.
- The run's clock does not run during the countdown; the time is all the learner's.
- The number is not announced every second to screen readers; the panel is announced once, with the line's name.
- Leaving the tab pauses the count; returning resumes it.

## Composed of

shadcn `Dialog` (non-modal, no close button) and `Progress`, [opening-name](opening-name.md).

## Used by

[speed](../pages/speed.md) (before the first line and between lines of a fixed run),
[checkpoint](../pages/checkpoint.md) (if a timed part is added), [play-on](../pages/play-on.md) (before a timed Play
on, later).

## From v1

Repurpose. `BetweenDialog` in `apps/web/src/features/speed/speed-page.tsx` shows "Next up", the opening and variation,
the side, a five-second number with a progress bar and "Start now", timed by `FEEDBACK_DELAYS.betweenLines` in
`apps/web/src/lib/feedback.ts`. v2 lifts it out as a component and adds pause and the speed multiplier.
