# The library

The code under the pages: pure logic in `packages/core`, the engine in `packages/engine`, storage in
`packages/storage`, and (new) the Lichess clients in `packages/lichess`. Same rule as v1: core imports no React, DOM,
engine or storage, so everything in it can be tested without a browser. One file per module below says what it gives.

## Do not reinvent

| Need                                           | Use                                                 | Status in v1 | Note                                                                                |
| ---------------------------------------------- | --------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| Rules, legal moves, SAN, FEN, attacked squares | `chess.js`                                          | in use       | its `attackers` and `isAttacked` are enough for position features                   |
| Reading PGN (comments, NAGs, variations)       | `@mliebelt/pgn-parser`                              | in use       | reads `[%cal]` / `[%csl]`; our own `[%tag]` / `[%idea]` are parsed from the comment |
| The engine                                     | Stockfish (npm `stockfish`, 19 lite, single thread) | in use       | GPL: a separate file in a worker, spoken to over UCI, never bundled                 |
| Spaced repetition                              | `ts-fsrs`                                           | in use       |                                                                                     |
| The board                                      | `react-chessboard`                                  | in use       |                                                                                     |
| Schemas                                        | `zod`                                               | in use       |                                                                                     |
| The browser database                           | sqlite-wasm                                         | in use       | also opens the shipped `knowledge.sqlite` read-only                                 |
| Scripts' local databases                       | `node:sqlite` (built into node)                     | new          | puzzle index, expansion                                                             |
| Decompressing the puzzle file                  | `zstd` (node's zlib, or the command)                | new          |                                                                                     |

Looked at and not used: **chessops** and **chessground** (Lichess's own libraries) are GPL-3.0, which would make our
code GPL too; **Maia** (a human-like engine) needs large model files, and the explorer's move counts already give
human-like replies; **multi-threaded Stockfish** needs cross-origin isolation headers that GitHub Pages cannot send (a
service-worker workaround exists, worth trying later for a stronger raw board).

## Modules

| Module                          | Gives                                                                                                                     | From v1                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [chess](chess.md)               | positions (EPD, FEN, ids), playing and listing moves, SAN and UCI, PGN in and out, move numbers, setting up a board       | `chess/` — keep                                                      |
| [tree](tree.md)                 | lines into the theory tree, an opening's tree, walking it, the map's layout                                               | `content/theory-tree`, `course-build`, `navigation/` — keep, rename  |
| [annotations](annotations.md)   | a move's note read and written (text, symbol, marks, tags, ideas), refutations, rich text                                 | `content/marks`, `rich-text`, `chess/pgn` — keep, extend             |
| [eval](eval.md)                 | scores in one form (White's view, mate), winning chance, the cost of a move, words for a score                            | `training/regret` — split out                                        |
| [judge](judge.md)               | the verdict on a move: grade, symbol, cost, refutation, from author then baked then live                                  | new, over eval and features                                          |
| [features](features.md)         | what is going on in a position: material, threats, hanging pieces, pins, forks, pawn structure, weak squares, king safety | new; `explain/motif` covers a little                                 |
| [explain](explain.md)           | the sentences: why a move is good or bad, what a position is about                                                        | `explain/` — repurpose                                               |
| [training](training.md)         | tries, grading, FSRS scheduling, cards of every kind, weighting, steps and their states, coverage, stats                  | `training/` — keep, extend                                           |
| [exercise](exercise.md)         | an exercise and its parts: graders, responders, checkpoints                                                               | new, from the four v1 stores' logic                                  |
| [puzzles](puzzles.md)           | reading Lichess puzzles, their start, matching them to positions, choosing which to ship                                  | new                                                                  |
| [lichess-data](lichess-data.md) | opening names and tags, explorer answers, popularity, games and where they leave a repertoire                             | `content/lichess`, `content/explorer`, popularity — keep, extend     |
| [search](search.md)             | forgiving text match, filters, positions to lines                                                                         | `search/` — keep                                                     |
| [settings](settings.md)         | the config schema, the settings registry, resolving a value through its layers, presets                                   | new                                                                  |
| [schema](schema.md)             | the shapes of content, built data, learner data and config (zod)                                                          | `schema/` — keep, extend                                             |
| [authoring](authoring.md)       | editing lines and openings, contributions, importing PGN and Lichess studies                                              | `authoring/` — keep, extend                                          |
| [modes](modes.md)               | Speed and Name it's own rules                                                                                             | `modes/` — keep                                                      |
| [engine](engine.md)             | the engine package: one search at a time, multi-line, continuous analysis, cache                                          | `packages/engine` — keep, extend                                     |
| [storage](storage.md)           | the storage package: the learner database, repositories, export                                                           | `packages/storage` — keep                                            |
| [lichess](lichess.md)           | the new package: Lichess HTTP clients with rate limits, used by the app and the scripts                                   | new, from `features/explorer/service.ts` and `scripts/popularity.ts` |

## How they depend

```
chess ◀── annotations ◀── tree ◀── training, exercise, search, authoring
  ▲            ▲
  ├── eval ◀── judge ◀── explain
  ├── features ◀───────┘
  └── puzzles, lichess-data
settings, schema: used by all, depend on nothing but zod
engine, storage, lichess (packages): import core types only
```

## The raw board

The simplest use of the library, and a page of its own ([../pages/board.md](../pages/board.md)): `chess` to play and
set up, the `engine` package's continuous analysis for the bar and the best lines, `eval` for the words. Nothing else is
needed; everything more (explorer, features, your openings) is optional.
