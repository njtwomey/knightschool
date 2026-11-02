# settings

The config schema and its validation, the settings registry (`defineSetting`), resolving a value through its layers,
and presets: pure core, so the settings page, the gear, the practice card and the scripts all agree.

## Gives

- **`Config`**, **`parseConfig(yaml) → Config | problems`** (every key in [../config.md](../config.md)),
  **`appConfig(config)`** (the part built into `config.json`), and **`openingConfig(config, overrides)`**: an
  opening's `config:` block over the site's, for the listed keys only (such as `coverage.minShare`).
- **`defineSetting({ key, group, label, hint, schema, default, level, scopes, store, control, explain })`**: one
  declaration per setting ([../settings.md](../settings.md), "One registry" and "Keys"); `registry` lists them, and a
  key's type flows from its schema, so `useSetting('review.newPerDay')` is typed.
- **`resolveSetting(key, layers) → { value, source }`** over `Layers = { session?, opening?, learner?, material?,
preset? }`, each a partial map of key to raw value; the default comes from the registry.
- **Presets**: `presets` from config (Getting started, Club player, Exam, Relaxed), `presetValues(id)`, and
  `isCustom(learner, preset)`, true when the learner layer differs from the preset, so the picker shows "custom".
- **`settingRows(query, level)`**: entries matching a search ("delay", "rare"); **`sourceWords(source)`**: "set for
  this opening", "from the Club player preset", "default".

## Takes

`zod`, and [search](search.md)'s text match. Stored values come from the web app's stores; this module only reads them.

## Rules

- **Layers, most particular first** (../settings.md): this **session** (the practice card's copy, applied at Start),
  this **opening** (the learner's choice for one opening), **you**, the **material** (the author's `config:` override,
  for keys that are also settings), the **preset**, the registry **default**. The first valid value wins.
- **A bad value falls through**, never throws: a stored value that fails its schema is skipped and the next layer
  answers (v1's field-by-field rule in `lib/local-prefs.ts`).
- **Ranges are config's**: a setting's default, range and level come from config (its `settings` key); a stored value
  outside the current range is clamped. Changing a range is a reviewed config change.
- **Rules are never settings** (config.md's test): hint fading, tries before the move is shown, known and mastered,
  gates, checkpoint marks, grade cut-offs and base delays are config. The registry refuses such a key; the learner gets
  the few softenings config allows (`learning.gatesRelaxed`, `feedback.speed` over `timing.delays`).
- **Scopes and stores**: a key without `opening` in its scopes ignores an opening-layer value. `device` keys live in
  localStorage, `learner` keys in the SQLite `settings` table (exported), `secret` (`lichess.token`) in localStorage
  only, never exported.
- `parseConfig` fails the build on an unknown key, a wrong type, a preset naming an unknown setting, or an opening
  overriding a key it may not.
- **v1 keys are aliases**: `enrolled` → `repertoire`, `newCardsPerDay` → `review.newPerDay`, `includeRareLines` →
  `level.includeRare`, `minPopularityPercent` → `level.coverageTarget`; read under either name, carried over once.

## Used by

Every module that reads a threshold (through `Config`); [use-setting](../hooks/use-setting.md),
[settings store](../stores/settings.md); [settings-row](../components/settings-row.md),
[settings-group](../components/settings-group.md), [preset-picker](../components/preset-picker.md),
[setting-inline](../components/setting-inline.md), [board-settings-menu](../components/board-settings-menu.md),
[practice-setup](../components/practice-setup.md); pages [settings](../pages/settings.md),
[opening](../pages/opening.md), [onboarding](../pages/onboarding.md); `scripts/content-build.ts`.

## From v1

`packages/core/src/constants.ts` (`MIN_POPULARITY_FOR_CARD`, `EXPLORER_BAND`, `EASY_WITHIN_MS`, ...): **repurpose**,
into `content/config.yaml`. `apps/web/src/lib/local-prefs.ts`: **keep** for the device and secret stores, its checking
rule moving into `resolveSetting`. `data/training-settings.ts`, `data/practice-config.ts`: **repurpose** behind the
registry. `defineSetting`, layers, presets, `parseConfig`: **new**.

## Tests

`resolveSetting` (each layer over those below, a bad value falls through, scopes, the source); presets and `isCustom`;
the committed `config.yaml` parses and each kind of error names its key; opening overrides allowed and refused; v1
aliases read a v1 export's settings.

## As built

`packages/core/src/settings`: `settingsRegistry(config)` (definitions in the page's order, `byKey`, `groups`, `presets`
from config, `defaultPreset`), `defineSetting`, `checkPresets(config, registry)`, `resolveSetting(definition, layers,
from?)`, `resolveBelow`, `checkSetting` (clamp, then schema), `layerApplies`, `presetValues`, `presetOf`,
`customChanges` and `isCustom`, `sourceWords`, `valueWords`, `matchesSetting`, `settingRows`, `readStoredSettings`
(rows to the you and opening layers, v1 aliases) and `openingSettingKey`. The learner's own layer is called `you` (as
the components call it), not `learner`, so it is not confused with the learner store. A key's value type is declared in
`SettingValues` (`types.ts`). Config holds the presets (`presets.default`, `presets.list`) and a `settings` block with
the ranges no other key sets (retention's range, the feedback speed multipliers, engine depth and lines, the explorer
cut-off, games to read, board size cap, preview delay). `parseConfig`, `appConfig` and `openingConfig` are not built:
`SiteConfig` (zod) still checks the file.

## Open questions

1. Settled: the learner's own choice wins over an opening's suggested values, on purpose; an opening's config overrides
   are config, not settings (../settings.md).
