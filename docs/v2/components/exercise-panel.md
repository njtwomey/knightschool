# Exercise panel

The panel beside the board in any exercise: what to do, how many tries are left, what help was used, and Next.

## Shows

- **The prompt**, one line, in the mode's colour: "Your move as White", "Find the punishment: Black has just played
  4...g5?", "Name this opening", "Solve: White to play and win material", "Keep your advantage for five moves".
- **Context** under it, quieter: the opening and line or step ("Italian Game, step 4"), and for an opponent's mistake
  how often it is made ("played in about 1 game in 4 at your level").
- **Tries left**: two small markers that empty on a wrong move ("1 try left").
- **Help used**: Hint (the piece) and Show me (the move) as two small markers that light once used, since they count
  ("Hint used: this counts as Hard").
- **Progress**: "3 of 12" with a thin bar, or the clock in a timed run.
- When answered: the result line ("Right", "Right with a hint", "Shown"), and while there is something to read, the
  explanation and **Next**.

## Configuration

- `exercise` and the session state from [use-exercise-session](../hooks/use-exercise-session.md) (the panel reads,
  never grades).
- `slots`: what the page adds under the prompt: the [answer-input](answer-input.md) (typed modes), a step's stage
  dots, a Play on target ("Stay above +1.0").
- Reads `feedback.triesAllowed` (how many markers), `feedback.speed` (how long a right answer's note stays before the
  next exercise), `feedback.explain` (symbol, sentence, or refutation too) and `learning.hintsFade`.

## Behaviour

- **Nothing waits for a click when you are right**: a right move flashes a tick, its comment stays in the panel until
  the next move, and play carries on ([feedback-timing](../patterns/feedback-timing.md)).
- A wrong move: a cross, a try marker empties, the verdict appears here ([verdict-note](verdict-note.md)) and on the
  board ([board-feedback](board-feedback.md)).
- A miss (out of tries, or Show me) and a typed answer stay up with **Next**, because there is an explanation to read;
  Enter or the right arrow presses Next ([use-shortcuts](../hooks/use-shortcuts.md)).
- Hint and Show me live in the board's control row ([board-controls](board-controls.md)); the panel only reports them.
- Nothing in the panel leaks the answer before it is given ([reveal](../patterns/reveal.md)).
- On a phone the panel sits directly under the board and controls, the prompt first.

## Composed of

[verdict-note](verdict-note.md), [verdict-badge](verdict-badge.md), [move-chip](move-chip.md),
[answer-input](answer-input.md), [opening-name](opening-name.md), [setting-inline](setting-inline.md) ("Too fast? Slow
the feedback down", after a few quick misses), shadcn `Card`, `Progress`, `Button`.

## Used by

[step](../pages/step.md) (Try and Their mistakes), [review](../pages/review.md), [drill](../pages/drill.md),
[puzzles](../pages/puzzles.md), [play-on](../pages/play-on.md), [checkpoint](../pages/checkpoint.md),
[speed](../pages/speed.md), [name-it](../pages/name-it.md).

## From v1

Repurpose. Each v1 mode has its own: `apps/web/src/features/play/play-panel.tsx` (instruction, upcoming note, progress,
moves), `apps/web/src/features/quiz/move-view.tsx` and `quiz-view.tsx`, and the panels inside
`apps/web/src/features/speed/speed-page.tsx` and `apps/web/src/features/name-it/name-it-page.tsx`. v2 makes one, fed by
the shared session, with tries and help shown live.
