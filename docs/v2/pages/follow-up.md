# Follow-up

One of the opponent's common mistakes in a step's stretch, and how to punish it: taught after the step's main line is
known, never mixed into it, through the same Learn flow as a step ([step.md](step.md#the-learn-flow)): Learn, Try,
Done.

## Address

`/openings/<opening>/step/<n>/follow-up/<k>`, `k` counting from 1 among step `n`'s follow-ups. Hash:
`#stage=learn|try|done&m=…`, as a step's; an old `#stage=read` or `show` opens Learn.

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
3), the step's Done stage, and the step crumb's menu.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › Opening ▾ › Variation ▾ › Step n ▾ › 3a ▾ (the step's follow-ups),
then the heading ("3a. If 4...h6 is played") and the stages.

- **Learn**: the story's introduction is **why it is worth knowing**, in words and numbers: the evaluation before the
  mistake, after it and after the punishment ([eval-words](../components/eval-words.md); a missing evaluation says so,
  never a number carried over), and what the punishing line wins, from the board (core `followUpGain`, `gainWords`:
  material by piece, or mate) or else the author's last note on the line. With neither, it says the opening does not
  say yet, and `make content-check` lists it as a content gap. Then the mistake and the punishing line move by move:
  the mistake's note (the author's, or its grade, how common it is and what it costs), the punishment's (the author's,
  or what it wins), and the rest as written. The board starts before the mistake, the move that led there highlighted.
- **Try**: the exercise board from before the mistake; the other side plays the mistake, then its replies, and the
  learner plays the punishment, graded exactly. [exercise-panel](../components/exercise-panel.md) names the mistake as a
  [move-chip](../components/move-chip.md).
- **Done**: [session-summary](../components/session-summary.md), whether it is known, **Try again**, **Next
  follow-up**, **Learn it again**, **Back to the opening**.

## Behaviour

- State, as a step's: from its move cards, **locked** until the step it hangs off is known (`teach.gates`), then open,
  learning, known (a clean Try, or every move right twice running), mastered. Opening a locked one asks once per opening, as a step
  does; arriving at it directly shows a notice with a link to its step.
- Not counted in the opening's or variation's steps, its checkpoint, or Learn's count.

## Leads to

[step](step.md), the next follow-up, [opening](opening.md); its cards come back in [review](review.md).
