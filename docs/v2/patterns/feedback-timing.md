# Feedback timing

What happens, and how soon, after the learner moves: the tick, the cross, the computer's reply, the next card. Nothing
waits for a click when you are right; a miss with an explanation stays up until you choose Next.

## The rule

1. **Right: carry on by itself.** A tick flashes, the computer replies, the next exercise appears. No button.
2. **Wrong: cross, snap back, say why.** The cross shows on the square, the piece goes back, and the verdict with its
   reason ([verdict-note](../components/verdict-note.md)) and the refutation stay in the panel until the next try.
3. **A miss with something to read stays up with Next.** When the move is shown after two wrong tries, a worded answer
   is missed or half right, or a Name it guess is partly right, the board and explanation wait for Next (or Enter).
4. **The note of a right move stays until your next move.** The tick goes; the move's comment and ideas stay in the
   panel while the computer replies and you think, so the reason is never gone in half a second.
5. **Late judgement never holds play up.** A verdict or a cost that arrives after the move fills in its row in the
   [tries-table](../components/tries-table.md) where it is; play does not wait for it.
6. **One table, one multiplier.** Every delay lives in one table (config `timing.delays`); the setting `feedback.speed`
   (slow 1.5×, normal, fast 0.6×) scales all of them except "Copied" and Speed's countdown.
7. **Timers belong to the session.** A session schedules its delays through one set of timers and clears the lot when it
   stops, restarts or the page is left, so nothing fires on the wrong exercise.

| Delay (v1 name) | v1 value | When                                                         | v2                                                |
| --------------- | -------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `correctBadge`  | 250 ms   | Tick on a right move where play goes straight on (Speed)     | kept                                              |
| `wrongBadge`    | 900 ms   | Cross on a wrong move, before it snaps back                  | kept; the note stays after the cross goes         |
| `afterCorrect`  | 350 ms   | After a right move in Watch and Try, before the line goes on | kept                                              |
| `opponent`      | 500 ms   | Before the computer answers                                  | kept; also before an opponent's mistake is played |
| `nextCard`      | 700 ms   | After a right move in Review, before the next card           | kept                                              |
| `quizRight`     | 2200 ms  | A worded answer right, long enough to read the explanation   | kept                                              |
| `guessFull`     | 2600 ms  | A full-credit Name it answer, before the next position       | kept                                              |
| `betweenLines`  | 5000 ms  | Speed's countdown with the next line's name                  | kept, not scaled                                  |
| `copied`        | 1800 ms  | "Copied" on a copy button                                    | kept, not scaled                                  |
| (new) `saved`   | 8000 ms  | A saved [notice](../components/notice.md) with Undo          | or until the next action                          |

The hover and long-press delays are in [interactions](interactions.md), in the same table in code.

**Hints fade and return** by answers, not by time: the arrow for the move to play is not shown once that move has been
played right twice running, and comes back after two mistakes on it (experience.md, Watch; config
`teach.hintFadeAfterRight` and `teach.hintReturnAfterWrong`).

**Their mistakes**: the opponent's mistaken move is played after `opponent`, its note ("Played in a quarter of games at
your level, and it loses a piece") appears with it, and the board waits for the learner's punishment with no timer.

## Where it applies

Every exercise through [use-exercise-session](../hooks/use-exercise-session.md): a step's Watch, Try and Their mistakes,
Review, Drill, Puzzles, Play on, Checkpoint, Speed, Name it. Shown by [board-feedback](../components/board-feedback.md)
and [exercise-panel](../components/exercise-panel.md).

## From v1

- `apps/web/src/lib/feedback.ts`: `FEEDBACK_DELAYS` (the table above) and `createTimers` (`later`, `clear`), kept.
- The rule "nothing waits for a click when you are right" and the Next exception for Quiz and Name it are v1's
  (`features/quiz/store.ts`, `features/name-it`); the right move's note staying, and the speed multiplier, are new.
- `packages/core/src/training/attempt.ts` (`WRONG_TRIES_ALLOWED`, 2): two wrong tries, then the move is shown.
