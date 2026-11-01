# Variation list

An opening's variations in study order, each with its steps and its checkpoint: the learner's path through the
opening.

## Shows

- One section per variation, in order. Its header: number, Lichess name ("Two Knights Defence"), the decision it is
  about in a line ("When Black plays 3...Nf6"), a [state-badge](state-badge.md) (locked, open, checkpoint passed) and a
  small [progress-ring](progress-ring.md).
- Under the header, the variation's introduction (two or three sentences, [rich-text](rich-text.md)), shown for the
  open variation and folded for the rest.
- Its steps as [step-row](step-row.md)s, in order.
- At the end of each variation, the **checkpoint** as a row of its own: "Checkpoint: 12 positions from these steps",
  its state, and **Take the checkpoint** (or **Test out** while the steps are not all passed).
- Extras attached to a variation (puzzles, traps to spring, questions) listed under its last step, muted, marked "not
  needed to pass".
- At the very end, the opening's final test, as a checkpoint row for the whole opening.

## Configuration

- `opening` and its derived progress ([use-progress](../hooks/use-progress.md)).
- `selected`: the step shown on the page's board; `onSelect(step)`.
- `fold`: `auto` (open the variation in progress, fold passed and locked ones) or `all-open` (Create's preview).
- Reads `learning.gates` (strict, advise or off: whether locked rows say "locked" or only "suggested later"),
  `learning.testOut` (whether Test out is offered) and `level.includeRare` (whether steps from rare lines appear).

## Behaviour

- Click a variation header: fold or unfold it. Fold state is per visit, not stored.
- Click a step row: selects it, and the page's board shows its stretch ([step-row](step-row.md)).
- On arrival the list scrolls to the step in progress and selects it.
- **Test out** opens the checkpoint at once; passing it marks the variation passed and opens the next one, without
  touching the steps' own states.
- Locked variations are still readable: rows show their moves, and free choice still lets any step be opened (the step
  row asks once).
- Empty: an opening with no steps yet (an authored one) shows [empty-state](empty-state.md) with a link to Create.
- Keyboard: Up and Down move between rows, Enter opens, Space selects (registered through
  [use-shortcuts](../hooks/use-shortcuts.md) only while the list has focus).

## Composed of

[step-row](step-row.md), [state-badge](state-badge.md), [progress-ring](progress-ring.md), [rich-text](rich-text.md),
[puzzle-card](puzzle-card.md) (small, for extras), [kind-badge](kind-badge.md), [empty-state](empty-state.md).

## Used by

[opening](../pages/opening.md) (its main column), [variation](../pages/variation.md) (one variation, unfolded),
[create-opening](../pages/create-opening.md) (preview).

## From v1

Repurpose. v1's Path tab (`apps/web/src/features/path/path-page.tsx`) lists units as one flat list; v1's course page
groups lines by `section` (`groupsOf` in `apps/web/src/features/course/lines-table.tsx`) but not units. v2 joins the
two: sections become variations, and each variation holds its steps. Checkpoints and the final test are new.

## Open questions

- Does a step belong to exactly one variation when its stretch crosses a variation's branch point? The automatic cut
  (`courseUnits`) knows nothing about variations today.
