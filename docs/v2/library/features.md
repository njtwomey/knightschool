# features

What is going on in a position, found by looking at the board (never the engine): material, threats, loose pieces,
tactics, pawn structure, weak squares, files, king safety, development.

## Gives

- **`positionFeatures(epd, { kinds?, side? }) → Feature[]`**, most urgent first. A `Feature` is
  `{ kind, favours: side, squares, arrows, colour, data }`; the squares and arrows are what the board lights on hover,
  the colour one of the mark colours (R Threat, Y Target, B Support, G Idea; [annotations](annotations.md)). Wording
  is [explain](explain.md)'s job, not this module's.
- One function per kind, each usable alone:
  - **`material(epd)`**: piece counts per side and the balance in pawns (1, 3, 3, 5, 9), plus the bishop pair.
  - **`hanging(epd)`**: pieces attacked and undefended, or attacked by a piece worth less than they are.
  - **`threats(epd)`**: what the side to move threatens now: captures that win material, checks, mate in one. With
    `byOpponent: true`, what the other side would do if it were their turn (a null move: side to move flipped,
    en passant cleared; skipped when in check).
  - **`pins(epd)`, `skewers(epd)`**: along each rook and bishop line from every queen, rook and bishop, the first enemy
    piece and the one behind it: a pin when the one behind is worth more (absolute when it is the king), a skewer when
    the front one is.
  - **`forks(epd)`**: moves available that attack two or more pieces worth more than the mover, or the king and a
    loose piece, after the move.
  - **`pawnStructure(epd)`**: per side, isolated, doubled, backward and passed pawns, pawn islands.
  - **`structureKey(epd)`**: the pawns only, as a short string (white pawns' squares, then black's), so two positions
    with the same pawns share a key whatever the pieces. Used to match puzzles, plans and Play on positions.
  - **`weakSquares(epd)`**: per side, squares in its half (ranks 3 to 6 for outposts) that no pawn of the side can ever
    attack (no pawn on an adjacent file behind it). An **outpost** is such a square of the opponent's that one of your
    pawns supports.
  - **`files(epd)`**: open files (no pawns) and half-open files per side (no pawn of that side).
  - **`kingSafety(epd)`**: per side, castled or not and castling rights left, the pawn shield (pawns on the three files
    round the king, one or two ranks ahead), enemy pieces attacking the squares next to the king, open and half-open
    files at the king.
  - **`development(epd)`**: minor pieces still on their first squares, the queen out early, castled; **`centre(epd)`**:
    pawns and pieces on d4, e4, d5, e5 and the attacks on them.

## Takes

[chess](chess.md): `positionFromEpd` and chess.js's `board()`, `attackers(square, colour)`, `isAttacked`, `moves()`,
`isCheckmate()`. Nothing else: no engine, no data, so it works offline and in tests.

## Rules

- **Cost.** Cheap enough for every position shown (a scan of 64 squares and their attackers, no moves played):
  material, hanging, pins and skewers, pawn structure, the structure key, weak squares and outposts, files, king
  safety, development and centre. Run them as the board's cursor moves and over lists of positions.
- **Not cheap enough for lists** (they play every legal move and look again): threats (both sides), forks available,
  mate in one. Run them for the one board the learner is looking at, on demand, and never across the map, search
  results or thumbnails. A budget to measure: under 5 ms per position on a phone.
- The build computes `structureKey` for every position it ships (`knowledge.sqlite` `positions.structure`) and for
  each puzzle, so the app never computes it in bulk.
- **Value of a capture** is the simple rule v1's motif detector uses: a piece is loose if attacked and undefended, or
  attacked by something cheaper; no full exchange sequence. Good enough for beginners and fast; a static exchange
  count can come later if it misleads.
- In check, only answers to the check matter: hanging pieces other than the checking piece are not reported as
  threats (v1's rule).
- Pins on the king are absolute (the pinned piece cannot move off the line); others are relative.
- Each feature says whom it favours, so a list reads "good for you" and "watch out" from the learner's side.
- The author's marks win: when a move's note already marks a square or arrow, the same feature is not repeated.

## Used by

[explain](explain.md) (position sentences, the punishment in an engine line), [puzzles](puzzles.md) (`structureKey`),
[judge](judge.md) (indirectly, through explain); [position-features](../components/position-features.md),
[move-explanation](../components/move-explanation.md) ("what it leaves"),
[board-surface](../components/board-surface.md) (the highlight layer); pages [board](../pages/board.md),
[step](../pages/step.md) (Read and Done), [puzzles](../pages/puzzles.md), [idea](../pages/idea.md),
[play-on](../pages/play-on.md); `scripts/content-build.ts` and the puzzle index job (structure keys).

## From v1

- `packages/core/src/explain/motif.ts`: **repurpose**. Its `VALUE` table, `attackersOf` and `exposed` become
  `hanging`; its per-move detectors (hanging after a move, forks, pins, skewers, mate threats, castling lost) stay in
  [explain](explain.md) but call these functions on the positions before and after the move.
- Position-wide passes (null-move threats, pawn structure, structure key, weak squares, files, king safety,
  development): **new**.

## Tests

- One small set of FENs per kind, table-driven: a known pin, a skewer, an absolute pin, a knight fork, a loose bishop,
  a defended piece attacked by a pawn, isolated and doubled and passed pawns, an outpost on d5, open and half-open
  files, a castled king with a broken shield.
- The null move is skipped in check; en passant is cleared.
- `structureKey`: transpositions with the same pawns give one key; moving a piece does not change it; moving a pawn
  does.
- A timing test over a few hundred opening positions, so the "cheap" list stays cheap.

## Open questions

1. Settled: the structure key is pawns only. A second key with the king squares can be added if matching proves too
   loose.
