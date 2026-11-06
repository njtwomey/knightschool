# Other Replies to 1.e4 (`rare-replies-white`): progress

## Status

Stopped early at the coordinator's request. The opening is written, listed and builds, but the analysis is unfinished, so
it is not yet "done" by the shared brief. Nothing is committed.

## Done

- `content/openings/rare-replies-white.yaml`, on track `first-e4` (`content/tracks.yaml`, reformatted by Prettier).
- 12 lines in `content/lines/e4/other-replies/`, 6 variations, 20 steps, 5 questions:
  - pirc: `other-pirc`, `other-pirc-nc6`, `other-pirc-c6`, `other-philidor`
  - modern: `other-modern` (short link into the Pirc), `other-modern-e6`
  - owen: `other-owen`, `other-owen-g6`
  - nimzowitsch: `other-nimzowitsch` (short link into the Italian), `other-nimzowitsch-d5`
  - alekhine: `other-alekhine`
  - odd-moves: `other-st-george`
- `make popularity` has been run for the opening (407 positions).
- Analysis at depth 18: two full chunks and part of a third. The last chunk began with 364 of 740 positions to search, and
  about 100 more were saved before it was stopped, so roughly 250 are left. The tree's own positions are searched first
  and were done before the first `content:check`; what remains is mostly the band's replies. Two refutations added late
  (`10...Kxf7` in `other-pirc`, `5...Bb4+` in `other-owen`) were queued in those chunks, but I did not confirm them.
- `content:build` passes. `content:doctor` names nothing from this opening. `content:check` was only run on partial
  analysis, see below. `make check` has not been run.

## Left, in order

Run from the repo root. Take the lock as the skill says; do not start while `pgrep -x stockfish` finds one.

1. Finish the analysis, in chunks, repeated until it prints `analyse: left 0`:

   ```
   S=/private/tmp/claude-501/-Users-nialltwomey-workspace-knightschool/733ab806-206f-41e7-9501-9f1907ca2c11/scratchpad/rare
   until mkdir /private/tmp/claude-501/ks-engine.lock 2>/dev/null; do sleep 15; done
   ONLY=rare-replies-white REPLIES=0.03 MINUTES=14 node --import tsx $S/analyse-one.mts
   rmdir /private/tmp/claude-501/ks-engine.lock
   ```

   If the scratchpad has gone, `.scratch/handoff/london/analyse-one.mts` is the pattern, or run `npx -y pnpm@12.11.2 analyse`
   (every opening, resumable). `$S/pipe.sh skip-pop` runs the chunks in a loop.

2. `npx -y pnpm@12.11.2 content:build`, then `npx -y pnpm@12.11.2 content:check | grep rare-replies`.
3. Write an authored refutation with a note for each follow-up it names. On partial analysis those were `3...f6` in
   `other-philidor`, `3...Nf6` in `other-modern`, and `6...c6` in `other-modern-e6`. More may appear. Also confirm that
   `3...f5?` in `other-owen` costs enough for its `?`: it is close to the line (a drop of about 0.10). If it does not, the
   check will say so.
4. Check that no learner move is flagged, `make doctor`, then `make check`. The lead runs `make puzzles`.

## Decisions and why

- One plan: e4, d4, Nf3, Nc3, a bishop, castle. v1's 150 Attack against the Pirc is dropped for 5.Be2 and castling, as asked,
  and the engine agrees (5.Be2 0.47, 5.Bd3 0.27).
- After castling in the Pirc, pawns hit knights: 7.e5 against ...Nbd7 (9.e6 is the one move to remember; 9.Bf4 scores 41%),
  7.d5 against ...Nc6.
- `3...c6 4.Nf3 Qa5`: 5.Bd3, because 5.Be2 loses e4 to the pin on c3. Written as a refutation.
- Modern, 3.Nc3 over 3.Nf3 (56% against 52%). Against ...e6 and ...Ne7, 6.Bg5: 6.O-O and 6.Be3 both grade too low (6.h4 is
  far ahead of 6.O-O, and 6.Be3 allows ...d5 and a level game). `8.e5?` is a refutation: band 44%, engine about -0.9.
- Owen, 3.Bd3 over 3.Nc3 (engine and score). It shares 5.Qe2, 5...Be7 and 6.e5 with `french-2b6`, so those stay bare there
  and its notes stand. After 5...Be7, 6.e5 is the only move that does not grade as an inaccuracy, and it leads to 8.Be4 and 11.b4.
- Nimzowitsch, 2.Nf3 over 2.d4, though the engine likes 2.d4 a little more: 47% then play ...e5, the Italian. 6.d5 is 2.9 for
  White, and 6...Ne5? (44%) falls to 7.Nxe5 Bxd1 8.Bb5+, a knight up after the best defence. 9.Bb5+ replaces 9.Bg3, which
  grades a mistake.
- Alekhine, 2.e5 and 4.Nf3. The notes say plainly that White scores under 50% in much of the line.

## Gaps

The Map shows 1...e5, 1...c5, 1...d5, 1...e6 and 1...c6 as gaps; that is expected, other openings cover them. Coverage of
what this opening reaches at move 2: 24% at move 5, 4% at move 8, 0% at move 10 (it counts the Nimzowitsch only to 3.Bc4,
where the Italian takes over; figures from before the last two refutations, which do not change them). Replies above
the 5% share with no line:

- 1...d6 2.d4: g6 (12%, a move order), e6 (10%), c6 (7%); 3.Nc3 Nbd7 (7%)
- 1...g6 2.d4: d6 (5%); 2...Bg7 3.Nc3: b6 (9%), Nf6 (7%), c6 (6%); 3...d6 4.Nf3 Bg4 (14%)
- 1...b6 2.d4 Bb7 3.Bd3: Nf6 (16%), d6 (6%)
- 1...Nc6 2.Nf3: Nf6 (11%), d6 (10%), e6 (7%); after 2...d5, every queen move but ...Qd8 (`4...Qh5` scores White 44%);
  after 5...Qd8 line, 5...Nf6 (30%)
- 1...Nf6: 3...e6 (20%), 4...dxe5 (28%), and 5...Nc6 (37%) after 4...Bg4 5.Be2
- 1...f5, 1...a5 and the other odd moves have no line; the odd-moves intro says to play d4.

## Scratch files

All under `/private/tmp/claude-501/-Users-nialltwomey-workspace-knightschool/733ab806-206f-41e7-9501-9f1907ca2c11/scratchpad/rare/`:

- `analyse-one.mts`, `pipe.sh`: the analysis.
- `analyse.log`, `check.txt`: progress, and the last `content:check`.
- `dry.mts`, `cover.mts`, `gaps.mts`: dry build, coverage, gaps.
- `b1` to `b6` (`.txt`, `.pop`, `.eng`): the band's counts and the engine on every candidate move.
