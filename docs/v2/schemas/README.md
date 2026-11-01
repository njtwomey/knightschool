# Data

What the data looks like, and where each piece lives, so the rest of the plan can be about using it. Simple shapes,
few of them, keyed the same way everywhere.

## Four homes

| Home                       | What                                                                                                                 | Format                               | Written by                  | Changes             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------- | ------------------- |
| **Content** (the repo)     | openings, lines with their notes and marks, ideas, tracks, config                                                    | YAML and PGN, by hand                | authors, reviewed in git    | rarely              |
| **Built data** (shipped)   | each opening's tree, the catalogue, and facts about positions: names, how often played, evaluations, puzzles, search | JSON, plus one read-only SQLite file | the build and the data jobs | each release        |
| **Learner data** (browser) | settings, repertoire, cards, answers, your games, openings you write                                                 | SQLite in the browser                | the app                     | constantly          |
| **Caches**                 | the full puzzle database, explorer answers, engine results                                                           | whatever suits                       | jobs and the app            | anytime, disposable |

**The rule:** written by a person → content. Worked out from other data → built. About one learner → learner data.
Fetched from outside → cache, and only the selection we keep is committed (as `popularity.json` is today).

```
content/ (YAML, PGN)  ──build──▶  built JSON + knowledge.sqlite  ──▶  the app reads (never writes)
      ▲                              ▲                                   │
      │ authors                      │ data jobs (popularity, analysis,  │ the app writes
      │                              │ puzzles) from caches              ▼
                                                                   learner database (exported)
```

## Keys, the same everywhere

| Thing           | Key                                                                                                                   | Example                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Position        | EPD (FEN without the move counters), so transpositions are one                                                        | `rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -` |
| Position, short | a hash of the EPD, for addresses and the shipped files (v1 `positionId`)                                              | `p3f9a1c2`                                                   |
| Move            | UCI, from a position                                                                                                  | `g1f3`                                                       |
| Opening         | a slug                                                                                                                | `italian-white`                                              |
| Variation       | a slug, unique within its opening                                                                                     | `giuoco-piano`                                               |
| Line            | a slug, unique across all lines (it is the file name)                                                                 | `giuoco-piano-main`                                          |
| Step            | `<line>:<n>`, from the automatic cut (v1 unit ids)                                                                    | `giuoco-piano-main:2`                                        |
| Idea            | a slug                                                                                                                | `fork`                                                       |
| Puzzle          | Lichess's id                                                                                                          | `0009B`                                                      |
| Card            | `<kind>:<ref>`; a move card is `move:<epd>:<uci>` (recommended, [upgrades.md](upgrades.md); v1 used `<course>:<epd>`) | `puzzle:0009B`, `move:<epd>:g1f3`                            |
| Game            | `<source>:<id>`, source `lichess` or `chessdotcom`                                                                    | `lichess:q7ZvsdUF`                                           |

Ids that reach learner data (opening, line, puzzle, idea, card) are permanent; a rename is written as `renamed:` in the
content and applied on load ([upgrades.md](upgrades.md)). Progress itself is keyed by position and move, so steps,
variations and lines can be recut without losing any.

## The documents

| File                             | What it describes                                                                |
| -------------------------------- | -------------------------------------------------------------------------------- |
| [content.md](content.md)         | The authored files: `opening.yaml`, line PGN, `ideas.yaml`, `tracks.yaml`        |
| [annotations.md](annotations.md) | A move's note: text, symbol, marks, tags, ideas, refutations                     |
| [built.md](built.md)             | What the build ships: opening trees, the catalogue, the knowledge file, search   |
| [learner.md](learner.md)         | The browser database: settings, repertoire, cards, answers, games, authoring     |
| [upgrades.md](upgrades.md)       | Keeping learners' data through updates: migrations, re-keyed move cards, renames |
| [sync.md](sync.md)               | Local first, a server later: what keeps the door open to syncing                 |

Config (`content/config.yaml`) is in [../config.md](../config.md).

## What stays as v1 has it

PGN for moves and notes, positions keyed by EPD, one comment per move, YAML for an opening's description, validation
at build and trust at run time, the learner database and its export. What changes: fewer PGN headers, openings
described with variations and steps, ideas instead of motifs, refutations, and the facts about positions gathered
into one shipped file.
