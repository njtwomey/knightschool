# Notice

A message about the site rather than the chess: a change saved, a problem, a reminder, being offline, the database
taken by another tab, a new version ready. Shown in place, in one of a few fixed kinds.

## Shows

| Kind       | Example                                                                                  | Offers             | Stays                         |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------ | ----------------------------- |
| `saved`    | "New moves a day set to 15." / "Line deleted."                                           | Undo               | until the next action, or 8 s |
| `problem`  | "Some of your work cannot be used yet" with the list ([problems-list](problems-list.md)) | links to each item | while it is true              |
| `reminder` | "Keep a copy of your work. 23 changes in 9 days since your last export."                 | Export             | until exported                |
| `offline`  | "Offline. Everything you have learned works; the live explorer and your games wait."     | none               | while offline                 |
| `paused`   | "Knight School is open in another tab, so progress is paused here."                      | Use it in this tab | while paused                  |
| `update`   | "A new version is ready."                                                                | Reload             | until reloaded                |
| `error`    | "Could not reach Lichess. Trying again in a minute."                                     | Try again          | until it works                |

## Configuration

- `kind`, `text`, `action`. The words are the page's; the look, icon, placement and announcement come from the kind.
- `scope`: `site` (paused, offline, update: a full-width banner under the header, from [page-shell](page-shell.md)) or
  `page` (saved, problem, reminder, error: under the page's trail, or next to what it is about).

## Behaviour

- **In place, never a toast in a corner**: a `saved` notice appears beside the control or at the top of the panel it
  concerns, so the eye does not travel. One `saved` notice at a time; a new one replaces the old.
- `saved` and `paused` are announced politely (`role="status"`); `problem` and `error` assertively (`role="alert"`).
- A notice never covers the board and never moves the board: board pages put page notices in the panel.
- Dismissable only where it is not still true: a `paused` or `offline` notice cannot be closed; a `reminder` can be
  put off for a day.
- No exclamation marks, no "Oops" ([wording](../patterns/wording.md)).

## Composed of

[undo-button](undo-button.md), [problems-list](problems-list.md), shadcn `Alert`, `Button`.

## Used by

[page-shell](page-shell.md), [settings-row](settings-row.md), [preset-picker](preset-picker.md),
[setting-inline](setting-inline.md), [pgn-import](pgn-import.md), [icon-action](icon-action.md); pages
[create](../pages/create.md), [line-editor](../pages/line-editor.md), [settings](../pages/settings.md),
[data](../pages/data.md).

## From v1

Repurpose. `CreateNotices` in `features/create/shell.tsx` (what just happened with Undo, the export reminder, the
build's problems, each an `Alert`), `PausedBanner` in `app/header.tsx`, and the status alerts in
`features/course/board-panel.tsx` and `features/quiz/quiz-view.tsx`. Offline and update notices are new.
