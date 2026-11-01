# Settings

Every setting, drawn from one registry: a preset at the top, groups down the side, a search box, and each row saying
what the value means and where it came from. Most people never come here; those who do want one thing changed fast.

## Address

`/you/settings` (Basic, the first group), `/you/settings/<group>` for one group (`level`, `review`, `learning`,
`feedback`, `computer`, `puzzles`, `board`, `display`, `engine`, `accounts`, `progress`, `accessibility`; every key and
its group is in [../settings.md](../settings.md), "Keys"). Hash: `#q=<text>` for the search,
`#key=<setting key>` to scroll to and highlight one row, `&advanced=1` to show advanced rows
([../navigation/url-state.md](../navigation/url-state.md)). v1's `/settings` and `/profile/settings` land here.

## Reached from

**You** › Settings in the header ([../navigation/menu.md](../navigation/menu.md)); every
[setting-inline](../components/setting-inline.md) and the [board-settings-menu](../components/board-settings-menu.md)'s
**All settings** (each with `#key=`); a [hint](../components/hint.md) that names a setting.

## Layout

[breadcrumbs](../components/breadcrumbs.md): You › tabs Stats, Settings, Data.

1. [preset-picker](../components/preset-picker.md): Getting started, Club player, Exam, Relaxed, and "Custom" once
   anything differs, with what each sets in one line.
2. [search-box](../components/search-box.md) ("delay", "puzzle", "rare") and a
   [filter-toggle](../components/filter-toggle.md) for Basic and Advanced.
3. Two columns from lg: the groups down the side as links; on the right, the chosen group's
   [settings-group](../components/settings-group.md) of [settings-row](../components/settings-row.md)s. Each row: label,
   control, one line of hint, what the value means in practice ("about 70 new moves a week"), where it comes from
   ("from the Club player preset", "set for the Italian Game"), and **Reset** when it differs.
4. The **Accounts** group holds the Lichess token (this browser only, never exported, shown masked; it only raises
   Lichess's rate limits) and the Lichess and Chess.com usernames for your games, each with **Test connection**.
5. [undo-button](../components/undo-button.md) at the top right, named after the last change ("Undo: new moves a day").

## Behaviour

- Changes save as they are made; there is no Save button ([../hooks/use-setting.md](../hooks/use-setting.md)). Device
  settings go to this browser, learner settings to the database (exported), the token to secret storage.
- A search filters across every group and shows matches with their group; clearing it returns to the group.
- Choosing a preset asks once when it would overwrite custom values, listing them; Undo takes it back.
- Values set for one opening are shown here read-only with a link to that [opening](opening.md); they are changed
  there.
- A setting that cannot apply (engine depth with the engine off) is shown disabled with why.
- Before the database is open, device settings still work; learner rows wait with a skeleton.

## Leads to

[opening](opening.md) for per-opening values; [data](data.md) for export and reset; [your games](your-games.md) after
setting a username.

## From v1

`features/profile/settings/settings-page.tsx` with `training-section.tsx` and `explorer-section.tsx`, the board's
gear (`components/board/board-settings.tsx`), and five separate stores ([../settings.md](../settings.md)). Verdict:
**repurpose**: one registry draws every row; the data section moves to [data](data.md).
