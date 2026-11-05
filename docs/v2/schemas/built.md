# Built data: what the app reads

The build turns content and the data jobs' output into files the app reads and never writes. Two kinds: small JSON
files the app loads as needed, and one read-only SQLite file for the large tables keyed by position.

## JSON: openings and the catalogue

**`catalog.json`**, loaded at start: every opening, variation, idea and track in brief.

```json
{
  "openings": [
    {
      "id": "italian-white",
      "name": "Italian Game",
      "side": "white",
      "level": "first",
      "style": ["classical"],
      "start": "p3f9a1c2",
      "variations": ["giuoco-piano", "two-knights"],
      "steps": 18,
      "moves": 72
    }
  ],
  "ideas": [{ "id": "fork", "name": "Fork", "kind": "tactic", "summary": "..." }],
  "tracks": [{ "id": "first-e4", "name": "...", "openings": ["italian-white"] }]
}
```

**`openings/<opening>.json`**, loaded when an opening is opened: its tree, lines, variations and steps.

```json
{
  "id": "italian-white",
  "positions": {
    "<epd>": {
      "moves": [
        {
          "uci": "c2c3",
          "san": "c3",
          "to": "<epd>",
          "mine": true,
          "lines": ["giuoco-piano-main"],
          "note": { "text": "...", "arrows": ["Gc3d4"] }
        }
      ],
      "refutations": [{ "uci": "f8b6", "nag": [2], "text": "...", "then": ["d4d5"] }]
    }
  },
  "lines": [
    {
      "id": "giuoco-piano-main",
      "variation": "giuoco-piano",
      "kind": "main",
      "name": "...",
      "moves": ["e2e4", "e7e5", "..."],
      "alternative": false
    }
  ],
  "variations": [
    { "id": "giuoco-piano", "name": "Giuoco Piano", "intro": "...", "plans": ["..."], "branchesAt": "<epd>" }
  ],
  "steps": [
    {
      "id": "giuoco-piano-main:1",
      "variation": "giuoco-piano",
      "line": "giuoco-piano-main",
      "from": 6,
      "to": 13,
      "after": [],
      "title": "...",
      "text": "..."
    }
  ]
}
```

The same shape as v1's opening content (EPD-keyed positions, moves with notes), plus variations, steps and
refutations. `mine` is v1's `isRepertoire`. A refutation (as built: `{ uci, san, note?, then: [{ uci, san, note? }] }`) keeps the author's
note on every move of its punishing line, which a step's follow-ups show ([../pages/follow-up.md](../pages/follow-up.md)).

**`config.json`**: the app's part of `content/config.yaml`.

## SQLite: `knowledge.sqlite`, facts about positions

Read-only, fetched once and cached by the service worker, queried through the sqlite-wasm the app already runs. It
holds everything that is about a position rather than about an opening, so every opening, including one written in
Create, can ask it.

| Table       | Columns                                                                    | From                      |
| ----------- | -------------------------------------------------------------------------- | ------------------------- |
| `positions` | `id` (short hash), `epd`, `name`, `eco`, `games`, `structure` (pawns only) | Lichess names, popularity |
| `moves`     | `position`, `uci`, `games`, `white`, `draws`, `black`                      | popularity (the band)     |
| `evals`     | `position`, `depth`, `cp`, `mate`, `best` (UCI line), `multipv`            | `pnpm analyse`            |
| `puzzles`   | `id`, `fen`, `moves`, `rating`, `popularity`, `plays`, `themes`, `solver`  | the puzzle selection      |
| `puzzle_at` | `puzzle`, `position`, `level`, `plies`                                     | the puzzle matching       |
| `lines_at`  | `position`, `opening`, `line`, `ply`                                       | the build (board search)  |
| `search`    | full-text index over names: openings, variations, lines, ideas, positions  | the build                 |

Why one SQLite file rather than JSON: popularity, evaluations and puzzles grow to tens of thousands of positions, and
the app needs lookups ("puzzles through this position", "moves here", "lines through here"), not the whole lot in
memory. v1 already ships its own JSON for each (`analysis.json`, `search.json`); this gathers them into one file with
indexes. Size target: a few megabytes.

Small and simple stays JSON: the catalogue, each opening, config.

## Search

- **By words:** the `search` table (SQLite full-text) over names and summaries, with v1's forgiving match
  (`editDistance`) applied to its results.
- **By position:** `lines_at`, so a position set up on the board finds every line through it, transpositions included
  (v1 `search.json` does this today).
- **Openings you write in Create** are not in the shipped file; the app adds them to its in-memory results (v1 leaves
  them out of board search).

## Where each comes from

| Built file or table    | Inputs                                                       | Job                             |
| ---------------------- | ------------------------------------------------------------ | ------------------------------- |
| openings, catalogue    | `content/`                                                   | `content:build`                 |
| `positions`, `moves`   | Lichess names (`.cache/openings.tsv`), `content/popularity/` | `make popularity`, the build    |
| `evals`                | `content/analysis/`                                          | `pnpm analyse`                  |
| `puzzles`, `puzzle_at` | `.cache/puzzles/`, the committed selection                   | the puzzle jobs (../puzzles.md) |
| `lines_at`, `search`   | the built openings                                           | `content:build`                 |

## What is worked out at build, not in the page

Anything slow ships with the opening rather than being worked out in a page. `followUps` run the judge over the tree, so
`content:build` writes them into `openings/<id>.json`. A line's moves are read from the tree (`positions` already holds
each move's SAN and the position after it), with no chess library. `loadProgress` loads an opening's facts, its largest
file, only for the pages that use them (`factsFor`).
