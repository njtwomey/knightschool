# Settings group

A titled group of [settings rows](settings-row.md): one heading, one sentence on what the group is for, and its rows
in the registry's order.

## Shows

- **Title** and a one-line description: "Feedback. How much the board tells you after a move, and how fast."
- **Where it is kept**, when the whole group shares one store: "Saved on this device" (board, engine, accessibility),
  "Kept in this browser only and never exported" (Lichess token). Learner groups say nothing.
- **Its rows**, basic first. When the page shows Basic only, a line at the end says "3 advanced settings" and opens
  them in place.
- **Reset group** in the heading, only when some row differs from its layer below: "Reset 2 feedback settings".
- When the preset or an opening sets anything in the group, a line under the title: "Some values here come from the
  Exam preset."

The groups, from settings.md: Your level, Review, Learning, Feedback, The computer, Puzzles, Board and display, Engine,
Lichess, Data, Accessibility. The order is the registry's; the page's side list is drawn from it.

## Configuration

- `group`: the registry group id; the title, description and rows come from the registry.
- `layer`: passed to every row (`you`, `opening`, `session`).
- `level`: `basic` or `all`, from the page's switch.
- `query`: the search words; rows that do not match are hidden.
- `collapsible`: on a phone each group folds, open for the group the address names (`/settings#group=feedback`).

## Behaviour

- **Search**: rows match on label, hint, key and a few synonyms the entry lists ("delay" finds Speed of play). A group
  with no match hides; if every group hides, the page shows an [empty-state](empty-state.md): "No setting matches
  'colour'. Try another word, or show Advanced."
- Reset group is one undoable change: a single [notice](notice.md) with [undo-button](undo-button.md).
- A group heading is a link target, so the settings page's side list and a [setting-inline](setting-inline.md) "More
  settings" link can jump to it.

## Composed of

[settings-row](settings-row.md), [empty-state](empty-state.md), [notice](notice.md), [undo-button](undo-button.md),
shadcn `Card` and `Collapsible`.

## Used by

Pages [settings](../pages/settings.md) and [opening](../pages/opening.md) (its "Settings for this opening" panel);
[board-settings-menu](board-settings-menu.md) uses one group, Board and display.

## From v1

Repurpose. `features/profile/settings/settings-page.tsx` lays out hand-written `Card` sections (Appearance, Board,
Training, Lichess explorer, Your data), each with a `CardDescription` such as "Saved on this device." v2 draws the same
cards from the registry instead of writing each.
