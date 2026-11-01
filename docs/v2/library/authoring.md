# authoring

Editing lines and openings as text, building what has been written, contributions, and importing PGN and Lichess
studies: what Create turns each action into.

## Gives

- **Lines** (PGN in the content format): `newLine`, `appendMove`, `truncateMoves`, `setHeader`, `startHeader`,
  `opponentMove`, `readLine`, `lineText` (v1's chapter functions, renamed).
- **Notes**: `setMoveNote`, `setMoveMarks`, and (new) `setMoveSymbol` (a NAG), `setMoveIdeas`, through
  [annotations](annotations.md)' writer.
- **Refutations** (new): `addRefutation(line, ply, uci, text, then)`, `editRefutation`, `removeRefutation`: a bracketed
  variation whose first move is marked `?` or `??`.
- **Openings** (opening.yaml as JSON): set name, side (while no line has moves), level, style, summary, about, sources,
  ideas; `setVariations` (titles, intros, lines in order), **steps** (`nameStep`, `setStepText`, `setStepStretch` as
  `after` / `until` overrides), `setAlternatives`, `pickPuzzles(step, ids)`, `addPlayOn(position, aim)`.
- **Path order**: `stepOrderFor` (v1 `unitOrderFor`: a stable topological sort, prerequisites first, written only
  when it differs from the default), `fittingPlacements`, `placeExtra`.
- **Build**: `buildAuthored(input) → { openings, problems }`, the authored rows and the shipped lines built together;
  anything that does not fit (an id taken, a `[Start]` naming nothing, a comment clashing with a shipped one) is left
  out with a problem, never a crash.
- **Contributions**: `contributionYaml(opening, lines)`, `readContribution(text)`, `issueUrl` (GitHub's form, a short
  note past `MAX_ISSUE_URL`). **Helpers**: `slugify`, `uniqueId`, `exportReminder` (20 edits or 7 days).
- **Imports** (new): `readPgnImport(text) → ImportFound[]`, one row per game or study chapter, split into lines (the
  main moves, and each variation without `?` as a line branching from it), notes, marks and refutations kept;
  `fitImport(found, opening)` places them against the tree (moves already there, comments that clash).

## Takes

[chess](chess.md) (PGN, replaying), [annotations](annotations.md), [tree](tree.md) (building and checking),
[training](training.md) (the step cut and its overrides), [schema](schema.md). The Lichess study's text comes from
[lichess](lichess.md) through the web app; this module only reads text.

## Rules

- **Output is the repo's own format**: a line saved in Create is the same PGN a hand-written file would be, an opening
  the same YAML, so a contribution drops into `content/` unchanged.
- **One comment per move** holds for authored lines too; a comment another line already gives is read-only.
- **One answer per position** in an opening: a second answer made with **Branch here** where the learner moves is
  listed as an alternative.
- **Every action is one undoable change** (the web app saves it with its history rows in one transaction); an import is
  one action ("import 4 lines from Two Knights study").
- A path order that gives a position two answers is refused with the build's problem instead of saving.
- Hand-written `after` and `drop` overrides are kept, placements while they still fit; steps are named and written only
  where the author wants, the rest keeps the automatic cut.
- Authored rows are validated only when built, so an old row never blocks the app.

## Used by

[authoring store](../stores/authoring.md); [move-note-editor](../components/move-note-editor.md),
[marks-editor](../components/marks-editor.md), [refutation-editor](../components/refutation-editor.md),
[step-editor](../components/step-editor.md), [puzzle-picker](../components/puzzle-picker.md),
[pgn-import](../components/pgn-import.md), [undo-button](../components/undo-button.md),
[problems-list](../components/problems-list.md); pages [create](../pages/create.md),
[create-opening](../pages/create-opening.md), [line-editor](../pages/line-editor.md).

## From v1

- `packages/core/src/authoring/chapter-edit.ts`: **keep**, renamed to lines; symbols, ideas and refutations added.
- `authoring/build.ts` (`buildAuthored`), `contribution.ts`, `authoring.ts`, and `training/units/path-edit.ts`
  (`unitOrderFor`, `fittingPlacements`, as step order): **keep**. Refutations, steps, variations, puzzle picks, Play
  on positions, PGN and study import: **new**.
- `apps/web/src/data/authored-build.ts`, `authored-edits.ts`, `features/create/store/`, `features/create/undo-label.ts`
  stay in the web app, over this module.

## Tests

The `chapter-edit`, `contribution` and `authoring` tests stay. New: each edit round-trips through the PGN reader;
refutations written and read back; a step override that no longer fits is reported; a study with nested variations
gives the expected lines with their comments; a clashing comment in an import is a problem, not a crash.
