# Practice bar

The one-line summary above a running session of what it was set up with, and **Change**.

## Shows

- One line of muted text describing the session's set-up in words: "Due today (your schedule), 1 move per question",
  "From My repertoire, favouring popular, 5 lines to move 10", "Puzzles from the Italian Game, 900 to 1300, you solve".
- A small mode icon in the mode's colour at the start, so the bar says which mode at a glance.
- How far along, at the end: "7 of 20".
- **Change**, a link-style button with a settings icon.

## Configuration

- `mode`, `config` (the running session's own copy, never the saved one), `onStart(config)`.
- `only`, `title`: passed on to the card when Change opens it (as in [practice-setup](practice-setup.md)).
- `summary`: replaces the generated words (a line's quiz says "Every question of the Fried Liver Attack").
- `progress`: the "7 of 20" counter, or none for a timed run (the clock already says it).
- Reads nothing directly; the words come from the config.

## Behaviour

- **Change** replaces the bar, in place, with the set-up card holding a copy of the session's config, labelled
  **Start again**. The session carries on underneath, paused only in Speed (the clock stops while the card is open).
- Cancel puts the bar back and the session continues exactly where it was.
- Start again begins a new session with the new config and saves it as the mode's default.
- On a phone the line wraps; Change stays at the end of the last line.
- Keyboard: Change is a normal button; Escape on the open card is Cancel.

## Composed of

[practice-setup](practice-setup.md), shadcn `Button`.

## Used by

[review](../pages/review.md), [drill](../pages/drill.md), [puzzles](../pages/puzzles.md),
[play-on](../pages/play-on.md), [speed](../pages/speed.md), [name-it](../pages/name-it.md),
[checkpoint](../pages/checkpoint.md) (summary only, no Change: a checkpoint's set-up is fixed).

## From v1

Keep. `PracticeBar` in `apps/web/src/components/practice-setup.tsx` already shows `describeConfig`'s words
(`apps/web/src/data/practice-config.ts`) with Change opening the card in place and "Start again". v2 adds the mode
icon and the progress counter.

## Open questions

- Should Change pause a Review session's timing (it feeds Easy within 5 s)? Proposed: yes, the time of an open card is
  not counted.
