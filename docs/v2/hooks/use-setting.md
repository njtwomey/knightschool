# useSetting

Reads and writes one setting through the registry's layers, and says where its value came from.

## Gives

- **value**: the setting's value, already checked against its schema (a bad stored value falls back to the next layer);
- **source**: the layer it came from (this session, this opening, you, the material, the preset, the default), worded
  for the row ("set for this opening", "from the Club player preset");
- **meaning**: the registry's `explain` for this value ("About 70 new moves a week");
- **set(value, layer?)**: saves at a layer (by default the most particular one the caller is showing);
- **reset()**: removes the value at the shown layer, so the next layer down wins;
- **definition**: label, hint, control, level, for [settings-row](../components/settings-row.md);
- **ready**: false while a learner setting waits for the database.

A sketch: `const { value, source, set, reset } = useSetting('review.newPerDay', { opening })`.

## Takes

- the setting's key, typed by the registry (settings.md, "One registry");
- optional scope: an opening id (the opening layer), a session's set-up copy (the session layer).

## Behaviour

- Looks up the layers in settings.md's order and returns the first that has a value.
- Writes go to the setting's store: **device** to localStorage, **learner** to the SQLite settings table, **secret**
  to localStorage under its own key. See [settings store](../stores/settings.md).
- Before the database is open, a learner setting gives the preset or default with `ready: false`; components that
  decide something with it (how many new moves today) wait, components that only show it do not.
- Every write is undoable for a few seconds (settings.md, "Changes save as they are made, with Undo").
- Subscribes to changes, so a value changed in the gear menu updates the settings page and the practice card at once.

## Used by

[settings-row](../components/settings-row.md), [setting-inline](../components/setting-inline.md),
[preset-picker](../components/preset-picker.md), [board-settings-menu](../components/board-settings-menu.md),
[practice-setup](../components/practice-setup.md), [board-surface](../components/board-surface.md) (theme, pieces,
dots); pages [settings](../pages/settings.md), [opening](../pages/opening.md) (this opening's settings),
[onboarding](../pages/onboarding.md) (band), and through [use-exercise-session](use-exercise-session.md) every mode.

## From v1

- `apps/web/src/lib/local-prefs.ts`: `readPref`, `writePref`, `readPrefs`/`writePrefs` (field by field, a bad value
  falls back), `createPrefStore`; the device and secret stores.
- `apps/web/src/data/training-settings.ts`: `getEnrolled`, `getNewPerDay`, `getIncludeRare`,
  `getMinPopularityPercent` and their setters over the settings table; the learner store.
- `components/board/prefs.ts`, `data/engine/prefs.ts`, `data/practice-config.ts` (`practiceConfig[mode]`,
  `migratePracticePrefs`), `features/explorer/service.ts` (`getToken`, `setToken`): the other four places a setting
  lives today, all behind one hook in v2.

## As built

`apps/web/src/data/settings` (import from `@/data/settings`):

- `useSetting(key, { opening?, openingName?, session?, onSessionChange?, material?, layer? })` gives `value`, `source`,
  `sourceText`, `meaning`, `valueText`, `set(value, layer?)`, `reset(layer?)`, `layer` (the one written by default: session
  when a session copy is given, else opening when an opening is given, else you), `below` (what a reset falls back
  to), `canReset`, `definition` and `ready`. The session layer is the caller's copy: `set` and `reset` at it call
  `onSessionChange`; nothing is stored.
- Outside React: `getSetting(key, scope?)`, `setSetting(key, value | undefined, { opening?, label? })` (undoable),
  `whenSettingsReady()` (loaders that decide something with a learner setting await it), `useSettingsSnapshot()`,
  `currentPreset()`, `settingLayers(snapshot, scope)`.
- Undo: `undoSettingChange()`, `useLastSettingChange()` and `settingsBatch(label, fn)` (several writes as one action);
  kept in memory for the page's life.
- Helpers for the rules a setting softens: `feedbackDelay(ms)` (a `timing.*` delay times the `feedback.speed`
  multiplier from config `settings.feedbackSpeeds`) and `scheduleConfig()` (config's schedule with `review.retention`).

## Open questions

1. Settled: the opening layer is one settings-table row per opening and key, `opening:<id>:<key>`.
