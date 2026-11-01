# storage

The `packages/storage` package: the learner's database in the browser (SQLite over OPFS in a worker), its
repositories, migrations, export and import; and (new) the shipped `knowledge.sqlite` opened read-only.

## Gives

- **`SqlExecutor`**: `execute(sql, params, method)` and an atomic `transaction(statements)`, all storage needs.
- **`createStorage(exec) → Storage`**, repositories over Drizzle's proxy driver: `cards`, `reviews` (`record` writes
  the card and the review in one transaction), v1's `quizAttempts`, `guessAttempts`, `speedAttempts`, the new
  `attempts` and `games` (once agreed), `evals` (`eval_cache`), `explorer` (`explorer_cache`), `settings`, and
  `authoring` (`apply` an action with its history, soft deletes, `undo`, `changesSince`).
- **The browser client** (`client.ts`, `worker/`): a Worker running sqlite-wasm on opfs-sahpool, one tab at a time by a
  Web Lock the newest tab steals (the older tab is told, `onLost`, and shows the banner), opening retried briefly.
- **`openKnowledge(bytes) → KnowledgeReader`** (new): `knowledge.sqlite` opened read-only, with prepared lookups for
  positions, moves at the band, evaluations, puzzles and lines at a position, and the full-text search.
- **Migrations** (`migrate`, `migrations.generated.ts` from `pnpm db:generate`), **transfer** (`exportJson`,
  `importJson`), **testing** (`testing/memory.ts`, in-memory sqlite-wasm in node; `testing/fixtures.ts`).

## Takes

Core **types only** and core's schemas via `@knightschool/core/schema`; Drizzle; sqlite-wasm. Never engine, lichess or
React.

## Rules

- **Multi-statement changes** are built with `toSQL()` and run through `exec.transaction`, never `db.batch`.
- **Logs are append-only** (`reviews`, the attempt logs, `authored_history`); every row has an `at`; ids are ULIDs.
- **Import merges by `at`**: logs keep existing rows; nothing is written if any row fails validation. Authoring
  groups that arrive with an import are listed (`authoringImportedGroups`) and never undone; Undo only takes back
  actions made on this device.
- **Export** is one file with every table except the caches as proposed (schemas/learner.md); the token is never in the
  database, so never in an export.
- **Stored-format changes are agreed first** (capabilities.md 8): `attempts`, `games`, new card kinds and the re-keyed
  move cards wait for a decision. Migrations follow [../schemas/upgrades.md](../schemas/upgrades.md): a snapshot
  first, additive, data rewrites in the same transaction, tested from every released version.
- **`knowledge.sqlite` is never written** by the app and is not part of the learner database or its export; a new
  release replaces it whole, cached by the service worker.
- **Old tables stay readable**: v1's quiz, guess and Speed logs feed stats; new modes write `attempts`. OPFS and the
  tab lock are checked by driving headless Chrome against the dev server, as in v1.

## Used by

[training](training.md) and [exercise](exercise.md) through the web app's stores: [progress](../stores/progress.md),
[settings](../stores/settings.md), [games](../stores/games.md), [explorer](../stores/explorer.md),
[engine](../stores/engine.md) (the eval cache), [judgement](../stores/judgement.md) (knowledge evaluations),
[puzzles](../stores/puzzles.md), [authoring](../stores/authoring.md), [catalog](../stores/catalog.md) (lines at a
position, search); pages [data](../pages/data.md) (export, import, reset), [stats](../pages/stats.md);
[notice](../components/notice.md) (the tab taken by another tab).

## From v1

- `packages/storage/src/executor.ts`, `sqlite-exec.ts`, `client.ts`, `worker/`, `migrate.ts`,
  `migrations.generated.ts`, `repositories.ts`, `transfer.ts`, `testing/`: **keep**, extended for new tables.
- `packages/storage/src/schema.ts` (cards, reviews, three attempt logs, `eval_cache`, `settings`, `explorer_cache`,
  the authored tables, `meta`): **keep**. `apps/web/src/data/storage.ts`, `data/backup.ts` stay in the web app.
  `openKnowledge`, `attempts`, `games`: **new**.

## Tests

The in-memory tests stay (repositories, transactions, migrations agree with the schema, import and export). New:
`attempts` and `games` round trips once agreed; an export without caches imports into an empty database; a v1 export
imports unchanged; `openKnowledge` answers each lookup on a small fixture file and refuses writes.

## Open questions

1. Leaving `eval_cache` and `explorer_cache` out of exports, and opening `knowledge.sqlite` in a second, read-only
   worker, are both in ../decisions.md (recommended: yes to both).
