# Create opening

One opening being written: its details and introduction, its lines, its variations and steps in study order, the
puzzles for each step, and publishing it. Where an author shapes the whole opening.

## Address

`/create/<opening>` (Details) and its tabs `/create/<opening>/lines`, `/create/<opening>/steps`,
`/create/<opening>/puzzles`, `/create/<opening>/publish`. Reserved words under `/create/<opening>/`: `lines`, `steps`,
`puzzles`, `publish`; no line id may use them, as in v1 ([../navigation/routes.md](../navigation/routes.md)). Hash:
`#v=<variation>` on Steps for the variation unfolded ([../navigation/url-state.md](../navigation/url-state.md)).
v1's `/create/<course>/path` lands on Steps.

## Reached from

A row of [create](create.md); **Edit** on a learner's [opening](opening.md) page for an authored opening; the opening
crumb on [line-editor](line-editor.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Create › (opening, a menu of your openings) › tabs Details, Lines, Steps,
Puzzles, Publish; **View as learner** and [undo-button](../components/undo-button.md) on the right.
[problems-list](../components/problems-list.md) above the tab when anything does not build.

- **Details**: name, side (while no line has moves), level, style tags, summary; the introduction (idea, risks, who it
  suits, origin) as text fields with a live [opening-intro](../components/opening-intro.md) preview; ideas as
  [idea-badge](../components/idea-badge.md)s to add; sources.
- **Lines**: a [sortable-table](../components/sortable-table.md) of [line-row](../components/line-row.md)s: name,
  [kind-badge](../components/kind-badge.md), variation, opponent's move, moves, what it grows from, problems. **New
  line** (from the start or branching from a line), rename, copy, delete.
- **Steps**: the path in study order. Each variation is a block with its title (a Lichess name offered), its two- or
  three-sentence introduction and its checkpoint settings; inside it, its steps as
  [step-editor](../components/step-editor.md)s (name, text with positions inline, which moves of which line it covers,
  ideas, a Play on position with an aim), and bonus rows (traps, alternatives) under the step they attach to. Drag by
  the handle or use the arrows. A [board](../components/board.md) in the `study` preset beside it shows the selected
  step's stretch.
- **Puzzles**: per step, a [puzzle-picker](../components/puzzle-picker.md): matches through the step's last position
  first, then wider levels, each with its rating and themes; tick to include.
- **Publish**: the opening against the bar ([../courses.md](../courses.md)), each check passed or not; then **Propose
  for the site**, which writes one YAML contribution and opens GitHub's contribution form.

## Behaviour

- Steps start as the automatic cut (about four learner moves each); naming a step or writing its text keeps it, and
  moving a step writes an order only when it differs from the default. An order that would give a position two
  answers shows the build's problem instead of saving.
- Each save is one undoable action named for what it did ("Undo: move step 4 before step 3").
- Over 7,500 characters the contribution link carries a short note and the YAML is copied and downloaded instead.
- The browser engine checks each line as written; swings over a pawn show as problems on the Lines tab.

## Leads to

A line → [line-editor](line-editor.md) (`/create/<opening>/<line>`); **View as learner** → [opening](opening.md);
GitHub's contribution form; [create](create.md).

## From v1

`features/create/course-editor.tsx` with `course-form.tsx`, `lines-tab.tsx`, `path-order.tsx`, `publish.tsx`,
`crumbs.tsx`, `group-select.tsx`. Verdict: **keep**, with Path becoming Steps (variations and step text are new) and
Puzzles new.
