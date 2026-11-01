# useExerciseSession

Runs a session of exercises: ask, grade, feed back, record, next; one way for every mode.

## Gives

- **phase**: idle, loading, asking, feedback (a tick or a cross showing), holding (a miss up with Next), between (a
  countdown), summary, error, as v1's `SessionPhase` with the modes' own phases merged;
- **current**: the exercise (start position, side, prompt, grader, responder), its index and the queue's length;
- **tries**: every guess on the current exercise, and **results**: every exercise answered so far, each try with its
  move, grade, centipawn cost (filled in when the judgement arrives), time and help used;
- actions: `start(config)`, `answer(move | text)`, `hint()` (piece, then move), `next()`, `skip()`, `stop()`;
- the **board model** to draw, with its reveal level moved from `test` to `answered` at the right moment.

## Takes

- a **mode definition**: how to build the queue from a config, the grader (exact move, any move that keeps the
  position, typed words), the responder (scripted, popular moves weighted by games, the engine) and what to record;
- the **config** from [practice-setup](../components/practice-setup.md) (copied at Start, so changing the set-up
  never touches a running session), or a fixed one from a step or checkpoint.

## Behaviour

- Built on v1's attempt machine: hint, show, two wrong tries (the number is a setting), then the move is shown.
- Timings come from `FEEDBACK_DELAYS`, scaled by the speed setting, scheduled with `createTimers` and all cleared on
  stop, restart or leaving the page. Nothing waits for a click when right; a miss with an explanation holds with Next.
- A wrong move asks [use-judgement](use-judgement.md) for the verdict and refutation and shows them through
  [board-feedback](../components/board-feedback.md) at once if known, else when they arrive.
- An opponent's move that is a known mistake is announced and the next exercise is to punish it.
- Records through [progress store](../stores/progress.md): a review for a card, a quiz, guess or Speed attempt, and
  every try once the attempts log is agreed. Free practice is never saved.
- One session at a time: starting a second stops the first; leaving the page stops it.

## Used by

[exercise-panel](../components/exercise-panel.md), [tries-table](../components/tries-table.md),
[session-summary](../components/session-summary.md), [practice-bar](../components/practice-bar.md),
[countdown](../components/countdown.md), [answer-input](../components/answer-input.md); pages
[step](../pages/step.md) (Try, Their mistakes), [review](../pages/review.md), [drill](../pages/drill.md),
[puzzles](../pages/puzzles.md), [play-on](../pages/play-on.md), [checkpoint](../pages/checkpoint.md), and later
[speed](../pages/speed.md) and [name-it](../pages/name-it.md).

## From v1

- `apps/web/src/features/play/store.ts` (`usePlay`), `features/quiz/store.ts` (`useQuiz`), `features/speed/store.ts`
  (`useSpeed`), `features/name-it/store.ts` (`useNameIt`): four session stores, merged into one.
- `apps/web/src/lib/session.ts` (`SessionPhase`, `sessionLoader`), `lib/feedback.ts` (`FEEDBACK_DELAYS`,
  `createTimers`), core `training/attempt.ts` (`reduceAttempt`), `features/play/record.ts`.
- `features/quiz/miss-list.tsx`: v1 keeps only the last move and lists misses at the end; v2 keeps every try.

## Open questions

1. Keeping every try needs the shared attempts log (capabilities.md 4), a new table: until it is agreed, tries live
   in the session and in the summary only.
