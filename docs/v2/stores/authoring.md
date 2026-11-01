# authoring

Openings being written in Create: their lines and details, every change kept as history, with Undo.

## Holds

- the **authored rows**: lines (PGN text in the content tree format, with comments, marks, symbols, refutations as PGN
  variations) and openings (course.yaml as JSON: details, introduction, variations, steps with their text and stretch,
  ideas, puzzle picks, Play on positions);
- the **open opening and line** in the editor, the move looked at, the draft of a note being typed;
- **problems** from building the authored content against the shipped tree, by item;
- **Undo**: the newest action not yet undone and its label ("Undo: reorder the steps");
- **changes since the last export**, for the reminder (20 edits or 7 days).

## Written by

The Create pages through the store's slices (session, opening, line, move, variation, step, path, contribution):
[create](../pages/create.md), [create-opening](../pages/create-opening.md), [line-editor](../pages/line-editor.md),
with [move-note-editor](../components/move-note-editor.md), [marks-editor](../components/marks-editor.md),
[refutation-editor](../components/refutation-editor.md), [step-editor](../components/step-editor.md),
[puzzle-picker](../components/puzzle-picker.md), [pgn-import](../components/pgn-import.md),
[undo-button](../components/undo-button.md). Each action is saved as one undoable group. Import of a contribution.

## Read by

The Create pages and [problems-list](../components/problems-list.md); the [catalog](catalog.md), which merges authored
openings into the index, the openings and the tree graph (`reload` after each save); Publish, which writes the opening
as one YAML contribution.

## Persists

SQLite, exported: `authored_chapters`, `authored_courses`, `authored_history` (append-only; rows of one action share a
`group`; deletes are soft; Undo records itself with `undoOf`). Undo labels in the settings key `authoringUndoLabels`;
imported groups in `authoringImportedGroups`; `lastExportAt` for the reminder.

**Decisions for the user (stored format):**

1. **Table and value names stay**: v2 says "line" and "opening", but the tables stay `authored_chapters` and
   `authored_courses`, and `authored_history.kind` keeps the values `chapter` and `course`. Renaming them is a migration
   and breaks importing older exports; the proposal is to rename only in code.
2. **The opening JSON (course.yaml) gains fields** (variations, steps, ideas, puzzle picks, Play on). The text is
   validated only when built, so an old row never blocks; new fields are optional. No migration, but rows written by
   v2 will not build in v1.
3. **Line PGN gains NAG symbols and variations** (refutations). Already legal PGN; v1's reader keeps them.

## From v1

- `apps/web/src/features/create/store/` (`useAuthor`; `context.ts` with `save`; slices `session-slice.ts`,
  `course-slice.ts`, `line-slice.ts`, `move-slice.ts`, `group-slice.ts`, `path-slice.ts`, `contribution-slice.ts`),
  `features/create/draft.ts`, `undo-label.ts`.
- `apps/web/src/data/authored-edits.ts` (`saveAuthored`, `undoAuthored`, `loadUndoLabels`),
  `data/authored-content.ts`, `data/authored-build.ts`, `data/backup.ts` (`lastExportAt`).
- `packages/storage/src/schema.ts` (`authoredChapters`, `authoredCourses`, `authoredHistory`), the `authoring`
  repository; core `authoring/chapter-edit.ts`, `contribution.ts`, `build.ts`.
