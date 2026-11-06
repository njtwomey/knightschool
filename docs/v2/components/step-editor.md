# Step editor

A step's name, its text and which moves it covers, written by an author on top of the automatic cut. A step left
alone keeps its automatic stretch and a plain name; naming it and writing two to four sentences turns it into a taught
step.

## Shows

- **The variation's steps** as a list ([step-row](step-row.md) in author form): number, name (or "Step 3, automatic"),
  the stretch as a [move-run](move-run.md) with the learner's moves in bold, and a mark when it has text.
- For the chosen step:
  - **Name**: short, in plain words ("Castle, then strike in the centre").
  - **Text**: two to four sentences, with positions and moves written inline ([rich-text](rich-text.md)); a live preview
    beside it as Learn will introduce it (the first thing in the line story).
  - **Key position**: the position the introduction is about, picked by stepping the board; its marks are edited with
    [marks-editor](marks-editor.md).
  - **Stretch**: the line drawn as chips with two handles, first and last move. Dragging a handle (or the arrows beside
    it) moves where the step starts and ends; the neighbouring step grows or shrinks to match.
  - **Ideas** it shows ([idea-badge](idea-badge.md)), suggested from the ideas on its moves.
  - **Stages**: Learn, Try, Done, each with what feeds it ("Learn: its text, then 4 of your moves, each with its
    reason"). The opponent's mistakes in the stretch are its follow-ups, taught after it.
  - **Puzzles**: up to three, from [puzzle-picker](puzzle-picker.md).

## Configuration

- `opening`, `variation`: which steps to list.
- `cut`: the automatic cut (about four learner moves, v1's rule), shown as the default every handle can return to.

## Behaviour

- **Reset to automatic** on a step takes back its stretch, not its name or text; text for moves no longer in the step
  stays with a warning in [problems-list](problems-list.md).
- A stretch that would leave a learner move in no step, or put a step before the step it builds on, is refused with
  the reason under the handle.
- Every change saves as one undoable action ("rename step 3", "move the end of step 2 to 6.c3").
- A step's text missing on Publish is a problem only when the opening claims to meet the bar (making-openings.md).

## Composed of

[step-row](step-row.md), [move-run](move-run.md), [rich-text](rich-text.md), [marks-editor](marks-editor.md),
[idea-badge](idea-badge.md), [puzzle-picker](puzzle-picker.md), [problems-list](problems-list.md),
[undo-button](undo-button.md), [board](board.md) (author preset).

## Used by

Page [create-opening](../pages/create-opening.md) (its Steps tab).

## From v1

Repurpose. `features/create/path-order.tsx` orders lines, traps and quizzes on the path and writes `units.order` and
`units.place`; core `training/units/cut.ts` (`courseUnits`, `cutIntoUnits`) and `overrides.ts` (`order`, `after`,
`drop`, `place`) are the cut and its overrides. Names, text and stretch handles are new.

## Open questions

- Does a step's stretch stay inside one line, or can a side step gather short stretches of several lines, as v1's side
  units do?
