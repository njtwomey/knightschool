# Local first, a server later

v2 keeps v1's storage: SQLite in the browser, one tab at a time, exported and imported as a file. This page says what
keeps the door open to a real database (accounts, several devices, backups on a server) without a redesign.

## Why it is not a redesign

The hard part of moving to a server is rarely the database. It is accounts, syncing between devices, and merging
changes made offline. v1's data is already shaped for that:

| Already true in v1                                                                         | Why it matters for a server                                    |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| One `Storage` interface; nothing else touches SQL (enforced by `eslint-plugin-boundaries`) | a second implementation can sit behind the same interface      |
| Repositories written with Drizzle over one `SqlExecutor`                                   | Drizzle speaks SQLite (and libSQL, Cloudflare D1) and Postgres |
| Ids are ULIDs made in the browser                                                          | rows made offline on two devices never collide                 |
| Every row has an `at` time                                                                 | the newer copy wins when two copies meet                       |
| Answers, reviews and history are append-only logs                                          | logs merge by adding the rows the other side lacks             |
| Import already merges by `at` and rejects a bad row                                        | that is a sync step, run by hand                               |

## The path, when wanted

1. **Sync, keeping local first.** The browser database stays the one the app reads and writes, so the app still works
   offline. A small service stores each learner's rows and swaps changes with the browser: logs by adding missing rows,
   everything else by `at` (the import's rule). The export format is the sync format.
2. **The server's database.** An SQLite-compatible one (libSQL/Turso, Cloudflare D1) takes the same schema and
   queries as they are. Postgres needs the Drizzle schema written in its dialect; the repositories barely change.
3. **Accounts.** Sign in (Lichess's own OAuth is the natural choice for this site), and the token question changes:
   it could live on the server instead of in the browser.

## Rules that keep it easy

- All data access goes through `Storage`; no component or page writes SQL.
- Every new table follows the same rules: a ULID id, an `at` time, append-only where it is a log.
- New learner data goes into a table, not into localStorage, unless it is about this device (board look, motion) or
  secret (the token).
- The export carries every learner table, so export, import and sync stay one format.

## Not decided

Whether a server is wanted at all, and who would run and pay for it. Until then: local only, with export.
