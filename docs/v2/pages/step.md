# Step

Learning one step, about four of the learner's moves, through five stages on one page: Read, Watch, Try, Their mistakes,
Done. Five to ten minutes; the heart of Learn.

## Address

`/openings/<opening>/step/<n>`, `n` counting from 1 in the opening's path order. `/openings/<opening>/step/<n>/<a>-<b>`
plays only moves a to b of it (v1's "Next 3 moves"). Hash: `#stage=read|watch|try|mistakes|done&m=<moves played>`, and
`&part=<k>` in a step with several stretches ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

[next-action](../components/next-action.md) on [Today](today.md) and [opening](opening.md);
[step-row](../components/step-row.md)s on [opening](opening.md) and [variation](variation.md) (**Learn** opens Read,
**Try** opens Try); a [gap-link](../components/gap-link.md) whose reply a step teaches.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › opening › variation › (step n, a menu of the variation's steps),
then the five stages as a row of labels showing which is current and which are done.

Two columns from lg (`.board-columns`); on a phone: board, controls, feedback, then the rest.

- Board side: [board](../components/board.md) with [board-surface](../components/board-surface.md) and
  [board-controls](../components/board-controls.md) (Hint and Show me in Try; flip off, the side is fixed).
- Panel side, by stage:
  - **Read**: the step's title and two to four sentences as [rich-text](../components/rich-text.md), its positions
    clickable; [idea-badge](../components/idea-badge.md)s; **Watch the moves**.
  - **Watch**: [move-table](../components/move-table.md) with the learner's moves in bold,
    [board-notes](../components/board-notes.md) (comment and marks, ahead of the move),
    [board-feedback](../components/board-feedback.md), [tries-table](../components/tries-table.md).
  - **Try** and **Their mistakes**: [exercise-panel](../components/exercise-panel.md) (the prompt, tries left, help
    used, Next), [board-feedback](../components/board-feedback.md) with [verdict-note](../components/verdict-note.md),
    the [tries-table](../components/tries-table.md) filling as they go.
  - **Done**: [session-summary](../components/session-summary.md) (the tries table as the record), ideas learned
    ([idea-badge](../components/idea-badge.md)), where the line leaves you ([eval-words](../components/eval-words.md):
    "White is a little better, +0.6"), up to three [puzzle-card](../components/puzzle-card.md)s, and a
    [setting-inline](../components/setting-inline.md) when it bites ("Too fast? Slow the feedback down").

## Behaviour

- **Read**: board in `study`, on the position that matters with its marks. Nothing to answer.
- **Watch**: `learn` preset. The learner plays both sides; the arrow for the move fades after two right plays and
  returns after two mistakes. Each comment arrives ahead of its move and stays until the next one.
- **Try**: `test` preset, then `answered` after each move. The learner plays their side alone; the other side plays the
  step's replies ([../hooks/use-exercise-session.md](../hooks/use-exercise-session.md)). A wrong move flashes a cross,
  snaps back and says why with the refutation to step through ([../hooks/use-judgement.md](../hooks/use-judgement.md)).
  Two wrong tries reveal the move, which stays with **Next**. Right moves carry on by themselves
  ([../patterns/feedback-timing.md](../patterns/feedback-timing.md)).
- **Their mistakes**: `test`. Where the opponent commonly goes wrong in this stretch, they do, and the panel says
  "Black's ...g5? is played in about a quarter of games at your level"; the learner finds the punishment. Skipped, with
  a word, when the stretch has none.
- **Done**: `answered`. The step is known when every move has been right twice running; otherwise Done says which moves
  are not yet and offers **Try again**. Its moves join reviews either way.
- **Locked**: the first step of an opening is always open. A later locked step asks once per opening ("Start here?"),
  then opens. **Test me instead** on Read skips to Try; getting every move right makes the step known (testing out).
- The stages a learner sees and the fading rule follow settings ([../hooks/use-setting.md](../hooks/use-setting.md)).

## Leads to

Done's **Next step** → the next [step](step.md), or the [checkpoint](checkpoint.md) after a variation's last step;
**Back to the opening** → [opening](opening.md); a puzzle → [puzzles](puzzles.md); an idea → [idea](idea.md); a
tries-table row → that position on this board.

## From v1

`features/play/play-page.tsx` with `play-panel.tsx` and `complete-card.tsx` (Learn and Drill of one unit,
`/play/<course>/<line>/learn/<n>`), the unit scope (`scope.ts`) and `features/path/unit-row.tsx`. Verdict:
**repurpose**: Learn and Drill of a unit become Watch and Try on one page; Read, Their mistakes and Done are new.
