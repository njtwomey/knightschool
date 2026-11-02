# Step

Learning one step's main line, about four of the learner's moves, through the **Learn flow**: Learn, Try, Done on one
page. Five to ten minutes; the heart of Learn. The opponent's mistakes in the stretch are not part of the step: once it
is known they open as its [follow-ups](follow-up.md), taught through the same flow.

## The Learn flow

Every line-like thing is taught the same way, by one component and one hook (`features/learn/learn-flow.tsx`,
`use-learn-flow.ts`): a step's stretch of the main line, a [follow-up](follow-up.md) (the opponent's mistake and its
punishment), a trap or danger line, and a [line](line.md) opened from the Lines tab. The page gives it the moves, the
introduction and its own way on; the flow does the rest.

1. **Learn**: the [line-story](../components/line-story.md) beside the [board](../components/board.md)
   (`BoardColumns` with `fit`: the panel as tall as the board, [../patterns/layout.md](../patterns/layout.md)). The introduction comes first,
   then every move with its explanation. The arrow keys step forward and back from the start (the board has them at
   once, no click first), as do the board's controls; the move shown is marked in the story and held level with the
   middle of the board, and a move clicked or hovered there goes to it or previews it on the board. Nothing to play and
   nothing saved: the learner never has to make a move to go on. At the end of the story, **Try it**.
2. **Try**: the learner plays their side alone; the other side plays the replies
   ([../hooks/use-exercise-session.md](../hooks/use-exercise-session.md), the exercise board). A wrong move holds with its
   cross, slides back and says why. Every learner move is saved as a card.
3. **Done**: the tries as the record, ideas met, where the moves leave you, whether it is known and, if not, the moves
   not yet known with **Try again**; then the page's way on, **Learn it again** and **Back to the opening**.

The stages come from config `teach.stages` (learn, try, done).

## Address

`/openings/<opening>/step/<n>`, `n` counting from 1 in the opening's path order. `/openings/<opening>/step/<n>/<a>-<b>`
plays only the learner's moves a to b of it (v1's "Next 3 moves"). Hash: `#stage=learn|try|done&m=<position stepped to
in Learn, or moves played in Try>`, `&test=1` while testing out ([../navigation/url-state.md](../navigation/url-state.md)).
`m` resumes Learn and Try at the same move. An old `#stage=read` or `#stage=watch` opens Learn and the address is
rewritten.

## Reached from

[next-action](../components/next-action.md) on [Today](today.md) and [opening](opening.md);
[step-row](../components/step-row.md)s on [opening](opening.md) and [variation](variation.md) (**Learn** opens Learn,
**Try** opens Try, a click on the row continues at the stage this device left it); a
[gap-link](../components/gap-link.md) whose reply a step teaches.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › Opening ▾ › Variation ▾ › Step n ▾ (the variation's steps with
their follow-ups under each, and their states), then the heading and the stages as tabs, done ones ticked.

Two columns from lg; on a phone: board, controls, then the panel in the page's flow.

- **Learn**: the board in `learn` (marks, the evaluation, the arrow for the move to come). The story's introduction is
  the step's title (in the heading) and its two to four sentences as [rich-text](../components/rich-text.md), or a
  sentence made from its moves; **Test me instead** beside it when `teach.testOut`. Then the moves with their notes,
  [idea-badge](../components/idea-badge.md)s after the notes, and a tempting wrong move of the learner's (a `?`
  variation at their move) folded under the move before it.
- **Try**: [exercise-panel](../components/exercise-panel.md) (the prompt, tries left, help used),
  [board-feedback](../components/board-feedback.md), the [tries-table](../components/tries-table.md).
- **Done**: [session-summary](../components/session-summary.md), the moves not yet known as
  [move-chip](../components/move-chip.md)s, **Next step** or **Take the checkpoint** once known, the step's follow-ups as
  [step-row](../components/step-row.md)s (open once the step is known), up to `puzzles.perStep`
  [puzzle-card](../components/puzzle-card.md)s.

## Behaviour

- The step is known the moment a Try ends with every move right first time, no help, from the first move (recorded as
  its test-out, so it counts exactly as testing out does), or once every move has been right twice running in reviews.
  Done reads the log after every save has landed (`whenWritesSettled`), and so does every page that shows progress,
  so what it says is what the answers just did. Its moves join reviews either way. Done's words are the state itself:
  "Known", or "Not known yet" with the moves to go over.
- **Locked**: the first step of an opening is always open. A later locked step asks once per opening ("Start step 3
  anyway?") where it is opened (its row, or a crumb's menu); arriving at it directly shows a quiet notice with a link to
  the step before.
- **Test me instead** goes straight to Try: every move right first time with no help makes the step known (testing out,
  logged as an attempt with ref `test-out:<opening>:<step>`; [../library/training.md](../library/training.md)).

## Leads to

Done's **Next step** → the next [step](step.md), or the [checkpoint](checkpoint.md) after a variation's last step; a
follow-up row → [follow-up](follow-up.md); **Back to the opening** → [opening](opening.md); a puzzle →
[puzzles](puzzles.md); an idea → [idea](idea.md).

## From v1

`features/play/play-page.tsx` with `play-panel.tsx` and `complete-card.tsx` (Learn and Drill of one unit). Verdict:
**repurpose**: v1's Learn becomes the Learn stage told as a story, Drill becomes Try; Done is new.
