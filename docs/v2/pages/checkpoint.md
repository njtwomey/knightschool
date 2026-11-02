# Checkpoint

The test at the end of a variation: a mixed set of exercises from its steps, which makes the variation known and opens
the next one when cleared. The same page holds an opening's final test. For a learner who has finished a variation, or
who wants to test out of one they already know.

## Address

- `/openings/<opening>/<variation>/checkpoint`: a variation's checkpoint.
- `/openings/<opening>/test`: the opening's final test.

No hash: a checkpoint is taken in one go; leaving it abandons the attempt
([../navigation/url-state.md](../navigation/url-state.md)). It belongs to Learn in the trail, and is listed on the
[practice](practice.md) hub when ready.

## Reached from

The checkpoint row of [variation](variation.md) and [opening](opening.md)'s variation list (**Take the checkpoint**,
**Test out**); Done's **Next** after a variation's last [step](step.md); Today's main button when a checkpoint is ready;
the final test row on [opening](opening.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › opening › variation › Checkpoint.

1. A start card: what it asks ("10 exercises from the Two Knights: 6 positions, 2 of Black's mistakes, a question, a
   puzzle"), the mark needed to clear it, **Start**. For testing out: "Clear this and the variation's steps count as
   known."
2. Running, two columns from lg:
   - [board](../components/board.md) with [board-surface](../components/board-surface.md) and
     [board-controls](../components/board-controls.md) (no Hint, no Show me).
   - [exercise-panel](../components/exercise-panel.md): "4 of 10", the prompt, tries left;
     [answer-input](../components/answer-input.md) for the question; [board-feedback](../components/board-feedback.md);
     the [tries-table](../components/tries-table.md).
3. The result: cleared or not, by exercise, [session-summary](../components/session-summary.md) with the tries table,
   and for each miss the [step-row](../components/step-row.md) to go back to.

## Behaviour

- Exercises are drawn from the variation's steps (`checkpointPlan`, config `teach.checkpointMix`: 6 positions, 2
  mistakes, 1 question, 1 puzzle): a position from each step's Try and more to make up the positions, the opponent's
  common mistakes to punish (`opponentMistakes` over the variation's lines), a typed question, one puzzle matched to
  the variation's lines (the learner's side solving, strongest match first, unseen first). A kind with too few is
  made up with positions. The board's exercises come in a mixed order, the questions after them. The final test
  (`/openings/<opening>/test`) is every branch of the opening (as [drill](drill.md)) with one try a move, then
  `teach.finalTest` puzzles (3) and Play ons (1). A mistake, a puzzle or a Play on inside a check is never made a move
  card (the exercise's `record: 'none'`); positions and branches are answered into the move cards as usual.
- Board `test`, then `answered` after each exercise. One try per move (config `teach.checkpointTries`,
  [../config.md](../config.md)); feedback still says why after each answer.
- Clearing it (config `teach.checkpointMark`: nine of ten, no blunders) makes the variation known and opens the next
  variation; when testing out, the variation's steps become known too and their moves join reviews as known.
- Not cleared: nothing is lost; the result names the steps to revisit and **Try again** is open at once.
- Locked (steps not yet known): the page shows the start card with "Steps 5 to 8 are not known yet" and **Test out** in
  place of **Start**. With gates off (`teach.gates`) or relaxed (`learning.gatesRelaxed`), there is no lock, only
  advice.

## Leads to

Cleared → the next [variation](variation.md)'s first [step](step.md), or after the final test, the [opening](opening.md)
marked complete; missed → the [step](step.md) to revisit; summary → [Today](today.md).

## From v1

New; v1 has no gates beyond unit prerequisites (`training/units/progress.ts`). Made of existing modes: Drill's
positions, Quiz's questions, and puzzles.
