# exercise

One way to describe anything the learner answers: a start position, the learner's side, a grader and a responder;
the attempt that keeps every try; checkpoints made of exercises.

## Gives

- **`Exercise`**: `{ id, ref, start, side, prompt, moves, grader, responder, help }`. `moves` is how many of the
  learner's moves it asks for (one for a card, a stretch for a step, the solution for a puzzle, `opponent.playOnMoves`
  for Play on); `ref` is what gets recorded (a card, step or puzzle id); `help`: whether Hint and Show me are offered.
- **Graders**, `grade(position, answer, context) → right | another | wrong | pending`:
  - **`exact(expected)`**: one of the expected moves is `right`; a move [judge](judge.md) grades Best, Excellent or Good
    is `another` (sound, not the line's move); anything else `wrong`. A puzzle also accepts any mate where the solution
    mates;
  - **`tolerant(maxGrade)`**: any move judged no worse than `maxGrade` (`opponent.playOnTolerance`, Mistake);
    `pending` until the verdict is known;
  - **`typed(matcher)`**: a typed answer through the quiz matcher (`matchAnswer`) or Name it's `gradeGuess`.
- **Responders**, `reply(position, history, rng) → move | none | needs-engine`: **`scripted`** (the line, step or
  puzzle solution), **`popular`** (`pickWeighted` by the band's games, among the moves the opening answers in Drill, any
  played move in Play on), **`engine`** (asks the caller), and **`chain(a, b)`** (Play on: popular, then engine).
- **`Attempt`** and **`reduceAttempt(attempt, action, exercise)`**: v1's machine, now keeping **every try**
  (`{ answer, at, ms, hint, shown, result }`); a try's verdict and cost come from judge when shown, never stored.
- **`checkpoint(variation, states, rng) → Exercise[]`**: a mixed test of one variation (key positions of its steps, a
  stretch replayed, its questions, the opponent's common mistakes to punish); the final test is the same over all.
- **`modeDefinitions`**: the modes below as data, so the web app's session runs every mode one way.

## Takes

[chess](chess.md), [judge](judge.md), [training](training.md) (cards, weighting, `autoGrade`), [tree](tree.md),
[modes](modes.md). Config: `teach.triesBeforeShown`, `teach.checkpointTries`, `teach.checkpointMark`, `opponent.*`.

## Rules

- **Wrong tries, then the move is shown**: after `teach.triesBeforeShown` (2) the move is shown and the attempt stays
  open until it is played, so play moves on by playing (v1's rule). In a checkpoint, `teach.checkpointTries` (1) and no
  help; it is cleared at `teach.checkpointMark` (9 of 10, no blunders); testing out is the same check taken early.
- **`another` costs nothing**: it uses no try, is never called a mistake, and asks for the line's move before play goes
  on ("Excellent, but not your repertoire move", capabilities.md 2). The tries table lists it with its grade.
- **A try is a fact, a grade is a reading**: the attempt records what was played and when; right or wrong is the
  grader's; how good is judge's. Storing every try needs the new `attempts` table (schemas/learner.md), still to be
  agreed; until then tries live in the session.
- **Responders never leak**: a reply is chosen after the learner's move is graded. Engine replies are asynchronous and
  belong to the web session; core only says one is needed. Free practice builds exercises alike and records nothing.
- **The modes** (capabilities.md 3): Learn exact and shown, scripted; Try and Drill exact, scripted or popular; Review
  exact or typed, scripted; Speed exact and timed, scripted; Name it typed, no responder; Puzzle exact (any mate),
  scripted; Play on tolerant, popular then engine; Checkpoint a mix with one try.

## Used by

[use-exercise-session](../hooks/use-exercise-session.md), [session store](../stores/session.md);
[exercise-panel](../components/exercise-panel.md), [tries-table](../components/tries-table.md),
[session-summary](../components/session-summary.md), [answer-input](../components/answer-input.md); pages
[step](../pages/step.md), [drill](../pages/drill.md), [review](../pages/review.md), [puzzles](../pages/puzzles.md),
[play-on](../pages/play-on.md), [checkpoint](../pages/checkpoint.md), later [speed](../pages/speed.md),
[name-it](../pages/name-it.md).

## From v1

- `packages/core/src/training/attempt.ts` (`reduceAttempt`, `WRONG_TRIES_ALLOWED`): **repurpose**, every try kept;
  `training/branches.ts` (`chooseReply`, `MAIN_LINE_WEIGHT`): **repurpose** as the popular responder, by games.
- `training/quiz.ts` (`matchAnswer`), `modes/guess.ts` (`gradeGuess`): **keep**, as typed graders.
- The pure parts of `apps/web/src/features/{play,quiz,speed,name-it}/store.ts` move here; timers and recording stay
  in the web session. Graders, responders, checkpoints as data: **new**.

## Tests

`reduceAttempt` on every path, tries in order with times; `another` uses no try; exact with alternatives and any mate;
tolerant at the grade edge and pending; typed via the quiz and guess tables; popular with a seeded rng never picks an
unanswered move in Drill; chain falls through; checkpoints draw from every step, stable for a seed, cleared at the mark.
