# Step

Learning one step's main line, about four of the learner's moves, through four stages on one page: Read, Watch, Try,
Done. Five to ten minutes; the heart of Learn. The opponent's mistakes in the stretch are not part of the step: once it
is known they open as its [follow-ups](follow-up.md), the key ideas first and the mistakes to exploit after.

## Address

`/openings/<opening>/step/<n>`, `n` counting from 1 in the opening's path order. `/openings/<opening>/step/<n>/<a>-<b>`
plays only the learner's moves a to b of it (v1's "Next 3 moves"). Hash: `#stage=read|watch|try|done&m=<moves
played or stepped>`, `&test=1` while testing out (Try with no Read or Watch), and `&part=<k>` in a step with several stretches
([../navigation/url-state.md](../navigation/url-state.md)). `m` resumes Watch and Try from the same move.

## Reached from

[next-action](../components/next-action.md) on [Today](today.md) and [opening](opening.md);
[step-row](../components/step-row.md)s on [opening](opening.md) and [variation](variation.md) (**Learn** opens Read,
**Try** opens Try); a [gap-link](../components/gap-link.md) whose reply a step teaches.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › opening › variation › (step n, a menu of the variation's steps),
then the four stages as a row of labels showing which is current and which are done.

Two columns from lg (`.board-columns`); on a phone: board, controls, feedback, then the rest.

- Board side: [board](../components/board.md) with [board-surface](../components/board-surface.md) and
  [board-controls](../components/board-controls.md) (Hint and Show me in Try; flip off, the side is fixed).
- Panel side, by stage:
  - **Read**: the step's title and two to four sentences as [rich-text](../components/rich-text.md), its positions
    clickable; [idea-badge](../components/idea-badge.md)s; **Watch the moves**.
  - **Watch**: [board-notes](../components/board-notes.md) (the move's comment and marks, arriving with it) and the
    [move-table](../components/move-table.md) with the learner's moves in bold, its rows going to that move.
  - **Try**: [exercise-panel](../components/exercise-panel.md) (the prompt, tries left, help
    used, Next), [board-feedback](../components/board-feedback.md) with [verdict-note](../components/verdict-note.md),
    the [tries-table](../components/tries-table.md) filling as they go.
  - **Done**: [session-summary](../components/session-summary.md) (the tries table as the record), ideas learned
    ([idea-badge](../components/idea-badge.md)), where the line leaves you ([eval-words](../components/eval-words.md):
    "White is a little better, +0.6"), the moves not yet known as [move-chip](../components/move-chip.md)s, the step's
    follow-ups as [step-row](../components/step-row.md)s (open once the step is known), up to `puzzles.perStep`
    [puzzle-card](../components/puzzle-card.md)s, and a
    [setting-inline](../components/setting-inline.md) when it bites ("Too fast? Slow the feedback down").

## Behaviour

- **Read**: board in `study`, on the position that matters with its marks. Nothing to answer.
- **Watch**: `learn` preset. Stepping, not playing: the learner goes forward and back with the arrow keys (the
  board owns them at once, no click first) or the board's controls, each move's comment and marks arriving with it and
  the arrow showing the move to come. Playing that move on the board steps forward too, but is never needed; any other move stays a moment with its cross
  (`timing.wrongHold`) and slides back, with no penalty. Nothing
  is saved.
- **Try**: `test` preset, then `answered` after each move. The learner plays their side alone; the other side plays the
  step's replies ([../hooks/use-exercise-session.md](../hooks/use-exercise-session.md)). A wrong move flashes a cross,
  snaps back and says why with the refutation to step through ([../hooks/use-judgement.md](../hooks/use-judgement.md)).
  Two wrong tries reveal the move, which stays with **Next**. Right moves carry on by themselves
  ([../patterns/feedback-timing.md](../patterns/feedback-timing.md)).
- **Done**: `answered`. The step is known when every move has been right twice running; otherwise Done says which moves
  are not yet and offers **Try again**. Its moves join reviews either way, and its follow-ups open once it is known. Done reads the log again (once Try's answers
  have landed), so what it says is what the answers just did.
- **Locked**: the first step of an opening is always open. A later locked step asks once per opening ("Start here?")
  where it is opened (its step row); arriving at it directly shows a quiet notice with a link to the step before.
  **Test me instead** on Read skips to Try; getting every move right first time with no help makes the step known
  (testing out, logged as an attempt with ref `test-out:<opening>:<step>`; [../library/training.md](../library/training.md)).
- The stages come from config `teach.stages` (read, watch, try, done).

## Leads to

Done's **Next step** → the next [step](step.md), or the [checkpoint](checkpoint.md) after a variation's last step; a
follow-up row → [follow-up](follow-up.md);
**Back to the opening** → [opening](opening.md); a puzzle → [puzzles](puzzles.md); an idea → [idea](idea.md); a
tries-table row → that position on this board.

## From v1

`features/play/play-page.tsx` with `play-panel.tsx` and `complete-card.tsx` (Learn and Drill of one unit,
`/play/<course>/<line>/learn/<n>`), the unit scope (`scope.ts`) and `features/path/unit-row.tsx`. Verdict:
**repurpose**: Learn and Drill of a unit become Watch and Try on one page; Read and Done are new.
