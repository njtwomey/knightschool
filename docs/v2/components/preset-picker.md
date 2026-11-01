# Preset picker

The four presets, Getting started, Club player, Exam and Relaxed, as cards to pick from, with "Custom" when the
learner has changed things since. Most people choose here once and never open a settings row.

## Shows

- **Four cards** side by side (two by two on a phone), each with its name, who it is for, and the three or four values
  that matter most: "Club player: 10 new moves a day, gates on, the computer plays what players at your level play."
- **The chosen card** is marked, with "Your preset".
- **Custom**: when any of the learner's own choices sit on top of the preset, the chosen card says "Club player, with 3
  changes of your own" and a link lists them (each a compact [settings-row](settings-row.md) with its reset).
- **What changes**: hovering or focusing another card lists what picking it would change, old value to new ("Hint and
  Show me: offered → not offered"), so nothing is a surprise.

## Configuration

- `variant`: `cards` (settings page, onboarding) or `select` (a one-line select for the board's gear and narrow places).
- `onboarding`: shows the cards without the "what changes" list, since nothing is set yet; the first question's answer
  ("How much do you play?") preselects one.
- Reads the registry's preset table and the learner's `you` layer; writes the `preset` setting (a learner setting).

## Behaviour

- **Picking a preset** sets the preset layer at once, saved, with a [notice](notice.md) and
  [undo-button](undo-button.md): "Preset set to Exam. Undo".
- **Your own choices stay**: values set in the `you` layer still win over the new preset. If there are any, the notice
  offers "Clear my 3 changes too", also undoable. Opening and session values are never touched.
- The material layer (an author's "include rare lines here") sits above presets, so a preset never undoes what an
  opening asks for; the card says so when it applies.
- Keyboard: the cards are a radio group; arrow keys move, Space picks.

## Composed of

[settings-row](settings-row.md), [notice](notice.md), [undo-button](undo-button.md), [hint](hint.md), shadcn `Card`,
`RadioGroup`, `Select`.

## Used by

Pages [settings](../pages/settings.md) (top of the page) and [onboarding](../pages/onboarding.md);
[board-settings-menu](board-settings-menu.md) (as a select, for the board's look only if presets ever cover it).

## From v1

New. v1 has no presets; the closest is `PRACTICE_DEFAULTS` in `data/practice-config.ts`, one default set-up per mode.

## Open questions

- Do presets reach device settings (board look, motion), or only learner settings? Proposal: learner only.
- Can an author ship a preset with an opening, or only single material values?
