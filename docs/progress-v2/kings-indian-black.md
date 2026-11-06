# King's Indian Defence for Black (`kings-indian-black`): progress

## Status

Stopped early at the user's request, 2026-11-06. **Written and building, but not engine-checked.** Nothing is committed.
The opening appears on the site as it stands if the working tree is built, so do not ship it until the analysis and
`content:check` have passed.

- `content:build` passes (14 openings). `make doctor` is clean.
- `make popularity` is done for this opening: all 209 tree positions have counts.
- `pnpm analyse` never started for this opening. Only 26 of the 209 positions are at depth 18 (reached by other
  openings). `content:check` has not been judged for this opening: it stops at "219 position(s) lack analysis".

## What is done

- `content/openings/kings-indian-black.yaml`: complete. Setup, about, 7 variations, 4 questions, step titles and texts.
- `content/lines/d4/kings-indian/`: 15 lines, 30 steps, 104 learner moves. No sources: built from the explorer and the
  engine only.
- `content/ideas.yaml`: added `fianchetto` and `pawn-storm`. `content/tracks.yaml`: added to `black-d4`.

| Variation     | Lines                                                               |
| ------------- | ------------------------------------------------------------------- |
| `classical`   | `kid-classical` (7.d5), `kid-classical-castle` (7.O-O)              |
| `swaps-on-e5` | `kid-classical-dxe5`, `kid-classical-bd3`, `kid-classical-bd3-dxe5` |
| `big-centre`  | `kid-four-pawns`, `kid-samisch`                                     |
| `london`      | `kid-london`, `kid-london-be2`                                      |
| `knight-c3`   | `kid-jobava`, `kid-pirc`                                            |
| `quiet`       | `kid-colle`, `kid-london-nf3` (link), `kid-quiet`                   |
| `trompowsky`  | `kid-trompowsky`                                                    |

The authored refutations: 10.Be3? in `kid-classical`; 9...Nc6? and 9...h6? in `kid-classical-dxe5`; 9.Nxf7? in
`kid-classical-bd3-dxe5`; 6.e5? and 11.Bxc4? in `kid-four-pawns`; 9.Bg3?, 10.Bg3? and 10.Nxe5? in `kid-london`; 4.Nb5?,
5.e5? and 6...O-O? in `kid-jobava`; 3...Bg7? in `kid-pirc`; 7.O-O? and 7.e5? in `kid-trompowsky`.

## What is left, in order

Run from the repo root. Take the engine lock as the add-content skill says.

1. Analyse, in chunks, repeating until it prints `analyse: left 0`. About 40 minutes at depth 18 in all:

   ```
   until mkdir /private/tmp/claude-501/ks-engine.lock 2>/dev/null; do sleep 15; done
   ONLY=kings-indian-black REPLIES=0.03 MINUTES=14 node --import tsx .scratch/handoff/kings-indian/analyse-one.mts
   rmdir /private/tmp/claude-501/ks-engine.lock
   ```

2. `npx -y pnpm@12.11.2 content:build`, then `npx -y pnpm@12.11.2 content:check`, and judge the `kid-` items. Fix what it
   flags. Expect work here, because no check has run yet:
   - each `?` must cost at least an inaccuracy on the engine;
   - each learner move must be better than an inaccuracy. The ones to look at first are 3...Bg7 in `kid-jobava` (+0.53
     against +0.12 for 3...d5), 9...Nd7 in `kid-classical-castle`, 8...Ne7 and 7...Nc6;
   - engine follow-ups that win nothing need an authored refutation with a note. Likely candidates: 8.Nxe5 in the 7.dxe5
     line after 6.Be2, 9.exd5 and 8.e5 in `kid-four-pawns`.
3. Re-check the wording of each claim of advantage against the depth 18 figures. Every number in the notes came from the
   explorer (reliable) or from depth 16 engine runs (`en*.out`). The checks on notes were by reading, not by replaying:
   prove the sequences in the refutation notes, especially 9...h6? 12.O-O-O in `kid-classical-dxe5`, the "more than
   three pawns" for 7.e5? in `kid-trompowsky`, and 7...Bxe5 ending 5.e5? in `kid-jobava` (only about -0.4 after
   8.Qxd8+).
