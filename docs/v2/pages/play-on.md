# Play on

Playing on past the theory: from the end of a line, a few more moves against the computer, keeping your advantage; or
the computer leaves the book early and you are told whether you kept your advantage or gave it away. For the improver
who wants to know what to do when the theory ends.

## Address

`/practice/play-on` (the set-up card); `/practice/play-on/<opening>[/<variation>|/lines/<line>]` start at once (a line
plays on from its end; an opening or variation picks line ends from it). Hash: `#m=<moves played>` and `&leave=early`
for the leaving-the-book variant ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

The Play on tile on [practice](practice.md); **Play on from the end** on [line](line.md); **Play on from here** at a
branch's end in [drill](drill.md); the final test of an opening ([checkpoint](checkpoint.md)).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Play on.

1. [practice-bar](../components/practice-bar.md): "From your repertoire's line ends, 5 moves, lose at most 0.5" with
   **Change** ([practice-setup](../components/practice-setup.md)): source; how many moves (3, 5, 10); how much you may
   lose; **Leave the book** (off, sometimes, always) and how early; what the computer plays (as players play, then the
   engine).
2. Two columns from lg:
   - [board](../components/board.md) with [board-surface](../components/board-surface.md) and
     [board-controls](../components/board-controls.md) (no Show me: there is no single right move; Hint shows a good one
     and counts).
   - [exercise-panel](../components/exercise-panel.md): the aim ("Keep White's edge for five moves; the plan here is d4
     when ready"), moves left; [board-feedback](../components/board-feedback.md) with
     [verdict-badge](../components/verdict-badge.md) on each move; [move-table](../components/move-table.md); the
     [tries-table](../components/tries-table.md), one row per move with its cost against the engine's best.
3. At the end: the result in [eval-words](../components/eval-words.md), "You kept your advantage: +0.7 to +0.6" or "You
   gave it away: +0.7 to -0.4, mostly at 12.Bg5?", then the board in `analysis` to step through with every move's
   verdict, and [session-summary](../components/session-summary.md) after several positions.

## Behaviour

- Board `test` while playing (no eval, no explorer, no arrows), `answered` after the last move
  ([../patterns/reveal.md](../patterns/reveal.md)). Each learner move is graded by keeping the position: any move whose
  cost stays within the allowance is right; one that loses more is wrong, snaps back and says why. Grades come from the
  judgement as soon as known; nothing waits for the engine ([../hooks/use-judgement.md](../hooks/use-judgement.md)).
- The computer plays popular moves at the learner's band while the explorer knows the position
  ([../hooks/use-explorer.md](../hooks/use-explorer.md)), then the browser engine; the caption says which.
- **Leaving the book**: partway through a line the computer plays a popular reply the opening does not cover ("Black
  played 4...Be7, 9% of games; your opening does not cover it"). Three moves later the verdict: kept or gave away the
  advantage. The position is offered as a [gap-link](../components/gap-link.md) if no step answers it.
- Offline: popular replies from shipped data, the engine in the browser; nothing is missing.

## Leads to

**Open on the board** → [board](board.md) with the game; a gap → [map](map.md) or the [step](step.md) that teaches it;
**Another position** → the next line end; summary → [practice](practice.md), [Today](today.md).

## From v1

New. The responder grows from Every branch's weighted replies (`features/play`, `training/branches.ts`) and the browser
engine (`data/engine/`); grading from `training/regret.ts`.

## Open questions

- Whether free play against the computer with no grading (features.md T9, later) is a setting here or a page of its own.
