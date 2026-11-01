# chess

The foundation: positions and their keys, playing and listing moves, SAN and UCI, PGN in and out, move numbers, and
setting up a board, all as thin wrappers over chess.js and the PGN parser.

## Gives

- **Positions**: `fenToEpd`, `epdToFen`, `START_EPD`, `START_FEN`; `positionId(epd)`, the short hash used in addresses
  and the shipped files; `positionFromEpd(epd)` for a chess.js board; `sideToMove(epd)`.
- **Moves**: `playUci(epd, uci) → Played` and `playSan`, where `Played = { uci, san, epd }`; `replayUcis(startEpd,
ucis) → Played[]`, stopping at the first illegal move; `legalMovesFrom(epd, square)`; `uciOf`, `withPromotion`;
  `pvToSan(epd, pv)` to read an engine line; `epdAfterPgn(pgn)`.
- **New, for features**: `nullMove(epd) → epd | null` (the same position with the other side to move and en passant
  cleared; null when in check), and `attackersOf(epd, square, side)` returning pieces, not only squares.
- **Move numbers** (one helper each, never by hand): `numberedMove` and `moveNumberLabel` for a single move ("1.e4",
  "1...e5"); `numberedLine` and `runMove` for a run ("1. e4 e5 2. Nf3").
- **PGN**: `parsePgn(text) → PgnGame[]` with every move's comment, NAGs, arrows, circles, tags and variations kept;
  `writePgn(game)`; `noteToMove`, `hasNote`. Reading the comment's own commands is [annotations](annotations.md)'s job.
- **Setting up a board**: `setupFromFen`, `placePiece`, `pieceAt`, `possibleCastling`, `fenFromSetup`, `checkFen`
  (says why a position is illegal), `pgnFor`, `loadGame`.
- **`resolvePosition(source)`**: a FEN, an EPD or a PGN at a ply, to one position (the board thumb and the raw board).

## Takes

`chess.js` (rules, legal moves, SAN, FEN, `attackers`, `isAttacked`) and `@mliebelt/pgn-parser`. Nothing else in core.

## Rules

- **Positions are keyed by EPD** (FEN without the move counters), so transpositions are one position everywhere: cards,
  evaluations, explorer counts, puzzles.
- **UCI inside, SAN for people.** Data, addresses and logs hold UCI; text shown to a person is SAN with a move number
  from the notation helpers.
- **Replaying stops, never throws**, at the first illegal move (`replayUcis`); a strict walk that must throw is
  [tree](tree.md)'s `pathFromUcis(..., { strict })`.
- `checkFen` says why a position is not valid. Today it repeats chess.js's message; v2 adds plain sentences for what
  chess.js accepts but a person cannot reach (the side not to move in check, pawns on the back rank), so the raw
  board's Set up can say why.
- chess.js objects never leave this module's functions except where a caller needs attackers (features); everything
  else passes strings.
- chessops is not used: it is GPL-3.0 (README).

## Used by

Every other core module. In the app: [board](../components/board.md), [board-surface](../components/board-surface.md),
[move-chip](../components/move-chip.md), [move-run](../components/move-run.md),
[move-table](../components/move-table.md), [board-thumb](../components/board-thumb.md),
[position-preview](../components/position-preview.md), [board-search](../components/board-search.md),
[use-board-model](../hooks/use-board-model.md); pages [board](../pages/board.md) (Set up, Paste, Copy),
[line-editor](../pages/line-editor.md); scripts `content-build.ts`, `analyse.ts`, `fen.ts`, `popularity.ts`.

## From v1

- `packages/core/src/chess/epd.ts`, `chess.ts`, `position-id.ts`, `position.ts`, `notation.ts`, `pgn.ts`,
  `board-edit.ts`: **keep**; `checkFen` gains its sentences.
- `nullMove` and the piece-returning attackers: **new**, small; `explain/motif.ts`'s private `attackersOf` moves here.

## Tests

The existing tests stay (`epd`, `chess`, `position-id`, `position`, `notation`, `pgn`, `board-edit`). New: `nullMove`
refuses a position in check and clears en passant; `attackersOf` lists pieces with their squares; `parsePgn` keeps a
refutation variation with its NAG on the first move.
