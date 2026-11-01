# Create

The author's openings: every opening they are writing, in one table, with New opening, the imports, Undo and Export.
For the coach, club player or parent who writes an opening for themselves or others.

## Address

`/create`. No hash ([../navigation/url-state.md](../navigation/url-state.md)). v1's `/create` and `/profile/author`
land here.

## Reached from

**Create** in the menu ([../navigation/menu.md](../navigation/menu.md)); the opening crumb's root on
[create-opening](create-opening.md) and [line-editor](line-editor.md); [board](board.md)'s **Write a line from
here**.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Create.

1. The actions in one row: **New opening**, **Import** (a menu: a contribution, a PGN, a Lichess study),
   [undo-button](../components/undo-button.md) ("Undo: delete the line Two Knights, 5.Ng5"), **Export**.
2. The export reminder as a [notice](../components/notice.md) when 20 edits or 7 days have passed since the last export.
3. A [sortable-table](../components/sortable-table.md), newest edit first: name as
   [opening-name](../components/opening-name.md), side, variations, lines, steps, last edited, status (builds, or "2
   problems" with the [problems-list](../components/problems-list.md) on hover). Each row: open, **View as learner**,
   copy, delete as [icon-action](../components/icon-action.md)s; the row itself opens the opening.
4. Empty: an [empty-state](../components/empty-state.md) "You have not written an opening yet" with **New opening** and
   a two-sentence note on what an opening needs (a side, lines, steps with text).

## Behaviour

- **New opening** opens a dialog: name, side, and where it starts: from the start position, or from the end of a line
  of one of the site's openings (then it adds to that opening's family and its first line starts there). It opens the
  new opening on Details.
- **Import** of a contribution reads the YAML back into a new opening; of a PGN or a Lichess study, opens
  [pgn-import](../components/pgn-import.md): each game, or each part of the study (Lichess calls them chapters), becomes
  a line, comments and arrows kept, and refutations from bracketed variations marked `?`.
- Every change is one undoable action; Undo takes back only actions made on this device, newest first.
- Delete asks first, names what goes with it, and offers Undo.
- The database must be open; while it opens, a skeleton; if another tab has it, the taken-tab notice
  ([../patterns/states.md](../patterns/states.md)).

## Leads to

A row → [create-opening](create-opening.md) (`/create/<opening>`); **View as learner** → [opening](opening.md);
**Export** → a file (the same as [data](data.md)'s, authoring tables included).

## From v1

`features/create/create-page.tsx` with the store's session slice and `undo-label.ts`. Verdict: **keep**; PGN and
Lichess-study import are new (features.md C1).
