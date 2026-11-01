# Data

The learner's data in one place: export everything, import a backup, see when the last backup was, and reset progress
for one opening or all. There is no account and no server, so this page is the only way to move between devices or
keep a copy.

## Address

`/you/data`. No hash ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

**You** › Data in the header ([../navigation/menu.md](../navigation/menu.md)); the export reminder
([notice](../components/notice.md)) on [create](create.md) and Today; [first visit](first-visit.md)'s **I have a
backup**; [settings](settings.md)'s Data group.

## Layout

[breadcrumbs](../components/breadcrumbs.md): You › tabs Stats, Settings, Data.

1. **What is stored**: one line each with counts: answers logged, cards, Speed runs, puzzles, your games, openings you
   wrote, learner settings. "Everything lives in this browser. Clearing site data deletes it."
2. **Export**: **Download a backup** (one file, everything above; the Lichess token never included), and "last backup
   3 days ago". The file is versioned: it carries the app version, the database schema version and the content version
   it was made with, so any later version can import it. **The export reminder**: a [notice](../components/notice.md)
   here, on Today and on Create once 20 edits or 7 days have gone by since the last export, with its setting beside it
   ([setting-inline](../components/setting-inline.md), `data.exportReminder`).
3. **Import**: choose a file; a summary of what it holds and what it will add ("1,240 answers, 3 openings you wrote;
   212 already here"), then **Import**.
4. **Snapshots**: the automatic copies of the database taken before every update that changes its tables (the last
   two kept in this browser, [../schemas/upgrades.md](../schemas/upgrades.md)), each with its date and versions and
   **Restore**. They need no action; they are the safety net when no export was made. Below them, moves from openings
   no longer offered (dormant cards), with **Review them** and **Clear**.
5. **Reset**: **Reset one opening** (a select of openings with progress) and **Reset everything**, both behind a
   confirmation that names what goes. A [notice](../components/notice.md) offers **Download a backup first**.
6. [notice](../components/notice.md) for another tab holding the database, with **Use it in this tab**.

## Behaviour

- Export writes every table, including the authoring tables and learner settings, and records the time, which the
  reminder counts from.
- Import merges by time: logs keep their existing rows and gain the new ones; if any row fails validation, nothing is
  written and the page says which file part failed. Authored history that arrives with an import can never be undone
  on this device.
- Reset of one opening removes the cards for the moves it teaches (cards are keyed by position and move, so the
  confirmation names any it shares with another opening in the repertoire); answers stay in the log; the repertoire
  slot is kept.
  Reset everything clears the database and returns to [first visit](first-visit.md). Neither touches device settings.
- Backups from v1 import through the same one-off migration as a v1 database: move cards become `move:<epd>:<uci>`, so
  progress lands wherever a v2 opening reaches the same positions and moves. A file from a newer version is refused with
  a message.
- Before the database opens: a skeleton; if it cannot open, the taken-tab notice
  ([../patterns/states.md](../patterns/states.md)).

## Leads to

[first visit](first-visit.md) after resetting everything; [Today](today.md) after an import; [opening](opening.md)
after resetting one.

## From v1

`features/profile/settings/data-section.tsx` and `data/backup.ts` (export, import merging by `at`, the reminder).
Verdict: **repurpose** into a page of its own; reset is new.
