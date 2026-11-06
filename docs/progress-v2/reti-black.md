# reti-black: Black against 1.Nf3 (1. Nf3 d5)

## Status

Stopped by the user before any content was written. The research is nearly finished and the opening is designed, but
nothing is in `content/`: no opening yaml, no line files, no `tracks.yaml` or `ideas.yaml` edit, and nothing of this
opening in `analysis.jsonl` or `popularity.jsonl`. It cannot have affected `content:build`.

## Done

- Band data and depth 18 engine checks for every planned move. Results are in `.scratch/handoff/reti/` (see below).
- The design below: 3 variations, 7 lines (the limit). No steps exist yet, because steps are cut by the build.

Not done: writing, `content:build`, `make popularity`, analysis, `content:check`, `make doctor`.

## What's left, in order

1. Do the checks under "Still to check".
2. Write the 7 PGN files and `content/openings/reti-black.yaml` outside `content/`, then copy them in at once. A partial
   yaml can break another agent's build. Lines go in `content/lines/nf3/reti/<queens-gambit|g3|tennison>/`.
3. Append `reti-black` to the `black-other` track in `content/tracks.yaml`. Re-read the file first; it is shared.
4. Run the pipeline from the repo root. Take the lock as the skill says.

```sh
npx -y pnpm@12.11.2 content:build
LOCK=/private/tmp/claude-501/ks-engine.lock
until mkdir $LOCK 2>/dev/null; do sleep 15; done; make popularity 2>&1 | tail -3; rmdir $LOCK
# Repeat until the output says "left 0".
until mkdir $LOCK 2>/dev/null; do sleep 15; done
while pgrep -x stockfish >/dev/null; do sleep 5; done
ONLY=reti-black REPLIES=0.03 MINUTES=14 timeout -s INT 900 node --import tsx .scratch/handoff/london/analyse-one.mts 2>&1 | tail -3
rmdir $LOCK
npx -y pnpm@12.11.2 content:build
npx -y pnpm@12.11.2 content:check
make doctor
```

Do not run `make puzzles`; the lead runs it. Expect `content:check` to ask for notes on engine follow-ups in the
Tennison lines, such as 5.Qh5 and 7.Nxf7 in `reti-tennison-bc4`.

## The design

Plan: the Queen's Gambit Declined set-up (...d5, ...Nf6, ...e6, ...Be7, castle, ...c5) wherever it fits. 2.e4 is the one
exception, and the text must say so plainly. Share of games after 1.Nf3 d5: 2.d4 40%, 2.g3 18%, 2.e4 11%, 2.c4 10%,
2.e3 6%, 2.Nc3 5%, 2.d3 4%, 2.b3 3%. 1.Nf3 is 2% of games at the band, and 1...d5 is 38% of replies.

| Variation     | Line                | Moves                                                                               |
| ------------- | ------------------- | ----------------------------------------------------------------------------------- |
| queens-gambit | `reti-d4`           | 1.Nf3 d5 2.d4 Nf6 (first line, holds the 1...d5 note; into `qgd-colle`)             |
| queens-gambit | `reti-c4`           | 2.c4 e6 3.cxd5 exd5 4.d4 Nf6 (into `flank-nf3`; 3...exd5 onward stays bare)         |
| queens-gambit | `reti-e3`           | 2.e3 Nf6 3.d4 e6 (into `qgd-colle`; 3...e6 stays bare)                              |
| queens-gambit | `reti-nc3`          | 2.Nc3 Nf6 3.d4 e6 4.Bg5 Be7 5.e3 O-O 6.Bd3 c5                                       |
| g3            | `reti-g3`           | 2.g3 Nf6 3.Bg2 e6 4.O-O Be7 5.d3 O-O 6.Nbd2 c5 7.e4 Nc6 8.Re1 b5 9.e5 Nd7           |
| tennison      | `reti-tennison`     | 2.e4 dxe4 3.Ng5 Bf5 4.Nc3 Nf6 5.Qe2 Nc6 6.Ngxe4 Nd4 7.Qd3 Qd7 8.f3 O-O-O            |
| tennison      | `reti-tennison-bc4` | `[Start "reti-tennison 3...Bf5"]` 4.Bc4 e6 5.d3 exd3 6.cxd3 Be7 7.Nf3 Nf6 8.O-O O-O |

Lines after the first use `[Start "reti-d4 1...d5"]`, except `reti-tennison-bc4`. `2.e4` is the position after 1.e4 d5
2.Nf3. Leave 1.Nf3 bare, because another opening may come to own that note.

Refutations:

- In `reti-tennison`, after 5...Nc6: `5...Qd4??` 6.Qb5+ Bd7 7.Qxb7 Qb6 8.Qxa8. Against 6...Nbd7 or 6...c6, White plays
  Qxf5. This is the main trap: 33% of the band play 5...Qd4, and White scores 74%. Qb5+ forks the king and the f5
  bishop, which is why 5.Qe2 scores 59%.
- In `reti-tennison`: `6.Qb5?` Qd7 7.Qxb7 Rb8 8.Qa6 h6. Note it honestly (see "Still to check").
- In `reti-tennison`: `7.Nxf6+?` gxf6 8.Qh5 Nxc2+ 9.Kd1 Bg6. White has to move the queen, then ...Nxa1. Played 63% of
  the time; White scores 21%. Also 7.Qd1 Nxe4 8.Nxe4 Bxe4 wins a piece, and 7.Qe3 Nxc2+ is a fork.
