# lichess

The new `packages/lichess` package: HTTP clients for the Lichess services we use (and Chess.com's games), with one
request at a time and a pause after being rate limited, shared by the app and the scripts.

## Gives

- **`createLichess({ token?, fetch?, pauseAfter429Ms })`**: one client per tab or script run, holding the queue and the
  pause. Each method returns parsed data or throws a typed error.
- **`explorer(epd, { db, speeds, ratings })`**: what is played from a position (`explorer.lichess.org/lichess` or
  `/masters`): totals, results, moves with counts, the opening name.
- **`gamesByIds(ids)`**: `POST /api/games/export/_ids`, at most 300 ids a request (longer lists are split), NDJSON with
  moves, yielded as they stream in: the puzzle expansion job's source.
- **`userGames(username, { since, max })`**: `GET /api/games/user/{username}`, NDJSON, newest first, with moves and the
  opening. **`chesscomGames(username, { months })`**: `api.chess.com/pub/player/{name}/games/archives`, then each
  month's archive. Both feed [your games](../pages/your-games.md), with ids `lichess:<id>` and `chesscom:<id>`.
- **`studyPgn(studyId)`**: `GET /api/study/{id}.pgn` for [pgn-import](../components/pgn-import.md).
- **`openingNames()`**: `lichess-org/chess-openings` (CC0, five TSV files), read once by the build into `.cache/`.
- **`downloadPuzzles(toPath)`** (node only): `database.lichess.org/lichess_db_puzzle.csv.zst` into `.cache/puzzles/`,
  resumable, no token; decompressing (zstd) is the caller's.
- Errors: `LichessPausedError` (`untilMs`), `LichessAuthError` (401), `LichessHttpError` (never with the token).

## Takes

`fetch`, `AbortSignal`, `ReadableStream`, `TextDecoder`: in browsers and node alike, so one code path serves both; the
puzzle download alone uses `node:fs`, in a node-only entry (`@knightschool/lichess/node`). Core **types only** and
core's schemas via `@knightschool/core/schema` for parsing. No storage, no React.

## Rules

- **One request at a time** per client (a promise queue, as v1's explorer service and `scripts/popularity.ts`);
  requests for the same thing in flight share one.
- **After a 429**, nothing for `lichess.pauseAfter429` (60 s): the app gets `LichessPausedError` at once ("paused for a
  minute"); scripts wait it out.
- **The token is passed in**; the package never reads storage, localStorage or the environment. The app takes it from
  the secret setting `lichess.token` (localStorage, this browser only); scripts take `LICHESS_TOKEN` from `.env`, loaded
  only through node's `--env-file-if-exists=.env`. It goes only in the `Authorization: Bearer` header: never in a URL,
  log, error, the database or an export.
- **What needs it**: the explorer does (no token, no call); a user's games, public studies and the puzzle file do not,
  and a token only raises Lichess's rate limit. Chess.com takes no token.
- **Caching is the caller's**: `explorer_cache` for `lichess.cacheDays` (30) and the `games` table in the app,
  `.cache/` in scripts. NDJSON is read line by line, so a long export can be aborted and resumed from the last id kept.
  Lichess (and its CC0 puzzle database) is credited on the Credits page.

## Used by

[lichess-data](lichess-data.md); [explorer](../stores/explorer.md) and [games](../stores/games.md) stores,
[use-explorer](../hooks/use-explorer.md); [board-explorer](../components/board-explorer.md),
[pgn-import](../components/pgn-import.md); pages [your-games](../pages/your-games.md),
[onboarding](../pages/onboarding.md), [settings](../pages/settings.md); scripts `popularity.ts`, `content-emit.ts`
(opening names), the puzzle jobs ([../puzzles.md](../puzzles.md)).

## From v1

- `apps/web/src/features/explorer/service.ts` (`createExplorer`, `PAUSE_AFTER_429_MS`, `ExplorerPausedError`): the
  request discipline **moves here**; `getToken` and `setToken` become the secret setting. `response.ts` and core's
  `schema/explorer.ts`: the response schema.
- `scripts/popularity.ts` (its own fetch loop and 429 wait) and the names download in `scripts/content-emit.ts`:
  **repurpose** onto this client. Games, studies, the puzzle download, Chess.com: **new**.

## Tests

With a fake `fetch`: one request in flight; a 429 pauses; 401 gives the auth error; no error contains the token; 650
ids become three requests; NDJSON split across chunks parses; no token, no explorer call. The same tests run in node
and a browser-like environment (no `node:` import outside the node entry).

## Open questions

1. Named for Lichess but also reading Chess.com: renaming it `packages/sites` is in ../decisions.md.
2. The streaming rate of `/api/games/export/_ids` is undocumented (../puzzles.md); measure before promising times.
