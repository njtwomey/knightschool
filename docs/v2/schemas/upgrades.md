# Keeping learners' data through updates

Every deploy changes something: the app, the built data, the content, the config. A learner's progress lives only in
their browser, so an update must never lose it, and must never leave it pointing at things that are gone. This page
lists what can change, what it can break, and the rule that keeps each one safe.

## What can change, and the rule for each

| What changes                      | What it could break                                     | The rule                                                           |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| **The learner database's tables** | the app cannot read old rows                            | numbered migrations applied in place on open (below)               |
| **Content: lines and openings**   | progress tied to a line or step that moved or vanished  | progress is keyed by position and move, not by content structure   |
| **Content: ids**                  | the repertoire, links and history point at a renamed id | ids are permanent; a rename is written down and applied on load    |
| **Content: removed**              | cards for moves no opening teaches any more             | cards are kept, dormant, never deleted                             |
| **Config** (thresholds, rules)    | states computed under the old rules                     | states are derived, never stored; they are simply worked out again |
| **Settings keys and values**      | a stored value the app no longer understands            | each value read and checked on its own; old keys carried over once |
| **Built data's format**           | an old tab reading new files, or the other way round    | the app and its data ship together and carry one version           |
| **The export file**               | a backup from an older version will not import          | every older export version imports                                 |
| **v1 to v2**                      | v1's progress keyed by v1's course ids                  | a one-off migration maps it across (below)                         |

## The learner database: migrations in place

v1 already does the core of this (`packages/storage/src/migrate.ts`): numbered SQL migrations generated from the
schema, bundled with the app, each applied in its own transaction on open, the version kept in `meta`; a database newer
than the app is refused with a message; a test fails if the schema and the migrations disagree. v2 keeps all of that and
adds:

- **A snapshot first.** Before applying a migration, copy the database file (OPFS) to a dated backup, keep the last two,
  and offer them in Data. If a migration fails, the app opens the snapshot and says so, instead of a broken database.
- **Additive by default.** Add tables and columns; never drop or rewrite one in the same release that stops using it.
  Removing happens a release or more later, once nothing reads it.
- **Data migrations as well as schema.** A migration may rewrite rows (a renamed card id, a moved setting) as well as
  change tables, in the same transaction, with a test.
- **Tested from every released version.** A fixture database from each released schema version is kept in the repo;
  a test opens each, migrates it to the latest, and checks the rows survived. (v1 has the fixtures helper,
  `testing/fixtures.ts`, but no per-version databases yet.)
- **One version at a time.** The tab lock (Web Lock) already stops two tabs using the database; an updated tab asks the
  older one to let go, and the older tab reloads instead of writing with old code.

## Content: progress that survives restructuring

The most important rule, and a change from v1:

- **Move cards are keyed by position and move, not by opening.** v1's card id is `<course>:<epd>`, so renaming a course,
  or teaching the same position in two courses, splits or orphans the history. v2 keys what you know about a move by
  `move:<epd>:<uci>` (the side is the side to move in the EPD): the same knowledge wherever that position appears, in
  any opening, through any transposition. An opening asks which of its positions you know; it does not own the cards.
- **Steps, variations and lines hold no progress.** Their states are worked out from the move cards
  ([../model.md](../model.md)). Recutting steps, reordering variations, splitting a line: nothing is lost.
- **Ids that do reach learner data are permanent**: opening ids (the repertoire), puzzle ids (Lichess's, stable), idea
  ids, line ids (in attempts and links). Renaming one means adding `renamed: { old-id: new-id }` to the content; the
  app applies it when it loads, and the next migration rewrites the stored rows.
- **Removed content leaves dormant cards.** A move no opening teaches any more keeps its card, out of the daily reviews,
  listed in Data ("moves from openings no longer offered") with a way to review or clear them. Nothing is deleted
  behind the learner's back.
- **A changed move** (the opening now plays another move in a position): the old card goes dormant, a new card starts
  for the new move, and the learner is told once ("Italian Game now plays 5.d4 here; your 5.d3 is retired").

## Settings and config

- Settings are read value by value with a fallback to the default (v1's `lib/local-prefs.ts` does this), so a stored
  value that no longer fits never breaks the app. Renamed keys are carried over once, as `migratePracticePrefs` does in
  v1, and the registry lists old keys.
- Config changes need no migration: what depends on it (known, mastered, gates) is derived on the fly. A config change
  that would demote many learners at once (a stricter "known" rule) is flagged in review before it ships.

## Built data and the app

- The build stamps one version into `config.json` and every built file; the app checks it on load and reloads when the
  data is newer than the code (the service worker updates both together).
- The service worker shows "A new version is ready" and switches at the next open rather than mid-session.

## Versions

Four version numbers, each with one job, stamped wherever data is written or shipped:

| Version           | Counts                                                  | Stamped in                                    | Used to                                                  |
| ----------------- | ------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| **App**           | releases of the site                                    | the bundle, `config.json`, every export       | show what wrote a file; support questions                |
| **Schema**        | learner database migrations (v1 has it)                 | the database's `meta` table, every export     | decide which migrations to run on open or import         |
| **Content**       | releases of `content/` (openings, lines, ideas, config) | every built file, every export, each new card | spot moves whose opening changed since the card was made |
| **Export format** | changes to the export file's shape                      | every export                                  | import any older file                                    |

A card records the content version it was made under, so the app can tell "this opening changed since you learned it"
from "you forgot it".

## Export and import

- **Export is always available** (Data page): one file with every learner table, the four versions above, and the
  time; never the Lichess token. The reminder to export (v1: after 20 changes or 7 days) stays, and covers progress as
  well as authoring.
- The export file carries its schema version (v1 does). Import accepts every older version, migrating it on the way in;
  a newer one is refused with a message (v1 does both).
- **Before every update**, the export reminder is the learner's safety net; v2 adds an automatic local snapshot
  (above) so a bad update can be undone without having exported.

## v1 to v2

One migration, run once when v2 first opens a v1 database:

- v1 move cards `<course>:<epd>` become `move:<epd>:<uci>` (the move from `expectedUci`);
  where two courses had cards for the same position and move, the one with the longer history wins and the other's
  reviews are kept in the log.
- v1's enrolled courses become repertoire slots where a v2 opening covers them; the rest are listed in Data.
- v1's quiz, guess and speed logs stay as they are, read only.
- Authored openings keep their tables; v2 reads them through the renamed screens.

## Decisions

1. Re-key move cards by position and move (`move:<epd>:<uci>`), with the v1 migration above. Recommended: yes; it
   is what makes every later content change safe.
2. Automatic snapshots before migrations (two kept, in OPFS). Recommended: yes.
3. Fixture databases per released version in the repo. Recommended: yes, from the first v2 release.
