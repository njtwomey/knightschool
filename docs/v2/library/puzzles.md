# puzzles

Reading Lichess puzzles, working out where they start and who solves, matching them to positions at six levels, and
choosing which to ship and which to offer.

## Gives

- **`parsePuzzleRow(csvRow) → Puzzle`**: `{ id, fen, moves, rating, deviation, popularity, plays, themes, gameId, ply,
openingTags }` from the database's columns; `gameId` and `ply` from `GameUrl`.
- **`puzzleStart(puzzle) → { epd, solver, solution }`**: the row's FEN is the position _before_ the opponent's move,
  so the start is that FEN with the first move played; the solver is the side to move there; the solution is the rest.
- **`isSolved(puzzle, tries)`**: the learner's moves match the solution, or a different move mates at once where the
  solution mates (the puzzle grader's "any mate counts", used by [exercise](exercise.md)).
- **Matching**, one function per level (../puzzles.md), strongest first:
  - `throughPosition(index, epd)` and `afterLine(index, lineEndEpd)`: puzzles whose game passed through a position, from
    the expansion index (`position → puzzles`), with the plies from there to the puzzle;
  - `namedVariation(tagIndex, epd)` and `openingFamily(tagIndex, epd)`: by the puzzle's opening tags, matched to the
    deepest named position on the path ([lichess-data](lichess-data.md) names each tag's moves);
  - `sameStructure(puzzle, epd)`: `structureKey` equal ([features](features.md));
  - `sameIdea(puzzle, ideas)`: a puzzle theme that an idea lists (`themes:` in `ideas.yaml`).
- **`selectPuzzles(opening, lookups, config) → Selection`**: walk an opening's positions, look each up level by level,
  filter, rank and cap; the output is the committed `content/puzzles/<opening>` file with the level and position each
  was matched at.
- **`puzzlesFor(position, selection, filter) → Puzzle[]`**: in the app, the puzzles to offer at a step's end, a trap,
  a checkpoint or an idea, falling down the levels until enough are found.
- **`themeIdeas(themes) → idea ids`**: Lichess themes mapped to our ideas, for "what this puzzle shows".

## Takes

[chess](chess.md), [features](features.md) (`structureKey`), [lichess-data](lichess-data.md) (tag positions, counts),
[schema](schema.md). The index (a `node:sqlite` file in `.cache/puzzles/`) is built and queried by scripts; this
module holds only the pure rules they and the app share.

## Rules

- **Levels and order**: `puzzles.levels` (through, after, variation, family, structure, idea). A puzzle keeps the
  strongest level it matched at.
- **Shipping filter** (`puzzles.select`): rating 600 to 1800, popularity 80 or more, 500 plays or more, a low rating
  deviation, one puzzle per game; at most `puzzles.perOpening` (300) per opening.
- **Ranking** within a level: soon after the position before later, positions reached more often (band counts) before
  rarer, then popularity, then plays.
- **Offering** in the app: `puzzles.perStep` (2) at a step's end; filtered by the learner's rating range, who solves
  (you, the opponent, both: a puzzle the opponent solves is a danger to watch), match levels and themes (settings).
- **Who solves** is the side to move after the first move. **Any mate counts**: a move that mates at once where the
  solution mates is right; otherwise only the solution move.
- Matching is by **position**, not by opening, so an opening written in Create asks the same index (../puzzles.md,
  "Independent of openings").

## Used by

[exercise](exercise.md); [puzzles store](../stores/puzzles.md); [puzzle-card](../components/puzzle-card.md),
[puzzle-picker](../components/puzzle-picker.md); pages [puzzles](../pages/puzzles.md), [step](../pages/step.md),
[checkpoint](../pages/checkpoint.md), [idea](../pages/idea.md), [today](../pages/today.md); the puzzle jobs (index,
name the tags, expand, select, look up; [../puzzles.md](../puzzles.md)) and `scripts/content-build.ts` (the
`puzzles` and `puzzle_at` tables).

## From v1

New. Nearest in v1: quiz cards (`training/cards.ts`, `quizCardId`) for the card shape; `content/openings-list.ts`
(`parseOpeningsTsv`) for naming tags.

## Tests

`parsePuzzleRow` and `puzzleStart` on real rows (both solvers, a promotion, a mate in one); `isSolved` with the
solution, another mate, a non-mating alternative; each level on a fixture index and falling down them; the shipping
filter's edges and one per game; `selectPuzzles` stable and capped at `puzzles.perOpening`.

## Open questions

1. How close counts as "same structure" (../puzzles.md question 2): identical pawns, or most of them? Identical first.
