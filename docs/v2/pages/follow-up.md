# Follow-up

One of the opponent's common mistakes in a step's stretch, and how to punish it: taught after the step's main line is
known, never mixed into it. First read, then tried.

## Address

`/openings/<opening>/step/<n>/follow-up/<k>`, `k` counting from 1 among step `n`'s follow-ups. Hash:
`#stage=read|try|done`.

## What a follow-up is

Worked out, never stored (core `followUps`, `training/follow-ups.ts`): for each step, the opponent's positions in its
stretch, and there the author's refutations (`?` and `??` variations in the PGN) and the band's replies the judge grades
a mistake or blunder, played at least `coverage.minShare` of the time (core `opponentMistakes`). The punishing line is
the refutation as written, or the engine's line after the mistake, up to `judge.refutationPlies` plies. A mistake taught
as a follow-up of an earlier step is not repeated. Its id is `follow-up:<epd>:<uci>` (position and mistake), so a recut
loses nothing; the learner's moves in the punishing line are ordinary move cards (`move:<epd>:<uci>`), saved by Try and
asked again in Review.

## Reached from

The follow-up rows under their step on [opening](opening.md) and [variation](variation.md) (labelled 3a, 3b, under step
3), and the step's Done stage.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › opening › variation › step n › (follow-up, a menu of the step's
follow-ups), then the stages Read, Try, Done.

- **Read**: first **why it is worth knowing**, in words and numbers: the evaluation before the mistake, after it and
  after the punishment ([eval-words](../components/eval-words.md); a missing evaluation says so, never a number carried
  over), and what the punishing line wins, from the board (core `followUpGain`, `gainWords`: material by piece, or
  mate) or else the author's note. With neither, it says the opening does not say yet, and `make content-check` lists
  it as a content gap. Then the [board](../components/board.md) in `study` from the position before the mistake,
  stepped with the arrow keys; [board-notes](../components/board-notes.md) with each move's note arriving with it; the
  [move-table](../components/move-table.md); **Try the punishment**.
- **Try**: the exercise board from the position after the mistake (the mistake highlighted as the last move);
  [exercise-panel](../components/exercise-panel.md) naming the mistake as a [move-chip](../components/move-chip.md); the
  learner plays the punishing line, the other side its replies, graded exactly.
- **Done**: [session-summary](../components/session-summary.md), whether it is known, **Try again**, **Next
  follow-up**, **Read it again**, **Back to the opening**.

## Behaviour

- State, as a step's: from its move cards, **locked** until the step it hangs off is known (`teach.gates`), then open,
  learning, known (every move right twice running), mastered. Opening a locked one asks once per opening, as a step
  does; arriving at it directly shows a notice with a link to its step.
- Not counted in the opening's or variation's steps, its checkpoint, or Learn's count.

## Leads to

[step](step.md), the next follow-up, [opening](opening.md); its cards come back in [review](review.md).
