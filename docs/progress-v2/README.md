# Content progress, v2

Where the run of adding openings stopped on 2026-11-06, and what comes next. Each unfinished opening has its own file
here with the exact steps to resume.

## Live or ready to ship

Committed on `v2` with depth 18 analysis, checks and puzzles:

| Opening                 | Id                    | Side  | Lines | Track         |
| ----------------------- | --------------------- | ----- | ----- | ------------- |
| Caro-Kann Defence       | `caro-kann-black`     | Black | 171   | `black-e4`    |
| Caro-Kann Defence       | `caro-kann-white`     | White | 19    | `first-e4`    |
| English Opening         | `flank-black`         | Black | 10    | `black-other` |
| French Defence          | `french-white`        | White | 20    | `first-e4`    |
| Italian Game            | `italian-white`       | White | 35    | `first-e4`    |
| London System           | `london-white`        | White | 57    | `first-d4`    |
| Open Games              | `e5-black`            | Black | 20    | `black-e4`    |
| Queen's Gambit          | `queens-gambit-white` | White | 20    | `first-d4`    |
| Queen's Gambit Declined | `qgd-black`           | Black | 22    | `black-d4`    |
| Ruy Lopez               | `ruy-lopez-white`     | White | 26    | `first-e4`    |
| Scandinavian Defence    | `scandinavian-white`  | White | 15    | `first-e4`    |
| Sicilian Defence        | `sicilian-white`      | White | 20    | `first-e4`    |

## Unfinished, in the working tree and not committed

These must not ship until `content:check` passes on them. They are uncommitted on purpose, because a push to `main`
deploys whatever `v2` holds.

| Opening               | State                                                                     | Log                                            |
| --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| King's Indian Defence | Written (15 lines). 26 of 209 positions analysed. Figures from depth 16.  | [kings-indian-black.md](kings-indian-black.md) |
| Other Replies to 1.e4 | Written (12 lines). About 250 positions to analyse, refutations to write. | [rare-replies-white.md](rare-replies-white.md) |
| Réti Opening          | Research and design only; nothing in `content/`.                          | [reti-black.md](reti-black.md)                 |

Uncommitted files that belong to them: `content/openings/{kings-indian-black,rare-replies-white}.yaml`, their folders under
`content/lines/`, `content/puzzles/{kings-indian-black,rare-replies-white}.jsonl`, and the matching entries in
`content/tracks.yaml` and `content/ideas.yaml` (`fianchetto`, `pawn-storm`). Research is in `.scratch/handoff/` (git-ignored).

## What comes next

1. Finish the three above, one at a time on the engine: the King's Indian (about 40 minutes of analysis), the rare replies,
   then the Réti. Follow each log, then `content:check`, `make doctor`, `make puzzles`, `make check`.
2. The Evans Gambit, which extends the Italian (`.content/white/gambits/evans-gambit/`), and the King's Gambit
   (`.content/white/gambits/kings-gambit/`).
3. Later, if wanted: the Danish and Vienna gambits, and Black's gambit lines. The Blackmar-Diemer, Torre and Veresov are
   gaps in `qgd-black`, to add there rather than as openings.

The way of working is in the `add-content` skill: 10 to 20 main lines by popularity, depth 18, one Stockfish at a time
and one thread, line ids that don't start like a move.

## Decisions for the owner

- **The Advance:** the French now uses 3.Nd2 and the Caro-Kann for White uses 3.exd5 and 4.Bd3, chosen by score at the
  band, so v1's Advance lines are gone from both, though 3.e5 is the most played move in each. Keeping them would take an
  opening of their own.
- **The Sicilian:** it is the Alapin, so the Najdorf and Dragon aren't in it. The Open Sicilian would be a separate opening.
- **Notes by side:** a move has one note across all openings, so Black inherits notes written for White in `qgd-black` and
  `e5-black` (for example `london-main` 3...e6, and 2...Nc6). Letting a note differ by side is an app change, not yet made.
- **Size of `qgd-black`:** 22 lines against a target of 8 to 12: 13 teach, 8 are short links. The links are the first to cut.
- **First moves:** an opening has one start, which is why 1.c4 and 1.Nf3 are separate openings. Allowing an empty start
  would need a change in core and in coverage.
