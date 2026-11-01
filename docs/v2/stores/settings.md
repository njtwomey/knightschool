# settings

Every setting's value, per layer and per store (device, learner, secret), behind one registry.

## Holds

- the values set at each layer that is stored: **you**, **this opening** (per opening id) and the chosen **preset**; the
  session layer lives in the [session](session.md) and the material layer comes from the [catalog](catalog.md);
- per value, when it was set (`at`), for Undo and for import merging;
- whether the database is open yet, so learner values can say they are not ready.

The registry itself (keys, schemas, defaults, presets, wording) is code in core, not state; every key with its store is
listed once in settings.md, "Keys".

## Written by

[settings-row](../components/settings-row.md), [setting-inline](../components/setting-inline.md),
[preset-picker](../components/preset-picker.md), [board-settings-menu](../components/board-settings-menu.md), the
[practice-setup](../components/practice-setup.md) card at Start (its saved choice per mode), the
[onboarding](../pages/onboarding.md) page (band), and import on the [data](../pages/data.md) page. All through
[use-setting](../hooks/use-setting.md).

## Read by

[use-setting](../hooks/use-setting.md) everywhere; the [session](session.md) (feedback speed, hints offered, responder;
tries and base delays are config), [progress](progress.md) (new moves a day, card options, gates),
[explorer](explorer.md) (band, token), [engine](engine.md) (on or off, depth), [puzzles](puzzles.md) (rating range,
match levels), [games](games.md) (the Lichess and Chess.com usernames).

## Persists

| Store       | Where                                                                                                                                                                                                                | Exported                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **device**  | localStorage: `knightschool.board`, `knightschool.engine`, `knightschool.theme`, `knightschool.practice.<mode>`, plus new keys                                                                                       | no (settings.md says optional) |
| **learner** | the SQLite `settings` table (key, value, at); v1 keys `enrolled`, `newCardsPerDay`, `includeRareLines`, `minPopularityPercent`, `introduced:<day>`, `lastExportAt`, `authoringUndoLabels`, `authoringImportedGroups` | yes                            |
| **secret**  | localStorage `knightschool.explorerToken`, this browser only                                                                                                                                                         | never                          |

Every read is checked field by field, so a bad stored value falls back to the next layer and never breaks the app.

**Decisions for the user (stored format):**

1. **New learner keys** in the existing `settings` table: one row per registry key the learner changes (for example
   `review.newPerDay`), and `opening:<id>:<key>` rows for the opening layer, and `preset`. No new table and no
   migration, but new key names that exports will carry.
2. **v1 keys**: keep `newCardsPerDay`, `includeRareLines`, `minPopularityPercent` under their v1 names (the registry
   maps them), or rename them once on first start with a carry-over like `migratePracticePrefs`. The proposal is to keep
   them, so a v1 export imports unchanged.
3. Whether device settings join the export (an optional "include this device's look" switch).

## From v1

- `apps/web/src/lib/local-prefs.ts` (`readPref`, `writePref`, `readPrefs`, `writePrefs`, `createPrefStore`).
- `apps/web/src/data/training-settings.ts` (the learner keys above), `data/practice-config.ts`
  (`knightschool.practice.<mode>`, `migratePracticePrefs` carrying `knightschool.quiz.*`, `knightschool.guess.*`,
  `knightschool.speed`), `components/board/prefs.ts`, `data/engine/prefs.ts`, `components/theme-provider.tsx`,
  `features/explorer/service.ts` (token).
- `packages/storage/src/schema.ts` (`settings` table) and `transfer.ts` (exported with everything else).
- `apps/web/src/features/profile/settings/` (`training-section.tsx`, `explorer-section.tsx`, `data-section.tsx`).

## Open questions

1. Is Undo for a setting kept in memory for the page's life, or recorded (a history like `authored_history`)? The
   proposal is memory only: settings are cheap to set again.
