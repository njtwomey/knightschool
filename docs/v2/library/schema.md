# schema

The shapes of every piece of data, as zod schemas with their types: content, built data, learner data, config and
the outside data we read.

## Gives

- **Content** ([../schemas/content.md](../schemas/content.md)): `OpeningFile` (opening.yaml: name, side, start, level,
  style, summary, about, sources, ideas, variations, steps, alternatives, config), `LineHeaders` (`For`, `Kind`,
  `Start`, `Name`), `Idea` and `IdeaKind` (tactic, plan, structure, principle), `Track`, `Question` (v1's quiz entry).
- **Annotations** ([../schemas/annotations.md](../schemas/annotations.md)): `Note`, `Refutation`, `Marks`.
- **Built** ([../schemas/built.md](../schemas/built.md)): `Catalog`, `OpeningJson` (positions with moves and
  refutations, lines, variations, steps), and the row shapes of `knowledge.sqlite` (`PositionRow`, `MoveRow`,
  `EvalRow`, `PuzzleRow`, `PuzzleAtRow`, `LinesAtRow`).
- **Learner** ([../schemas/learner.md](../schemas/learner.md)): `Card` (`CardId` parses every kind), `Review`,
  `SettingRow`, `Attempt` and `Try` (new), `Game` and `Deviation` (new, Lichess or Chess.com), the authored rows, the
  caches (`EvalCacheRow`, `ExplorerCache`), v1's `QuizAttempt`, `GuessAttempt`, `SpeedAttempt`, and `ExportFile`
  (everything an export carries).
- **Config**: `Config` ([../config.md](../config.md)), owned by [settings](settings.md) and re-exported here.
- **Outside data**: `ExplorerResponse`, `PopularityFile`, `AnalysisFile` (until evaluations move into
  `knowledge.sqlite`), `PuzzleCsvRow`, `LichessGame` (the games export's NDJSON).
- **Enums used everywhere**: `Side`, `LineKind` (main, sideline, rare, gambit, trap, danger), `Grade`, `Level` (first,
  next, further), `MarkColour`.
- Helpers kept from v1: `mergePopularity`, `serializePopularity`, `mergeAnalysis`, `restrictAnalysis`,
  `serializeAnalysis`; and `ExportFile` versions, each older one readable (upgrades.md).

## Takes

`zod` only (README: settings and schema depend on nothing but zod).

## Rules

- **Validated at build, trusted at run time**: the build parses every content file and every file it writes with these
  schemas (`scripts/content.test.ts` writes each again and parses it); production casts the JSON it fetches, and
  development still parses it (`import.meta.env.DEV ? Schema.parse(json) : (json as T)`).
- **Keep zod out of the main chunk**: a schema needed only by authoring, the build or development lives in a file of
  its own (v1's `schema/search.ts`, `schema/explorer.ts`, `authoring/build.ts`), imported where needed.
- **Engine, storage and lichess import schemas** only through `@knightschool/core/schema`, never the package root.
- **Unknown keys fail** in content (strict objects), so a typo is a build error; learner rows are read leniently and a
  row that fails is skipped with a problem, never a crash (an old authored row never blocks the app).
- **Every learner row has an `at`** (ISO-8601 UTC); logs are append-only; ids are ULIDs made in the browser.
- **Ids that reach learner data are permanent** (opening, line, puzzle, idea, card): opening ids are v1 course ids,
  line ids v1 file names; a rename is written as `renamed:` in content and applied on load
  ([../schemas/upgrades.md](../schemas/upgrades.md)). Move cards are `move:<epd>:<uci>`, games `<source>:<id>`.
- A schema change to learner data is a stored-format change: agreed first, with a drizzle migration
  ([storage](storage.md)), and a test that the schema and migrations agree.
- v1 names are read through aliases where content changes words: `trigger` as `start`, `tier` as `level`, `section`
  as a variation, `motifs` as `ideas`.

## Used by

Every module and package; `scripts/content-build.ts`, `content-emit.ts`, `content.test.ts`; the web app's `data/`
loaders ([catalog store](../stores/catalog.md), [puzzles store](../stores/puzzles.md)); [storage](storage.md)'s
import and export; [pgn-import](../components/pgn-import.md) and the [data](../pages/data.md) page (validating a file
before importing).

## From v1

- `packages/core/src/schema/` (`content.ts`, `tags.ts`, `course.ts`, `built.ts`, `quiz-entry.ts`, `catalog.ts`,
  `user.ts`, `analysis.ts`, `popularity.ts`, `explorer.ts`, `search.ts`): **keep, extend**; `course.ts` becomes the
  opening file, `built.ts` gains variations, steps and refutations, `user.ts` gains attempts and games.
- Idea, Track, Puzzle, Config, the knowledge rows: **new**.

## Tests

`scripts/content.test.ts` parses every built file with its schema (a new file needs its schema there, as in v1). New:
the v1 aliases read a v1 course; a v1 export parses as an `ExportFile`; unknown content keys fail with the key's path.
