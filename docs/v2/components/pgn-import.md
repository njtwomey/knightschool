# PGN import

Bringing moves written elsewhere into Create: a pasted PGN, a `.pgn` file, or a public Lichess study by its address.
It shows what it found before anything is saved, then turns it into lines, comments, marks and refutations.

## Shows

- **Three ways in** as tabs: Paste, File, Lichess study (a box for `lichess.org/study/...`).
- **What was found**, after reading: one row per game or study chapter with its name, the number of moves, and what
  each will become:
  - the main moves: a **line** (named from the chapter or the `[Event]` header);
  - a side variation that starts with a move marked `?` or `??`: a **refutation**;
  - any other side variation: a **line** branching from that move;
  - comments: **move comments**; `[%cal]` and `[%csl]`: **marks**; NAGs: **symbols**.
- **Into which opening**: a new one (name and side) or one of your openings; for a new one, which side each line is for.
- **Problems** per row, in place ([problems-list](problems-list.md)): an illegal move ("move 14 Nxe5 is not legal; the
  game stops at move 13"), a start position other than the usual one, a comment that clashes with one already written
  for the same move (one comment per move: the existing one stays, the import's is shown beside it).
- **Import 4 lines** as the one button.

## Configuration

- `target`: an opening to add to, or none for "new opening".
- `side`: preset when importing into an opening.

## Behaviour

- Reading happens in the browser; a Lichess study is fetched from Lichess's public export, one request, with the
  learner's token if the study is private and the token is set.
- Rows can be unticked; a row with a problem imports up to the problem when ticked.
- Importing is **one undoable action** ("import 4 lines from Two Knights study"), so a bad import is taken back whole.
- Moves already in the tree are joined, not copied: the import starts each line where it branches off an existing one,
  as `[Start]` does.
- Offline: the Lichess tab says "Needs a connection"; Paste and File still work.

## Composed of

[problems-list](problems-list.md), [move-run](move-run.md), [undo-button](undo-button.md), [notice](notice.md),
shadcn `Tabs`, `Textarea`, `Input`, `Dialog`, `Checkbox` (to add from shadcn, [inventory](../inventory.md)).

## Used by

Pages [create](../pages/create.md) (Import) and [create-opening](../pages/create-opening.md).

## From v1

New, built on what reads PGN today: core `chess/pgn.ts` (keeps variations, comments and NAGs), Lab's paste box
(`features/lab/load-card.tsx`), and Create's `ImportContributionDialog` in `features/create/publish.tsx`, which reads a
contribution YAML back; that dialog stays beside this one.
