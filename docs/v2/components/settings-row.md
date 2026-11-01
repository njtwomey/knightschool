# Settings row

One setting drawn from the registry: its label, its control, a line of hint, what the value means in practice, where
the value comes from, and a reset. Every setting on every surface is one of these, so it reads the same everywhere.

## Shows

- **Label** on the left ("New moves a day"), with an _Advanced_ tag when the entry's `level` is advanced.
- **Control** on the right, chosen by the entry's `control.kind`: a switch, a slider with its marks (5, 10, 20), a
  select, a one-of-several choice ([filter-toggle](filter-toggle.md)), a number, or a hidden text field for a secret.
- **Hint** under the label: the entry's one sentence ("How many moves you have not seen before are added each day").
- **What it means**: the entry's `explain(value)`, updated as the control moves ("About 70 new moves a week").
- **Source**: a small grey line saying which layer the value came from: "This session", "Set for this opening", "Your
  choice", "Set by the opening's author", "From the Club player preset", "Default".
- **Reset** ([icon-action](icon-action.md), a curved arrow) only when the value differs from the layer below it. Its
  hint names what it falls back to: "Reset to the Club player preset (10)".
- **Where it is kept**, as an icon with a [hint](hint.md): device ("This device only"), secret ("This browser only,
  never exported"). Learner settings, the usual case, show nothing.

## Configuration

- `setting`: the registry key (`review.newPerDay`). Everything else comes from the entry.
- `layer`: which layer this row writes: `you` (the settings page), `opening` (an opening's page, with its id) or
  `session` (the practice set-up card). The source line and the reset follow from it.
- `density`: `full` (settings page) or `compact` (the board's gear, the practice card,
  [setting-inline](setting-inline.md)): compact drops the meaning line and puts the hint behind a [hint](hint.md).
- `highlight`: the words a search matched, marked in the label and hint.

## Behaviour

- **Saved as you go.** A change writes at once through [use-setting](../hooks/use-setting.md); a [notice](notice.md)
  says "New moves a day set to 15" with an [undo-button](undo-button.md). A slider writes when it is let go, not on
  every step. The session layer is the exception: it edits the practice card's copy and nothing saves until Start.
- **A bad value never saves.** A number out of range shows the allowed range under the control and keeps the last
  good value; reading a damaged stored value falls back to the next layer, as v1's `parsePrefs` does.
- **Locked by a lower layer**: never. Every layer can be overridden; the source line explains what is underneath.
- Keyboard: Tab reaches the control then the reset; the label is the control's accessible name.

## Composed of

[hint](hint.md), [icon-action](icon-action.md), [filter-toggle](filter-toggle.md), [notice](notice.md),
[undo-button](undo-button.md), shadcn `Switch`, `Select`, `Input` and a `Slider` (not yet in `components/ui`).

## Used by

[settings-group](settings-group.md), [setting-inline](setting-inline.md), [board-settings-menu](board-settings-menu.md),
[practice-setup](practice-setup.md); pages [settings](../pages/settings.md) and [opening](../pages/opening.md).

## From v1

Repurpose. The rows hand-written in `features/profile/settings/training-section.tsx` (a `Label` with a hint, then an
`Input` or `Switch`) and `components/board/board-settings.tsx` are the look; `lib/local-prefs.ts` (`parsePrefs`, field
by field with defaults) is the reading rule. v1 has no source line, no reset and no Undo.

## Open questions

- Should a compact row show its source at all, or only a dot that opens it?