4. `make doctor`, then `make check`. The lead runs `make puzzles`.
5. Decide on the gaps below, keeping to the 15-line limit in the brief.

## Decisions and why

- **...c5 in the Four Pawns and the Sämisch, not ...e5.** Sämisch 6...c5: White 52%, engine +0.34. 6...e5: White 55%,
  +0.84. Four Pawns 6...c5 is Black's best-scoring move there (White 50%) and the engine's first choice.
- **7...a5 against 7.d5:** White 42%, against 46% after 7...Nbd7, and it leads to a single plan with a knight on c5.
- **...Nbd7, ...Re8, ...e5 against the London with Bd3.** White scores about 35%, because ...e4 forks d3 and f3. Keeping
  ...c5 for the Be2 and h3 set-up: there 8...e5 after 7...Re8 8.Nc3 loses a pawn (+1.09).
- **5...c6 and ...b5, not castling, against Bf4, Nc3, e4, Qd2.** White 57% against 61%, and 6.O-O-O b5 is about level
  (+0.17) where 6...O-O is +1.16. This is the one place the set-up changes. The note offers 3...d5 (+0.12, White 51%)
  as the quiet way out, in words only, to keep one answer per position.
- **4.Nb5, 5.e5 and 6.e5 as refutations, not lines**, to stay inside the line limit.
- **...d5 in the Trompowsky**, because with the two bishops Black wants the game open, and 7.O-O and 7.e5 both go wrong.

## Gaps

Share of 1.d4 Nf6 games, from `cover.mts`. Games still in the tree at White's move: by move 5 13%, by move 8 2%, by move
10 1%. Low, as expected for a set-up opening with this many move orders, and the set-up itself is what carries over.

- **2.e3: 8.8%, the biggest gap.** The `kid-colle` note says 2.e3 g6 3.Nf3 transposes, but no line plays it. 2.e3 g6 3.Bd3 Bg7
  4.f4 (Stonewall style) is also unanswered.
- Move orders left out on purpose: 3.Nf3 after 2.c4 (4.4%), 2.Bf4 g6 3.Nf3 (4.3%), 2.Nf3 g6 3.c4 (2.4%), 2.Nf3 g6 3.Nc3
  (2.2%), 5.e4 after 4.Nf3 O-O (2.6%).
- Other: 4.Bg5 (2.5%), 2.Nc3 g6 3.Bf4 (2.2%), 3.e3 after 2.c4 (2.1%), 4.e3 (1.8%), 2.Nf3 g6 3.Bg5 (1.6%), 4.Bf4 (1.5%),
  4.e4 d6 5.Bd3 (1.1%), 5.Bg5 (1.0%).
- The Fianchetto with g3, 4.Qd2 and 6.Bh6 after Bf4 and Nc3, 8.Qc2 in `kid-london`, 9.b4 and 9.Bg5 in
  `kid-classical-castle`, 5.Bc4, 5.Bg5, 5.e5 and 5.Be3 in the Pirc, 4.e3 in the Trompowsky.
- White's rarer second moves: 2.d5 (1.3%), 2.c3 (1.2%), 2.f3 (1.1%), 2.e4 (0.7%).

## Scratch files that matter

Copied to `/Users/nialltwomey/workspace/knightschool/.scratch/handoff/kings-indian/` (git-ignored):

- `analyse-one.mts`: the filtered analysis used in step 1. `pipe.sh`: the loop that ran it; its paths point at the old
  session scratchpad, so edit them before reuse.
- `steps.mts`, `status.mts`, `cover.mts`: the opening's steps, how much is analysed, the coverage above.
- `x1.out` to `x10.out`: explorer output. `en1.out` to `en6.out`: depth 16 engine runs. `vars.sh`: the move prefixes they
  use. `explorer-cache.json`: the cache.
- `engine.mts`, `explore.mts`, `gaps.mts`, `precheck.mts`, `replies.mts`: the skill's helpers.
