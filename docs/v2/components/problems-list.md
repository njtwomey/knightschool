# Problems list

What in an author's work does not build yet, or falls short of the bar, shown where it occurs: on the line, on the
move, on the step. Each problem says what is wrong, where, and how to fix it.

## Shows

- **A heading with a count**: "2 things stop this opening being used" (blocking) or "3 things to improve before you
  publish" (the bar).
- **One row per problem**: a severity icon, the item it is about as a link (a line, a step, a move as a
  [move-chip](move-chip.md)), one sentence on what is wrong, and one on what to do:
  - blocking: "Line Fried Liver: `[Start]` names a line that does not exist. Pick where it branches from again.";
    "4...Nf6 has two comments, one here and one in the shipped line Two Knights. Keep one.";
    "The opening gives two answers at the position after 3...Nf6. Mark one line as an alternative."
  - the bar (making-openings.md): "5 of your moves have no comment.", "No refutation for 4...Nxe4, played in 18% of games."
  - warnings from the build: "Your White opening and your Black opening disagree after 1.e4 e5 2.Nf3."
- **Filtered views**: given item ids, only their problems (a line page shows only that line's).

## Configuration

- `ids`: the items to show problems for; none means all of the opening's.
- `levels`: `blocking`, `bar`, `warning`; the line editor shows blocking only while writing, Publish shows all.
- `compact`: a single line ("2 problems") that opens the list, for table rows (Create's Lines tab, the openings table).

## Behaviour

- Clicking an item goes there: the line editor at that move, the step in the step editor.
- Problems update after each save, from the in-browser build; nothing waits for a button.
- A blocking problem never crashes or hides the rest: the item is left out and the rest of the opening still works
  (v1's rule), and the learner view says "1 line left out" to the author only.
- No problems: nothing at all is shown, not a green "all good" box; Publish says "Ready to publish" instead.

## Composed of

[move-chip](move-chip.md), [notice](notice.md) (its problem kind), [hint](hint.md), shadcn `Alert`, `Badge`.

## Used by

[step-editor](step-editor.md), [pgn-import](pgn-import.md), [move-note-editor](move-note-editor.md); pages
[create](../pages/create.md) (status column, on hover), [create-opening](../pages/create-opening.md),
[line-editor](../pages/line-editor.md).

## From v1

Repurpose. `CreateNotices` in `features/create/shell.tsx` lists the build's problems for given ids ("Some of your work
cannot be used yet"), with `problemsFor` in `features/create/helpers.ts` and `AuthoredProblem` from core
`authoring/build.ts`. The bar checks and the "what to do" sentence are new.