- In `reti-tennison-bc4`, after 4...e6, which uncovers the queen on g5: `5.Nc3?` Qxg5, `5.O-O?` Qxg5,
  `5.g4?` Qxg5 6.gxf5 Qg2 7.Rf1 exf5 (Black is two pawns up). 5.d3 is the good move because it guards g5 with the bishop.

Ideas: `centre-pawns`, `castle-early`, `f7-weakness`, `fork`, `discovered-attack`. No new ideas are needed.
Origin: Réti played the opening against Capablanca at New York 1924.

## Decisions and why

- 3...Bf5, not the most common 3...Nf6. The engine gives -1.11 against -0.41, so ...Nf6 is an inaccuracy. Also 3...Nf6
  4.d3 exd3 5.Bxd3 h6?? 6.Nxf7 Kxf7 7.Bg6+ Kxg6 8.Qxd8 wins the queen: 34% of the band play 5...h6, and White scores 82%.
  Mention it in the 3...Bf5 note. 3...Bf5 holds White to 48%, against 53% after 3...Nf6.
- 2...dxe4 against 2.e4, not the set-up: -1.17 against about +0.14 for 2...e6.
- 2...e6 against 2.c4, to match `flank-black`, where 1.c4 e6 2.Nf3 d5 is the same position. It is level (+0.23). 2...d4
  is the engine's first choice (-0.04), and 2...dxc4 is the most common reply.
- 2...Nf6 against 2.d4, to match `qgd-colle`. 3.d4 e6 after 2.e3 Nf6 is also `qgd-colle`.
- 4...Be7 in `reti-g3`: 4...c5 is a little better (+0.16 against +0.31), but ...Be7 keeps the plan.
- 6...Be7 in `reti-tennison-bc4`, rather than the equal 6...Nc6, because it hits the knight and repeats the set-up.
- `reti-tennison-bc4` won the seventh line over 2.d3 and 2.b3. They are below `coverage.minShare`, and a slip after 4.Bc4
  costs a piece.
- 4.d3 in the Tennison cannot be a `?`. It costs under an inaccuracy (0.09 against the 0.1 needed), so it stays a gap.

## Gaps

- 2.d3 (4%) and 2.b3 (3%): the same set-up. Say so in the intro; 2...Nf6 is level against both.
- After 2.c4 e6: 3.d4, 3.e3, 3.g3, 3.b3, together about 54% of games after 2...e6.
- After 2.e3 Nf6: 3.c4 (20%), 3.b3, 3.Be2.
- After 2.Nc3 Nf6 3.d4 e6: 4.Bf4 (22%) and 4.e3 (20%).
- 2.g3: 3.d4, 3.d3, 4.d3, 4.d4, 5.d4 (21%) and 5.c4.
- Tennison: 3.Ne5 (15% of 3rd moves, Black stays a pawn up), 3.Ng1 (7%), 4.d3 (20%, 4...exd3 5.Bxd3 Bxd3), 4.g4, 4.Qe2
  (7%, ...Nc6), 5.Bc4 (28%, ...e6), 5.d3 (13%), 6.Bxd3 and 5.Qh5 in the 4.Bc4 line.

## Still to check

- The last engine batch was stopped early, and only positions a and b finished. They support 8.Qxa8 Bc6 9.Bb5 Bxb5
  10.Nxb5 Qxb5 11.a4 Qxg5 12.Qxb8+ Kd7 13.O-O at +5.8, so the final note should follow that line rather than just say
  "White is a rook up". The band's usual 7...Bc6 (86%) was not reached: 8.Bb5 is 64% there, White scores 94%.
- Not engine-checked: 7.Nxf6+ gxf6 8.Qh5 Nxc2+ 9.Kd1 Bg6. Also the note for 6.Qb5? Qd7 7.Qxb7 Rb8 8.Qa6 h6: the engine
  says -5.7 and shows 9.Bb5 Rxb5 10.Nxb5 hxg5, and I have not proved why 9.Nh3 fails. Rerun positions d to f of
  `q5.sh`. The script takes the lock itself and only removes it at the end, so if you stop it, check whether it holds the
  lock and remove the lock in the same command.
- `reti-c4` relies on 1.Nf3 d5 2.c4 e6 and 1.c4 e6 2.Nf3 d5 having the same position key. The en passant square may
  differ. The build will show it.

## Files

- `/Users/nialltwomey/workspace/knightschool/.scratch/handoff/reti/`: `ex1-5.out` (explorer), `en1-5.out` (engine),
  `q5.sh`, `explorer-cache.json`. Git-ignored.
- `/private/tmp/claude-501/-Users-nialltwomey-workspace-knightschool/733ab806-206f-41e7-9501-9f1907ca2c11/scratchpad/reti/`:
  the same files plus the helpers (`engine.mts`, `explore.mts`, `gaps.mts`, `precheck.mts`, `replies.mts`) and `q1.sh` to
  `q4.sh`. The helpers can be recopied from `.claude/skills/add-content/templates/`.
- `/Users/nialltwomey/workspace/knightschool/.scratch/handoff/london/analyse-one.mts`: the analysis filtered to one
  opening.
