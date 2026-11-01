# lichess-data

What Lichess's data means once fetched: opening names and tags, explorer answers, popularity at the band, and where a
learner's games (from Lichess or Chess.com) leave their repertoire. Pure; the HTTP is in [lichess](lichess.md).

## Gives

- **Opening names**: `parseOpeningsTsv(text) → NamedPosition[]` (name, ECO, moves, EPD), `applyNames(tree, names)`
  (each position's deepest name), `lichessOpeningKey(name)`, and Lichess links (`lichessUrlForPath`,
  `lichessUrlForLine`, `lichessUrlForOpening`).
- **Tags**: `tagPositions(tag, names) → epd[]`: the positions along the shortest named line for a puzzle opening tag
  ("Italian_Game_Classical_Variation"), so [puzzles](puzzles.md) can match tags to an opening's positions.
- **Explorer answers**: `toExplorerCache(epd, response, now)`, `explorerKey(epd, db)`, `isFresh(row, now, days)`;
  `ExplorerPosition = { white, draws, black, moves: [{ uci, san, games, white, draws, black }] }`.
- **Popularity**: `applyPopularity(tree, file)` (counts onto an opening's positions), `popularityTargets(openings)`
  (positions worth fetching for `make popularity`), and `moveShare(position, uci)`, `positionShare(epd)` for weighting
  and coverage.
- **Your games**: `toGame(raw, source)` (one shape for both sites, id `<source>:<id>`), and
  `leftRepertoire(game, repertoire) → Deviation | null`, where a game first left what the learner knows:
  the ply, the position, the move played, the opening's move there, and who left (the learner or the opponent);
  `gameSummary(games, repertoire)`: what the learner meets most that the repertoire does not answer, per side.
- **Results**: `scoreShare(position)`, how the side to move scores from here at the band (for "players at your level
  score 46% after this").

## Takes

[chess](chess.md) (replaying names and games), [tree](tree.md) (an opening's positions), [schema](schema.md) (explorer,
popularity). Config: `coverage.band`, `coverage.minShare`, `lichess.cacheDays`.

## Rules

- **One band baked**: `coverage.band` (1000 to 1600, blitz and rapid) is what `popularity.json` and `knowledge.sqlite`
  hold. Other bands are live only, through the learner's token; a file fetched for another band is refused by the
  script (v1's check).
- **Explorer answers are kept `lichess.cacheDays`** (30) and keyed by position, database and band.
- **A game leaves the repertoire** at the first position where the side to move is the learner and the opening has a
  move but the game played another (the learner left), or where the opponent played a move the opening does not answer
  (the opponent left). Games are read only up to a little past that point (first 30 plies).
- **Names**: the deepest named position on a path names a line or variation unless the line's `Name` header says
  otherwise; ECO comes from the same row.
- **Counts are shares, not raw games**, wherever they weigh something, so a popular position and a rare one are
  compared fairly; unknown counts are rare, never zero.

## Used by

[training](training.md) (weighting, coverage, gaps), [judge](judge.md) (opponent mistakes' share),
[exercise](exercise.md) (the popular responder), [puzzles](puzzles.md), [tree](tree.md) (names); [explorer
store](../stores/explorer.md), [games store](../stores/games.md), [use-explorer](../hooks/use-explorer.md);
[board-explorer](../components/board-explorer.md), [opening-name](../components/opening-name.md),
[coverage-meter](../components/coverage-meter.md), [gap-link](../components/gap-link.md),
[position-card](../components/position-card.md); pages [your-games](../pages/your-games.md),
[onboarding](../pages/onboarding.md); scripts `content-build.ts`, `popularity.ts`, `gaps.ts`, the puzzle name job.

## From v1

- `packages/core/src/content/lichess.ts`, `openings-list.ts`: **keep**.
- `packages/core/src/content/explorer.ts` (`applyPopularity`, `explorerKey`, `EXPLORER_TTL_MS`, `toExplorerCache`,
  `popularityTargets`): **keep**; the TTL becomes `lichess.cacheDays`.
- `packages/core/src/schema/popularity.ts`, `schema/explorer.ts`: **keep** (in [schema](schema.md)).
- `packages/core/src/constants.ts` (`EXPLORER_BAND`): into config as `coverage.band`.
- `tagPositions`, `leftRepertoire`, `gameSummary`, `scoreShare`: **new**.

## Tests

The existing `explorer` and `lichess` tests stay. New: `tagPositions` on a few real tags; `leftRepertoire` for a learner
deviation, an opponent deviation, a game that never leaves, and a transposition back into the repertoire; shares with
missing counts.
