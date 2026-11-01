# session

The exercise session running now: its config, queue, current exercise, tries and results.

## Holds

- **phase** (idle, loading, asking, feedback, holding, between, summary, error) and the error's text;
- the **config** copied at Start (source or scope, weighting, the mode's own fields), so what it asks and saves reads
  the session's own copy, never the saved set-up;
- the **mode definition** in use (grader, responder, what to record);
- the **queue** and the index of the current exercise; for a line or step, the moves played so far and the part;
- **tries** on the current exercise and **results** for every exercise answered: move, grade, cost (filled in as the
  [judgement](judgement.md) arrives), time, hint or show used;
- the **timers** pending (tick, cross, reply, next card), all cleared together;
- the board model it drives (reveal level, feedback).

One session at a time across the app: starting one stops any other, and leaving its page stops it.

## Written by

[use-exercise-session](../hooks/use-exercise-session.md) only: `start`, `answer`, `hint`, `next`, `skip`, `stop`.
Started from [practice-setup](../components/practice-setup.md) (Start), [practice-bar](../components/practice-bar.md)
(Change, then Start), the [step](../pages/step.md) page (Try, Their mistakes), the
[checkpoint](../pages/checkpoint.md) page, and a scoped address (routes.md).

## Read by

[exercise-panel](../components/exercise-panel.md), [tries-table](../components/tries-table.md),
[session-summary](../components/session-summary.md), [practice-bar](../components/practice-bar.md),
[countdown](../components/countdown.md), [answer-input](../components/answer-input.md),
[board-feedback](../components/board-feedback.md); pages [review](../pages/review.md), [drill](../pages/drill.md),
[puzzles](../pages/puzzles.md), [play-on](../pages/play-on.md), [speed](../pages/speed.md),
[name-it](../pages/name-it.md), [step](../pages/step.md), [checkpoint](../pages/checkpoint.md).

## Persists

Never. What a session learns is written to the [progress](progress.md) store as it goes (free practice writes
nothing). A refresh in the middle of a session shows the set-up card again, except a line drill or a step, whose moves
played are in the hash (`m`, `p`; url-state.md) so they carry on from the same move. Not exported.

## From v1

- Four session stores: `apps/web/src/features/play/store.ts` (`usePlay`, `PlayMode` learn, drill, branches; scope and
  resume in `scope.ts` and `resume.ts`), `features/quiz/store.ts` (`useQuiz`, queue from `session.ts`),
  `features/speed/store.ts` (`useSpeed`, phase `between` with `betweenEndsAt`), `features/name-it/store.ts`
  (`useNameIt`).
- `apps/web/src/lib/session.ts` (`SessionPhase`, `sessionLoader` with `first` and `latest` overlap),
  `lib/feedback.ts` (`FEEDBACK_DELAYS`, `createTimers`).
- `apps/web/src/data/practice-config.ts` (each store keeps the `config` its session started with).

## Open questions

1. Speed and Name it move onto this store only once Review and Drill have proved it (capabilities.md 3). Until then
   they keep their own stores and the "one session at a time" rule is enforced by the router stopping them on leave.
