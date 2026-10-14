> Status: external feedback and proposal, received 14 October 2026. Not adopted as written; see the notes at the end of
> `docs/PLAN.md` once they exist, and the conversation that followed. Kept here verbatim so it can be argued with.

# Knight School: opening curriculum for players under 1600

Written 14 October 2026. Target: chess.com rapid and blitz players rated roughly 800 to 1600, which corresponds to about 1000 to 1800 on Lichess. Frequencies in this document are approximate recollections of the Lichess explorer at those bands, rounded coarsely; the `content:build` explorer step (plan, Phase 2) replaces them with counts. No move sequence here has been engine-checked; the authoring rule in section 10 makes that a build-time gate rather than something to trust from this file.

## 1. The proposal in one paragraph

Organise content by *who is to move and what the opponent has done*, not by opening name. A learner needs exactly four things: one White repertoire, one defence to 1.e4, one defence to 1.d4, and one setup against everything else. Each of those is a **course**: a tree rooted at a trigger position, whose branches are the opponent's choices and whose leaves are our replies. Gambits, traps and sidelines are branches inside the course where they arise, tagged by kind, never top-level items. That removes the `motifs/` versus `openings/` split (the Rousseau Gambit is a branch of the White Italian course; the Fried Liver is the Two Knights branch of the same course), removes the side ambiguity (the current `caro-kann` and `caro-kann-panov` directories are for opposite colours), and halves the content: eleven courses instead of thirty-one directories, with the advanced Sicilian, Semi-Slav and King's Indian material parked rather than deleted.

## 2. What is wrong with the current tree

Specific problems, each of which the new layout fixes:

| Problem | Where it shows | Consequence |
| --- | --- | --- |
| Side is not recorded | `caro-kann/lines` are White's choices (so a Black course); `caro-kann-panov/lines` are Black's choices (so a White course); both sit side by side | The trainer cannot know which moves to drill and which to play for the opponent |
| Sub-variations promoted to openings | `caro-kann-advance`, `caro-kann-panov`, `caro-kann-two-knights`, `queens-gambit-accepted`, `queens-gambit-declined`, `slav-defence`, `semi-slav` alongside `caro-kann` and `queens-gambit` | The same positions are described twice; transposition keys collide |
| "Motif" means two things | `motifs/` holds three concrete lines (Fried Liver, Rousseau, Traxler); the plan's data model uses motif for tactical patterns (fork, pin) | Two vocabularies for one word |
| Both colours of one opening as separate openings | `kings-gambit` and `kings-gambit-defence` | Works, but only because someone remembered; nothing enforces it |
| Material above the target level | `sicilian-najdorf` with Sozin and English Attack, `semi-slav` with Anti-Moscow and Meran, `ruy-lopez` with Open and Berlin, `kings-indian-defence` with Sämisch | Hundreds of cards a 1200 will never meet; drowns the day-one queue |
| `refutations/` is the wrong word | The files are traps and punishments inside a line, not refutations of the opening | Minor, but it will confuse an author |
| Gambits sit next to repertoires | `elephant-gambit`, `englund-gambit` listed like `italian-game` | A learner is never going to *play* the Englund; they need to *meet* it, from inside the course where it occurs |

## 3. Proposed structure

### 3.1 Directory layout

```
content/
├── README.md
├── curriculum.yaml            # ordered course list: tier, prerequisites, estimated cards (replaces families.yaml)
├── motifs.yaml                # the tag vocabulary of section 9
├── white/
│   ├── e4/
│   │   ├── vs-e5-italian/     # 1.e4 e5 2.Nf3 (Nc6 3.Bc4 and every other second move)
│   │   ├── vs-c5-alapin/      # 1.e4 c5 2.c3
│   │   ├── vs-e6-french/      # 1.e4 e6 2.d4 d5 3.e5
│   │   ├── vs-c6-caro-kann/   # 1.e4 c6 2.d4 d5 3.e5
│   │   ├── vs-d5-scandinavian/
│   │   └── vs-other/          # Pirc, Modern, Alekhine, Nimzowitsch, Owen, junk
│   └── d4/
│       └── london/            # alternative White repertoire, tier 3
├── black/
│   ├── vs-e4/
│   │   ├── e5-open-games/     # primary: 1...e5 against every White second and third move
│   │   └── caro-kann/         # alternative, tier 3
│   ├── vs-d4/
│   │   ├── qgd/               # 1.d4 d5 2.c4 e6
│   │   └── vs-systems/        # London, Jobava, Colle, Stonewall, pseudo-Trompowsky, Torre, Veresov, BDG
│   └── vs-other/
│       └── flank-and-irregular/   # 1.c4 1.Nf3 1.f4 1.b3 1.g3 1.b4 1.Nc3 1.g4 and the rest
├── _parked/                   # material kept for later, not built
└── analysis/
```

Each course directory keeps the shape you already have, with two renames:

```
vs-e5-italian/
├── course.yaml        # was opening.yaml
├── lines/             # one PGN per opponent choice; variations inside are fine
├── traps/             # was refutations/
└── quizzes.yaml
```

### 3.2 course.yaml

```yaml
id: white/e4/vs-e5-italian
name: Italian Game
side: white
tier: 1
trigger: "1. e4 e5 2. Nf3" # the build derives the EPD; everything in lines/ must start here
summary: >
  Develop the bishop to c4, pointing at f7, castle, and build the centre slowly with c3 and d3.
plans:
  - Castle by move six; Re1, Nbd2, Bb3, h3, then Nf1-g3 is the whole middlegame plan.
  - Never play Nc3 before Black has committed the f8 bishop; the fork trick punishes it.
motifs: [f7-weakness, fork-trick, legal-mate, hanging-piece]
lines: # order = learning order; cards are generated in this order
  - file: giuoco-pianissimo.pgn
    opponent: "3...Bc5"
    kind: main
  - file: two-knights-fried-liver.pgn
    opponent: "3...Nf6"
    kind: main
  - file: vs-elephant-gambit.pgn
    opponent: "2...d5"
    kind: gambit
traps:
  - file: blackburne-shilling.pgn
    opponent: "3...Nd4"
    kind: against-us # what we must not fall for
  - file: legal-mate.pgn
    opponent: "3...d6 4.Nc3 Bg4"
    kind: for-us # what we spring
```

`kind` on a line is one of `main`, `sideline`, `rare`, `gambit` (the opponent's gambit we must meet). `kind` on a trap is `for-us` or `against-us`. The same values go in a `[Kind ""]` PGN header so each file is self-describing; the build cross-checks the two. The card generator uses `kind`: `main` and `gambit` lines always produce cards; `sideline` and `rare` produce cards only when the explorer popularity passes the 5 % threshold from the plan; `against-us` traps produce cards for the avoiding move; `for-us` traps produce quizzes rather than cards (you cannot drill something the opponent has to do first).

### 3.3 Migration of what exists

| Current directory | New home | Note |
| --- | --- | --- |
| `motifs/fried-liver-attack` | `white/e4/vs-e5-italian/lines/two-knights-fried-liver.pgn` | The three lines become variations in one file |
| `motifs/traxler-counterattack` | `white/e4/vs-e5-italian/lines/two-knights-traxler.pgn` (5.Bxf7+ only); the `nxf7-*` files to `_parked/` | We recommend the safe 5.Bxf7+; 5.Nxf7 is a different course in itself |
| `motifs/rousseau-gambit` | `white/e4/vs-e5-italian/lines/vs-rousseau-gambit.pgn` with kind `gambit`; its `refutations/` to `traps/` as `against-us` | |
| `openings/italian-game` | `white/e4/vs-e5-italian` | Core; keep |
| `openings/elephant-gambit` | `white/e4/vs-e5-italian/lines/vs-elephant-gambit.pgn`, refutations to `traps/` | |
| `openings/scandinavian` | `white/e4/vs-d5-scandinavian` | Keep the White-side files; check each file's side |
| `openings/sicilian-alapin` | `white/e4/vs-c5-alapin` | Core; keep |
| `openings/englund-gambit` | `white/d4/london/lines/vs-englund-gambit.pgn`, refutations to `traps/` | Only matters if the learner takes the London course |
| `openings/london-system` | `white/d4/london` | Tier 3 alternative repertoire |
| `openings/queens-gambit-declined` | `black/vs-d4/qgd` | Core; keep; `elephant-trap.pgn` becomes a `for-us` trap |
| `openings/kings-gambit-defence` | `black/vs-e4/e5-open-games/lines/vs-kings-gambit.pgn` | Keep Fischer as the alternative; add 2...Bc5 as the main |
| `openings/caro-kann`, `caro-kann-advance` | `black/vs-e4/caro-kann` | Merge; `short-system` and `early-c5` become variations of `advance.pgn` |
| `openings/caro-kann-two-knights` | `black/vs-e4/caro-kann/lines/vs-two-knights.pgn` | Only the Black-side content |
| `openings/jobava-london` | `_parked/` as White; new `black/vs-d4/vs-systems/lines/vs-jobava.pgn` | One White d4 system is enough |
| `openings/caro-kann-panov`, `french-defence`, `kings-gambit`, `kings-indian-defence`, `queens-gambit`, `queens-gambit-accepted`, `ruy-lopez`, `scotch-game`, `semi-slav`, `sicilian-english-attack`, `sicilian-najdorf`, `slav-defence` | `_parked/` | Above level, or the wrong side for the chosen repertoire; see section 11 |
| `families.yaml` | `curriculum.yaml` | Same job, now with tier and prerequisites |

## 4. How the courses were chosen

Four rules, applied in order:

1. **Cover what arrives, not what is famous.** At this level 1.e4 is played in about six games out of ten and 1.d4 in about one in four; after 1.e4, the replies 1...e5 and 1...c5 account for well over half of games, with 1...e6, 1...c6 and 1...d5 sharing most of the rest. A course earns its place by the share of games in which the learner reaches its trigger position, so the Italian and the Open Games as Black come first and the Najdorf does not appear at all.
2. **One answer per branch.** Where theory offers three good moves, the course teaches one. The learner can change it later; the point is to reach move ten with a plan every time.
3. **Prefer systems with a plan over lines with a theory.** Alapin over the Open Sicilian, the Advance over the Classical French, the London over the Queen's Gambit as the second White repertoire. Each of these can be described in four plan bullets a beginner can follow when the opponent leaves the book, which at this level happens by move five.
4. **Every gambit and trap the learner will meet more than once a month is in; everything else is out.** The Englund, Stafford, Blackburne Shilling, Elephant, Rousseau, Wayward Queen, Scholar's mate, Fried Liver, Danish, Smith-Morra (met as Black only if the learner plays the Sicilian, so excluded), Blackmar-Diemer and Jobava's Nb5 jump are in. The Latvian, Fritz, Ulvestad and From's Gambit get one line each or a sentence.

Depth rule: lines run to move 10 to 12 for main lines and to the point where the trick is resolved for traps. A sub-1600 game is out of book by move 8 in most cases; what matters is the plan the position hands over, so each `main` line ends with a comment naming the plan.

## 5. Frequency picture (approximate, to be replaced by explorer counts)

| Branch | Share of games reaching the parent | Covered by |
| --- | --- | --- |
| 1.e4 | about 60 % | W1 to W6 (as White), B1 or B-alt (as Black) |
| 1.d4 | about 25 % | W-alt (as White), B3 and B4 (as Black) |
| 1.c4, 1.Nf3, 1.f4, 1.b3, 1.g3, others | about 15 % together | B5 |
| after 1.e4: ...e5 | about 40 % | W1, B1 |
| after 1.e4: ...c5 | about 20 % | W2 |
| after 1.e4: ...e6 | about 10 % | W3 |
| after 1.e4: ...c6 | about 8 % | W4, B-alt |
| after 1.e4: ...d5 | about 7 % | W5 |
| after 1.e4: ...d6, ...g6, ...Nf6, ...Nc6, ...b6, other | about 15 % together | W6 |
| after 1.e4 e5 2.Nf3: ...Nc6 | about 70 % | W1 main lines |
| after 1.e4 e5 2.Nf3: ...Nf6 (Petrov, Stafford), ...d6 (Philidor), ...d5, ...f5, ...f6, ...Qe7 | about 30 % together | W1 sidelines and gambits |
| after 1.e4 e5 2.Nf3 Nc6: 3.Bc4 | about 50 % | B1 Italian branch |
| after 1.e4 e5 2.Nf3 Nc6: 3.Bb5 | about 20 % | B1 Ruy Lopez branch |
| after 1.e4 e5 2.Nf3 Nc6: 3.d4, 3.Nc3, 3.c3 | about 25 % together | B1 Scotch, Four Knights, Ponziani branches |
| after 1.e4 e5: 2.Bc4, 2.Nc3, 2.f4, 2.Qh5, 2.d4 | about 25 % together | B1 second-move branches |
| after 1.d4 d5: 2.c4 | about 45 % | B3 |
| after 1.d4 d5: 2.Nf3 and 2.Bf4 (London family), 2.e3, 2.Nc3, 2.Bg5, 2.e4 | about 50 % together | B4 |

## 6. White courses

### W1. vs 1...e5: the Italian Game (tier 1)

Trigger: `1. e4 e5 2. Nf3`. The course starts one move before the Italian because Black's second-move alternatives (Petrov, Stafford, Philidor, Elephant, Latvian, Damiano) are where the traps live, and they are a third of games.

Plan in four bullets: Bc4 pointing at f7; castle by move six; c3 and d3, never d4 early; Re1, Nbd2, Bb3, h3, Nf1 to g3 is the middlegame. Do not play Nc3 while Black can play ...Nxe4 (the fork trick).

| Opponent | Our line | Remember |
| --- | --- | --- |
| 2...Nc6 3.Bc4 Bc5 (Giuoco Piano) | 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1 a6 8.Bb3 Ba7 9.h3 h6 10.Nbd2 | The slow system. Black's ...Ng4 ideas are met by Re1 and h3; a2-a4 stops ...b5 |
| 2...Nc6 3.Bc4 Nf6 (Two Knights) | 4.Ng5 d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Be2 h6 9.Nf3 e4 10.Ne5 Bd6 11.d4 | Black's correct line; we are a pawn up and must survive the initiative. The quiet 4.d3 is a one-file alternative for learners who dislike this |
| 3...Nf6 4.Ng5 d5 5.exd5 Nxd5?! (Fried Liver proper) | 6.Nxf7 Kxf7 7.Qf3+ Ke6 8.Nc3 Ncb4 9.O-O (or 9.a3) | The king walk. Three lines you already have: ...Ke6 main, ...Ke8, ...Na5/Bb5 |
| 3...Nf6 4.Ng5 Bc5 (Traxler) | 5.Bxf7+ Ke7 6.Bb3 Rf8 7.O-O d6 8.Nc3 | The safe choice. 5.Nxf7 is parked |
| 3...Nf6 4.Ng5 d5 5.exd5 Nd4 (Fritz) or 5...b5 (Ulvestad) | 6.c3 (vs Nd4) or 6.Bf1 (vs b5) | One file, kind `rare` |
| 3...Be7, 3...d6, 3...h6 | 4.d4 (vs Be7); c3, d3 setup (vs d6, h6) | Kind `sideline` |
| 2...Nf6 (Petrov) | 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Be7 7.O-O Nc6 8.c4 | Against us: 3.Nxe5 Nxe4? 4.Qe2 wins a pawn; that is a trap *for* us, 4.Qe2 Nf6 5.Nc6+ |
| 2...Nf6 3.Nxe5 Nc6?! (Stafford Gambit) | 4.Nxc6 dxc6 5.d3 Bc5 6.Be2 h5 7.O-O Ng4 8.Bxg4 | Very common at this level. Against us: 5.Nc3? Bc5 and 5.e5? Ne4 with ...Bc5 and ...Qh4 ideas; never touch h3 while a knight can come to g4 |
| 2...d6 (Philidor) | 3.d4 exd4 4.Nxd4 Nf6 5.Nc3 Be7 6.Be2 O-O 7.O-O | For us: 3.d4 Bg4?! 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 and f7 falls or Nf6 7.Qb3 |
| 2...d5 (Elephant Gambit) | 3.exd5 e4 4.Qe2 Nf6 5.d3 (or 3...Bd6 4.d4 e4 5.Ne5) | You have three lines and three traps; keep them, kind `gambit` |
| 2...f5 (Latvian) | 3.Nxe5 Qf6 4.d4 d6 5.Nc4 fxe4 6.Nc3 | Kind `rare` |
| 2...f6?! (Damiano) | 3.Nxe5 fxe5 4.Qh5+ Ke7 5.Qxe5+ Kf7 6.Bc4+ | For us; the first "sacrifice on f7" a learner should know |
| 2...Qe7, 2...Bd6, other | Develop: Bc4, Nc3, d4 | One file, kind `rare` |

Traps against us: 3...Nd4 (Blackburne Shilling) 4.Nxe5?? Qg5 and we lose the knight or get mated; play 4.Nxd4 exd4 5.c3. 3...f5 (Rousseau) 4.Nxe5? Qh4 and 4.exf5? e4; play 4.d3. 4.Nc3 Nxe4 (fork trick) whenever Nc3 goes in before Black's bishop is committed. 3...d6 4.Nc3 Bg4 5.h3 Bh5 6.Nxe5! Bxd1?? 7.Bxf7+ Ke7 8.Nd5# (Légal's mate) is for us and is the single best lesson that a queen is not always worth taking.

Motifs: f7-weakness, fork-trick, legal-mate, king-hunt, knight-on-g5, pin-f6, hanging-piece, queen-chase.

Estimated cards: 90 to 120. Estimated quizzes: 12.

### W2. vs 1...c5: the Alapin (tier 2)

Trigger: `1. e4 c5 2. c3`. Why: it dodges every named Sicilian, the plan (d4, keep the centre, e5 wedge or isolated d-pawn play) is the same whatever Black does, and Sicilian players under 1600 rarely know their side of it.

| Opponent | Our line | Remember |
| --- | --- | --- |
| 2...Nf6 | 3.e5 Nd5 4.d4 cxd4 5.Nf3 Nc6 6.Bc4 Nb6 7.Bb3 d5 8.exd6 Qxd6 9.O-O Be6 10.Na3 | The main line; the knight hops to d5, we gain time with Bc4 |
| 2...d5 | 3.exd5 Qxd5 4.d4 Nf6 5.Nf3 e6 6.Bd3 Be7 7.O-O O-O 8.Qe2 | Unlike the Scandinavian, Nc3 does not come with tempo (c3 is occupied); develop and play on the e-file |
| 2...d5 3.exd5 Qxd5 4.d4 Nc6 | 5.Nf3 Bg4 6.Be2 cxd4 7.cxd4 e6 8.Nc3 Qa5 9.O-O | Black's most active try; the pin on f3 is answered by Be2 |
| 2...e6 | 3.d4 d5 4.exd5 exd5 5.Nf3 Nc6 6.Bb5 Bd6 7.O-O Nge7 8.dxc5 Bxc5 9.Nbd2 | Isolated queen's pawn for Black; blockade on d4 |
| 2...Nc6, 2...d6, 2...g6, 2...e5, 2...b6 | 3.d4 in each case; vs ...g6 4.cxd4 d5 5.e5; vs ...e5 3.Nf3 Nc6 4.Bc4 | One file with four variations |

Traps: few at this depth. Against us: 2...Nf6 3.e5 Nd5 4.d4 cxd4 5.Qxd4?! Nc6 wins time; and 4.Nf3?! allowing ...Nc6 and ...d6 undermining e5 before d4 is in. For us: in the 2...d5 line, a Black queen on d5 facing Nc3 later, after the c-pawn has moved, is a tempo gain to drill. Author the rest from the explorer's top three Black errors at the band.

Motifs: pawn-wedge-e5, isolated-queens-pawn, tempo-on-queen, pin-f3.

Estimated cards: 50 to 70.

### W3. vs 1...e6: French, Advance Variation (tier 2)

Trigger: `1. e4 e6 2. d4 d5 3. e5`. Why: it is what beginners want to play anyway (push the pawn), the pawn chain teaches a whole positional idea, and it avoids the ...dxe4 lines where Black's bad bishop problem disappears. The Exchange (3.exd5) is the fallback for a learner who wants nothing to remember.

| Opponent | Our line | Remember |
| --- | --- | --- |
| 3...c5 4.c3 Nc6 5.Nf3 Qb6 | 6.a3 c4 (or 6...Nh6 7.b4) 7.Nbd2 Na5 8.Be2 Bd7 9.O-O | The base of the chain (d4) is attacked by ...c5, ...Nc6, ...Qb6; defend it, do not trade it |
| 3...c5 4.c3 Nc6 5.Nf3 Bd7 | 6.Be2 Nge7 7.O-O Ng6 8.g3 Be7 9.h4 | |
| 3...c5 4.c3 Qb6 | 5.Nf3 Nc6 transposes; 5...Bd7 6.Be2 | |
| 3...Ne7, 3...b6, 3...Bd7, 3...f6?! | c3, Nf3, Bd3, O-O; vs ...f6 4.Bd3 and exf6 when it gains | One file |
| 2...c5 (Franco-Sicilian) | 3.d5 exd5 4.exd5 d6 5.Nc3 | Or 3.Nf3 → Alapin-like |

Traps against us: 5.Nf3 Qb6 6.Bd3? cxd4 7.cxd4 Nxd4 8.Nxd4 Qxd4 and the b2 and d4 pawns go (that is the Milner-Barry Gambit when played on purpose; do not play it by accident). Also Qb6 hitting b2 after ...cxd4: count defenders of b2 and d4 every move. For us: the Greek gift Bxh7+ once Black has castled and moved the f6 knight away.

Motifs: pawn-chain, attack-the-base, bad-bishop, greek-gift, counting-b2-d4.

Estimated cards: 40 to 60.

### W4. vs 1...c6: Caro-Kann, Advance with Nf3 and Be2 (tier 2)

Trigger: `1. e4 c6 2. d4 d5 3. e5`. Why: the most common choice at this level and the one with a clear plan; the "Short System" setup (Nf3, Be2, O-O, c3, Nbd2, Be3) needs almost no memorisation. The Exchange (3.exd5 cxd5 4.Bd3) is the fallback.

| Opponent | Our line | Remember |
| --- | --- | --- |
| 3...Bf5 4.Nf3 e6 5.Be2 c5 | 6.Be3 Nd7 7.O-O Ne7 8.c4 (or 8.c3) | Black's bishop got out, so the plan is space and the c5 square, not attacking it |
| 3...Bf5 4.Nf3 e6 5.Be2 Nd7 | 6.O-O Ne7 7.Nbd2 h6 8.Nb3 | |
| 3...Bf5 4.Nf3 e6 5.Be2 Ne7 | 6.O-O h6 7.Nbd2 Nd7 8.Nb3 | |
| 3...c5 | 4.dxc5 Nc6 5.Nf3 Bg4 6.c3 e6 7.Be3 | Hold the extra pawn a while; give it back for development |
| 3...Bf5 4.Nf3 e6 5.Be2 c5 6.O-O Nc6 | 7.c3 cxd4 8.cxd4 Nge7 9.Nc3 | |

Traps: against us, 4.Bd3? Bxd3 5.Qxd3 trades Black's problem piece for ours; never offer the light-squared bishop trade for free in this structure. For us: ...Qb6 hitting b2 and d4 as in the French, same counting lesson. Author the rest from explorer data.

Motifs: pawn-chain, good-bishop-bad-bishop, space, counting-b2-d4.

Estimated cards: 35 to 50.

### W5. vs 1...d5: Scandinavian (tier 2)

Trigger: `1. e4 d5 2. exd5`.

| Opponent | Our line | Remember |
| --- | --- | --- |
| 2...Qxd5 3.Nc3 Qa5 | 4.d4 Nf6 5.Nf3 Bf5 (or Bg4, c6) 6.Bd2 e6 7.Bc4 c6 8.Qe2 Bb4 9.O-O-O | Nc3 with tempo; Bd2 behind the knight so a later Nd5 or b4 hits the queen |
| 2...Qxd5 3.Nc3 Qd6 | 4.d4 Nf6 5.Nf3 a6 6.Bd3 (or 5...c6 6.Ne5) | |
| 2...Qxd5 3.Nc3 Qd8 | 4.d4 Nf6 5.Nf3 Bg4 6.h3 Bxf3 7.Qxf3 c6 8.Bd3 | |
| 2...Nf6 | 3.d4 Nxd5 4.c4 Nb6 5.Nf3 Bg4 6.Be2 e6 7.Nc3 | Or 3.Bb5+ Bd7 4.Bc4 for a learner who likes it simpler |
| 2...c6?! (Scandinavian gambit) | 3.dxc6 Nxc6 4.Nf3 e5 5.Bb5 | Kind `rare` |

Traps for us: the bishop on g6 after ...Bg4, h3, ...Bh5, g4, ...Bg6 can be trapped by Ne5 and h4-h5 (engine-check the exact order at authoring); the queen on a5 can be hit by Nd5 or b4 once Bd2 is in. Against us: 3.Nc3 Qa5 4.d4 Nf6 5.Nf3 Bg4 6.Be2? Bxf3 and the d4 pawn later; and chasing the queen with b4?? when it just takes.

Motifs: tempo-on-queen, queen-trap, bishop-trap-g6, early-queen.

Estimated cards: 40 to 55.

### W6. vs everything else after 1.e4 (tier 3)

Trigger: `1. e4` with the rare replies. One file per reply, each kind `sideline`, each to move 8 with a plan.

| Opponent | Our line |
| --- | --- |
| 1...d6 or 1...g6 (Pirc, Modern) | 2.d4 Nf6 3.Nc3 g6 4.Be3 Bg7 5.Qd2 (150 Attack): Bh6, h4-h5, castle long when safe |
| 1...Nf6 (Alekhine) | 2.e5 Nd5 3.d4 d6 4.Nf3 Bg4 5.Be2 e6 6.O-O |
| 1...Nc6 (Nimzowitsch) | 2.Nf3 d5 3.exd5 Qxd5 4.Nc3 Qa5 5.d4 (or 2...e5 transposes to W1) |
| 1...b6 (Owen) | 2.d4 Bb7 3.Bd3 e6 4.Nf3 c5 5.c3 |
| 1...a6, 1...h6, 1...g5, 1...f5?! | 2.d4 and develop; vs 1...f5 2.exf5 and Qh5+ ideas |

Estimated cards: 30.

### W-alt. 1.d4 London System (tier 3, alternative White repertoire)

Trigger: `1. d4`. Keep this for the learner who prefers one setup against everything. The London avoids the Queen's Gambit Accepted, the Slav, the Albin and all the Indian defences, which is why it replaces the `queens-gambit*` directories.

| Opponent | Our line | Remember |
| --- | --- | --- |
| 1...d5 2.Bf4 Nf6 3.e3 e6 4.Nd2 c5 5.c3 Nc6 6.Ngf3 Bd6 7.Bg3 O-O 8.Bd3 | Then Ne5, f4 if allowed, Qf3 and the kingside | The standard shape; the bishop retreats to g3, not h2, so ...Nh5 is not a worry |
| 1...d5 2.Bf4 c5 3.e3 Qb6 | 4.Nc3! (hits d5, b2 is poisoned: 4...Qxb2 5.Nb5 with Nc7+) or the quiet 4.Qc1 | The London's one real test; drill both |
| 1...Nf6 2.Bf4 g6 3.e3 Bg7 4.Nf3 O-O 5.Be2 d6 6.h3 Nbd7 7.O-O | Then c4 or a4, Nc3, Qc2 | Against fianchettos, the h-pawn plan is slower; just develop |
| 1...e5?! (Englund) | 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Nc3 Bb4 7.Rb1 Qa3 8.Rb3 | You have this; keep all three traps, two of them against us (6.Bc3?? Bb4 and the Qd2 lines) |
| 1...d5 2.Bf4 Bf5 | 3.e3 e6 4.c4 (or 4.Bd3) | Mirror London; break the symmetry with c4 |
| 1...c5 | 2.d5 (or 2.e3 and c3) | One file |
| 1...f5 (Dutch) | 2.Bf4 Nf6 3.e3 e6 4.Nf3 | One file, kind `rare` |

Motifs: counting-b2, nb5-c7-fork, bishop-retreat-g3, e5-outpost, h-pawn-attack.

Estimated cards: 60 to 80.

## 7. Black courses

### B1. vs 1.e4: 1...e5, the Open Games (tier 1, primary)

Trigger: `1. e4 e5`. Why over the Caro-Kann: it mirrors what the learner plays as White, so the positions and traps are learned once from both sides; it is where the tactics a beginner must know live; and it is the most common reply, so the opponent's choices are the ones they will see most. The course is wide rather than deep: one line for each of White's second and third moves.

Our rule of thumb: after 2.Nf3 play 2...Nc6; after 3.Bc4 play 3...Bc5 (so the Fried Liver never happens); against gambits take the centre pawn, give the material back for development, castle.

| White plays | Our line | Remember |
| --- | --- | --- |
| 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 (Pianissimo) | 5...d6 6.O-O O-O 7.Re1 a6 8.Bb3 Ba7 9.h3 h6 10.Nbd2 Be6 | Same positions as W1 from the other side |
| 3.Bc4 Bc5 4.c3 Nf6 5.d4 | 5...exd4 6.cxd4 Bb4+ 7.Bd2 Bxd2+ 8.Nbxd2 d5 9.exd5 Nxd5 10.Qb3 Nce7 | The one sharp line to know; after 7.Nc3 Nxe4 is playable but 7.Bd2 is what you will see |
| 3.Bc4 Bc5 4.b4 (Evans) | 4...Bxb4 5.c3 Be7 6.d4 Na5 7.Be2 exd4 | Take, retreat, hit the bishop. Kind `gambit` |
| 3.Bc4 Bc5 4.O-O, 4.d3, 4.Nc3 | ...Nf6 and ...d6 in each; vs 4.Nc3 the fork trick 4...Nf6 5.d3 is normal, but if 5.O-O then 5...Nxe4 works | |
| 3.Bc4 Nf6 4.Ng5 (if the learner prefers the Two Knights) | 4...d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Be2 h6 9.Nf3 e4 10.Ne5 Bd6 | Optional file. Never 5...Nxd5 |
| 3.Bb5 (Ruy Lopez) | 3...a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3 Na5 10.Bc2 c5 | The setup, not the theory. vs 4.Bxc6 dxc6 5.O-O Bg4 (or f6); vs 5.d3 d6 |
| 3.d4 exd4 4.Nxd4 (Scotch) | 4...Bc5 5.Be3 Qf6 6.c3 Nge7 7.Bc4 O-O 8.O-O d6 | ...Bc5 hits the knight; ...Qf6 keeps the pressure |
| 3.d4 exd4 4.Bc4 (Scotch Gambit) | 4...Bc5 5.c3 Nf6 6.cxd4 Bb4+ 7.Bd2 Bxd2+ 8.Nbxd2 d5 | Transposes to the Italian d4 line above; one line to learn, two openings covered |
| 3.d4 exd4 4.c3 (Göring) and 2.d4 exd4 3.c3 (Danish) | 4...d5! 5.exd5 Qxd5 6.cxd4 Bg4 7.Be2 Bb4+ 8.Nc3 Bxf3 9.Bxf3 Qc4 | Decline by hitting back in the centre; do not take c3 |
| 2.d4 exd4 3.Qxd4 (Centre Game) | 3...Nc6 4.Qe3 Nf6 5.Nc3 Bb4 6.Bd2 O-O 7.O-O-O Re8 | Tempo on the queen, develop, castle, ...d5 |
| 3.Nc3 Nf6 (Four Knights) | vs 4.Bb5 Bb4 5.O-O O-O 6.d3 d6; vs 4.d4 exd4 5.Nxd4 Bb4 6.Nxc6 bxc6 7.Bd3 d5; vs 4.Bc4 Nxe4! 5.Nxe4 d5 | The fork trick for us against 4.Bc4 |
| 3.c3 (Ponziani) | 3...Nf6 4.d4 Nxe4 5.d5 Ne7 6.Nxe5 Ng6 | Kind `rare` |
| 2.Nc3 (Vienna) | 2...Nf6 3.Bc4 Nc6 4.d3 Na5 (or Bb4); 3.f4 d5! 4.fxe5 Nxe4; 3.Nf3 → Four Knights | Against us: 3.f4 exf4? 4.e5 and the knight has to go home; against us: 3.Bc4 Nxe4 4.Qh5 leads into the Frankenstein-Dracula, avoid |
| 2.Bc4 (Bishop's Opening) | 2...Nc6 3.Nf3 Bc5 → Italian; 3.d3 Nf6 4.Nc3 Na5; 3.Nc3 Nf6 4.d3 Na5 | Funnel into the Giuoco |
| 2.f4 (King's Gambit) | 2...Bc5 3.Nf3 d6 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb6; alternative 2...exf4 3.Nf3 d6 (Fischer, your existing files) | For us: 3.fxe5?? Qh4+ 4.g3 Qxe4+ 5.Qe2 Qxh1. Kind `gambit` |
| 2.Qh5 (Wayward Queen) and 2.Bc4 Nc6 3.Qh5 / 3.Qf3 (Scholar's) | 2...Nc6 3.Bc4 g6 4.Qf3 Nf6 5.Qb3 Nd4! and the bishop on f7 is lost after 6.Bxf7+ Ke7 7.Qc4 b5; vs 5.Ne2 Bg7; vs 3.Qf3 Nf6 | Against us: 2...Nf6?? 3.Qxe5+. Engine-check the 5.Qb3 line at authoring |
| 2.Ne2, 2.d3, 2.c3, 2.Bb5?!, 2.Nf3 Nc6 3.Be2 | ...Nf6, ...d5 or ...Bc5 and castle | One file, kind `rare` |

Traps for us: fork trick (above), Noah's Ark in the Ruy Lopez (3...a6 4.Ba4 d6 5.d4 b5 6.Bb3 Nxd4 7.Nxd4 exd4 8.Qxd4?? c5 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4 and the bishop is lost), King's Gambit 3.fxe5?? Qh4+, Danish 4...d5. Traps against us: allowing the Fried Liver (3...Nf6 4.Ng5 d5 5.exd5 Nxd5?), Scholar's mate, Légal's pattern (do not pin with ...Bg4 against Nc3 and Bc4 and then take a queen), 3...Nd4 (Blackburne Shilling) and 2...Nf6 3.Nxe5 Nc6 (Stafford) are not to be played by us, and both get a sentence saying why.

Motifs: f7-weakness, fork-trick, noahs-ark, tempo-on-queen, centre-counter-d5, legal-mate, scholar-mate, give-back-material, castle-early.

Estimated cards: 110 to 140. Quizzes: 15.

### B3. vs 1.d4 d5 2.c4: Queen's Gambit Declined (tier 1)

Trigger: `1. d4 d5 2. c4 e6`. Why over the Slav: the setup (...d5, ...e6, ...Nf6, ...Be7, ...O-O, ...c6, ...Nbd7, then ...dxc4 and ...c5 or ...b6) is the same against every White move order, and the only thing to remember is the Elephant Trap. The Slav's ...Bf5 idea is nicer for the bishop but brings the Qb3 and a4 annoyances; park it.

| White plays | Our line | Remember |
| --- | --- | --- |
| 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 (Orthodox) | 7.Rc1 c6 8.Bd3 dxc4 9.Bxc4 Nd5 10.Bxe7 Qxe7 11.O-O Nxc3 12.Rxc3 e5 | Capablanca's freeing idea; ...dxc4 only once the bishop has moved to d3 |
| 3.Nc3 Nf6 4.cxd5 exd5 (Exchange) | 5.Bg5 c6 6.e3 Be7 7.Bd3 O-O 8.Qc2 Nbd7 9.Nf3 Re8 10.O-O Nf8 | The Carlsbad shape; ...Nf8, ...Ne4, ...g6, ...Bf5 is the plan; White's minority attack b4-b5 is what to expect |
| 3.Nf3 Nf6 4.Bg5 / 4.Nc3 / 4.e3 | ...Be7 and ...O-O in each, then the Orthodox plan | |
| 3.cxd5 exd5 | 4.Nc3 Nf6 → Exchange | |
| 3.Nc3 Nf6 4.Bf4 (QGD with Bf4) | 4...Be7 5.e3 O-O 6.Nf3 c5 7.dxc5 Bxc5 | ...c5 early is the point against Bf4 |
| 3.g3 (Catalan) | 3...Nf6 4.Bg2 Be7 5.Nf3 O-O 6.O-O dxc4 7.Qc2 a6 8.Qxc4 b5 9.Qc2 Bb7 | Take c4 and hold it with ...a6 and ...b5 |
| 2.Nf3 Nf6 3.c4 e6 | Transposes | |

Traps for us: Elephant Trap, 4.Bg5 Nbd7 5.cxd5 exd5 6.Nxd5?? Nxd5 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8 (you have it). Cambridge Springs motif: ...Nbd7, ...c6, ...Qa5 pins the c3 knight against the king and hits g5 through it; engine-check which White replies drop a piece. Against us: ...dxc4 too early (before Bd3) lets White recapture with tempo; and ...Nbd7 before ...Be7 with the Bg5 pin can allow Nxd5 tricks the other way (verify at authoring).

Motifs: pin-f6, freeing-break-c5-e5, minority-attack, isolated-queens-pawn, elephant-trap.

Estimated cards: 60 to 80.

### B4. vs 1.d4 d5 without 2.c4: the systems (tier 1 for the London file, tier 2 for the rest)

Trigger: `1. d4 d5` and White's second move is not c4. Half of all 1.d4 games at this level go here, and the London alone is a quarter of them, so the London file is tier 1.

| White plays | Our line | Remember |
| --- | --- | --- |
| 2.Bf4 or 2.Nf3 then Bf4 (London) | 2...c5 3.e3 Nc6 4.c3 Qb6 5.Qb3 c4 6.Qxb6 axb6 (or 5.Qc2 Bf5 6.Qxf5?? Qxb2) 7.Nbd2 Bf5; vs 4.Nd2 cxd4 5.exd4 Qb6 | ...c5 and ...Qb6 attack b2 before White is castled; trade queens if offered and the a-file is ours. Also drill ...Nh5 against the bishop when Bg3 is not available |
| London with Nc3 (2.Nc3 and Bf4, Jobava) | 2.Nc3 Nf6 3.Bf4 a6! 4.e3 e6 5.Nf3 c5 6.Be2 Nc6 7.O-O Bd6 | ...a6 stops Nb5-c7; against us: 3...c5 4.e3 Nc6?! 5.Nb5 and c7 falls |
| 2.Bg5 (pseudo-Trompowsky) | 2...h6 3.Bh4 c6 4.e3 Qb6 5.Qc1 Bf5 6.c4 e6 | Hit b2 while the bishop is away |
| 2.e3 then Bd3, f4 (Stonewall) | 2...Nf6 3.Bd3 c5 4.c3 Nc6 5.f4 Bg4 6.Nf3 e6 7.Nbd2 Bd6 8.O-O O-O | ...Bg4 before e-pawn moves; the e4 square and the bad bishop on c1 are the story |
| 2.Nf3 Nf6 3.e3 e6 4.Bd3 (Colle) | 4...c5 5.c3 Nc6 6.Nbd2 Bd6 7.O-O O-O 8.dxc5 Bxc5 9.e4 Qc7 | Or ...Bd6 ...Qc7 ...e5; vs b3 (Colle-Zukertort) ...b6 ...Bb7 |
| 2.Nf3 Nf6 3.Bg5 (Torre vs d5) | 3...Ne4 4.Bf4 c5 5.e3 Qb6 | |
| 2.Nc3 Nf6 3.Bg5 (Veresov) | 3...Nbd7 4.f3 c6 5.e4 dxe4 6.fxe4 e5 | One file, kind `rare` |
| 2.e4 (Blackmar-Diemer) | 2...dxe4 3.Nc3 Nf6 4.f3 e3! 5.Bxe3 e6 6.Bd3 Be7 7.Nge2 O-O | Give the pawn straight back; White's attack never starts. Kind `gambit` |
| 2.g3, 2.c3, 2.Nf3 with c3 | ...Nf6, ...e6, ...Be7, ...O-O, ...c5, ...Nc6 | One file |

Motifs: counting-b2, poisoned-pawn, nb5-c7-fork, bishop-harassment-nh5, decline-the-gambit, bad-bishop.

Estimated cards: 70 to 90.

### B5. vs flank and irregular first moves (tier 2)

Trigger: anything but 1.e4 and 1.d4. The whole course is one idea: play ...Nf6, ...e6, ...d5, ...Be7, ...O-O, ...c5, ...Nc6, and it transposes to the QGD setup against everything that does not involve an early e4. Exceptions get one file each.

| White plays | Our line | Remember |
| --- | --- | --- |
| 1.c4 (English) | 1...Nf6 2.Nc3 e6 3.Nf3 d5 4.d4 → QGD; 3.e4 d5! 4.e5 d4; 3.g3 d5 4.cxd5 exd5 5.Bg2 Be7 | ...e6 before ...d5 so that 1...e6 2.e4 (a French) never happens |
| 1.Nf3 (Réti) | 1...d5 2.c4 e6 3.d4 → QGD; 2.g3 Nf6 3.Bg2 e6 4.O-O Be7 5.d3 O-O 6.Nbd2 c5 7.e4 Nc6 (KIA); 2.b3 Nf6 3.Bb2 e6 | |
| 1.f4 (Bird) | 1...d5 2.Nf3 Nf6 3.e3 Bg4 4.Be2 e6 5.O-O Bd6 6.d3 Nbd7 7.Nbd2 c6 | Not 1...e5 (From's Gambit, theory) |
| 1.b3 (Nimzo-Larsen) | 1...d5 2.Bb2 Nf6 3.e3 e6 4.Nf3 Be7 5.c4 O-O 6.Be2 c5 | Or 1...e5 2.Bb2 Nc6 3.e3 d5 4.Bb5 Bd6 for the learner who wants the centre |
| 1.g3 | 1...d5 2.Bg2 Nf6 3.Nf3 e6 → KIA line above | |
| 1.b4 (Polish) | 1...e5 2.Bb2 Bxb4 3.Bxe5 Nf6 4.c4 O-O 5.Nf3 Re8 6.e3 d5 | Trade a flank pawn for a centre pawn |
| 1.Nc3 (Van Geet) | 1...d5 2.e4 d4 3.Nce2 e5 4.Ng3 Nf6; 2.d4 Nf6 → Jobava or Veresov file | |
| 1.g4 (Grob) | 1...d5 2.Bg2 c6 3.h3 e5 4.d4 e4 | ...c6 covers b7 and d5 so the long diagonal has nothing to bite; against us: 2...Bxg4 3.c4 dxc4?? 4.Bxb7 |
| 1.d3, 1.e3, 1.a3, 1.h3, 1.Nh3, 1.a4, 1.h4 | The setup | One file |

Estimated cards: 50 to 60.

### B-alt. vs 1.e4: Caro-Kann (tier 3, alternative to B1)

Trigger: `1. e4 c6 2. d4 d5`. Keep because you have the material and because some learners want solidity over tactics. Order by frequency at the band: Advance first, Exchange second, then Classical, Two Knights, Panov, Fantasy, King's Indian Attack and the 2.Bc4 and 2.Nf3 oddities.

| White plays | Our line | Remember |
| --- | --- | --- |
| 3.e5 Bf5 4.Nf3 e6 5.Be2 (Advance, Short) | 5...Ne7 6.O-O h6 7.Nbd2 Nd7 8.Nb3 g5!? or 5...c5 6.Be3 Qb6 7.Nc3 Nc6 | Attack the base with ...c5; the bishop is already out, which is the whole reason to play the Caro |
| 3.e5 Bf5 4.h4 | 4...h5 5.c4 e6 6.Nc3 Ne7 | |
| 3.e5 Bf5 4.Nc3 e6 5.g4 | 5...Bg6 6.Nge2 c5 7.h4 h6 8.Be3 Nc6 | Longer than we like; learn to move 6 and the idea |
| 3.e5 Bf5 4.g4?! | 4...Bd7 (or 4...Be4 5.f3 Bg6 6.h4 h5) then ...c5, ...e6, ...Nc6 | Engine-check which retreat to recommend |
| 3.exd5 cxd5 4.Bd3 (Exchange) | 4...Nc6 5.c3 Qc7 6.Ne2 Bg4 7.O-O e6 8.f3 Bh5 (or 6...e5!?) | ...Qc7 stops Bf4; against us: 5...Nf6 6.Bf4 Bg4 7.Qb3 and b7 and d5 are both attacked |
| 3.Nc3 dxe4 4.Nxe4 Bf5 (Classical) | 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 9.Bd3 Bxd3 10.Qxd3 e6 | The one long line in the course; simpler alternative 4...Nf6 5.Nxf6+ exf6 |
| 3.Nc3 dxe4 4.Nxe4 Nd7 | Against us: 5.Qe2 Ngf6?? 6.Nd6# | Teach as a trap; we play 4...Bf5 anyway |
| 2.Nc3 d5 3.Nf3 (Two Knights) | 3...Bg4 4.h3 Bxf3 5.Qxf3 e6 6.d4 Nf6 (your `bishop-pin` and `quiet-nf6` files) | |
| 3.exd5 cxd5 4.c4 (Panov) | 4...Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5 8.Bd3 O-O | Isolated pawn for White; blockade d5 |
| 3.f3 (Fantasy) | 3...e6 4.Nc3 Bb4 5.Bd3 Ne7 (or 3...dxe4 4.fxe4 e5) | |
| 2.d3 (KIA) | 2...d5 3.Nd2 e5 4.Ngf3 Bd6 5.g3 Nf6 | |
| 2.Bc4?! d5 3.Bb3 dxe4 (Hillbilly) | 4.Qh5 g6 5.Qe5 Nf6 (your `early-bc4` file) | |
| 2.c4 d5 3.exd5 cxd5 4.cxd5 Nf6 | 5.Nc3 Nxd5 6.Nf3 Nc6 | |

Motifs: good-bishop-out, attack-the-base, smothered-mate-d6, isolated-queens-pawn, counting-b7-d5.

Estimated cards: 80 to 100.

## 8. Trap index

Every trap in one place, so an author can check coverage and the quiz generator can find them. Side is whose trap it is to spring.

| Trap | Side | Lives in | Pattern it teaches |
| --- | --- | --- | --- |
| Scholar's mate and Wayward Queen | White tries, Black defends | B1 | f7, early queen out, ...Nd4 counter |
| Fried Liver (Nxf7 after ...Nxd5) | White | W1, B1 (avoid) | f7, king hunt, why 5...Na5 |
| Traxler | Black tries, White sidesteps | W1 | f2 symmetry; 5.Bxf7+ |
| Légal's mate | White (and Black in reverse) | W1, B1 | Queen sacrifice; count the mating net before taking |
| Fork trick (...Nxe4 then ...d5) | Both | W1 (avoid), B1 (use) | Knight exchange that wins the centre |
| Blackburne Shilling (3...Nd4) | Black tries, White sidesteps | W1 | Greedy Nxe5 loses to ...Qg5 |
| Rousseau (3...f5) | Black tries, White sidesteps | W1 | 4.d3; the e4 pawn is not free |
| Stafford Gambit | Black tries, White sidesteps | W1 | 5.d3, the g4 square, never h3 |
| Damiano (2...f6) | White | W1 | Nxe5 and Qh5+ |
| Elephant Gambit | Black tries, White sidesteps | W1 | Take, Qe2 on the e-file |
| Petrov 3...Nxe4? 4.Qe2 | White | W1 | Pin on the e-file, Nc6+ discovery |
| Philidor 3...Bg4?! 4.dxe5 | White | W1 | Removing the defender of e5 |
| Noah's Ark | Black | B1 | Pawn chain traps a bishop |
| King's Gambit 3.fxe5?? Qh4+ | Black | B1 | The e1-h4 diagonal |
| Danish and Göring, ...d5 | Black | B1 | Return material for development |
| Vienna 3.f4 exf4? 4.e5 | White tries, Black avoids | B1 | Do not take when the knight has no retreat |
| Englund 6.Bc3?? Bb4 and Qc1# | Black tries, White sidesteps | W-alt | Back rank and the pinned bishop |
| London ...Qb6 and the b2 pawn | Black | B4, W-alt | Counting b2 |
| Jobava Nb5-c7 | White tries, Black prevents | B4 | The c7 fork square |
| Blackmar-Diemer, 4...e3 | Black | B4 | Decline a gambit by returning the pawn |
| Elephant Trap (QGD) | Black | B3 | The pinned knight is not a defender |
| Cambridge Springs ...Qa5 | Black | B3 | Pin through a knight to the king |
| Milner-Barry (French) | White tries, Black should know | W3 | b2 and d4 both hanging to ...Qb6 |
| Caro-Kann 5.Qe2 Ngf6?? 6.Nd6# | White | B-alt | Smothered mate from the opening |
| Exchange Caro 7.Qb3 | White tries, Black prevents | B-alt | Two hanging pawns, one queen |
| Scandinavian bishop trap on g6 | White | W5 | h4-h5 against a bishop with no squares |
| Grob 3.c4 dxc4?? 4.Bxb7 | White tries, Black avoids | B5 | The long diagonal |

Twenty-seven traps. If the learner knows all of them from both sides, they have most of the "free points" that decide games under 1600.

## 9. Motif vocabulary (motifs.yaml)

These are the tags for `Annotation.motifs` in the plan's data model. Two groups. Tactical motifs are what the MotifExplainer detects; structural motifs are author-only tags until something cleverer exists.

Tactical: `hanging-piece`, `fork`, `pin-absolute`, `pin-relative`, `skewer`, `discovered-attack`, `double-check`, `remove-the-defender`, `overloaded-piece`, `deflection`, `decoy`, `back-rank`, `smothered-mate`, `legal-mate`, `scholar-mate`, `greek-gift`, `f7-weakness` (and `f2-weakness`), `fork-trick`, `poisoned-pawn` (b2, g7), `queen-trap`, `bishop-trap`, `knight-on-the-rim`, `tempo-on-queen`, `zwischenzug`, `counting` (attackers versus defenders on one square), `x-ray`.

Structural, beginner level only: `centre-pawns`, `develop-first`, `castle-early`, `early-queen` (why not, and the Scandinavian exception), `pawn-chain`, `attack-the-base`, `bad-bishop`, `good-bishop-out`, `isolated-queens-pawn`, `open-file`, `outpost`, `fianchetto-diagonal`, `freeing-break`, `minority-attack`, `h-pawn-attack`, `space`, `give-back-material`, `decline-the-gambit`, `opposite-castling`.

Each entry in `motifs.yaml` is `id`, `name`, one plain sentence, and a list of the courses where it first appears, so the Glossary page in the app is generated and the quiz synonym table can map "it hangs the rook" to `hanging-piece`.

## 10. Authoring rules

1. **Every line is engine-checked before it ships.** The build runs the plan's `measureLine` at depth 18 over each PGN and fails if any of *our* moves loses more than 50 centipawns against the engine's first choice, or if a `for-us` trap's final position is not at least 150 centipawns in our favour. This is the safeguard against this document's unverified move orders.
2. **Every `main` line ends with a plan comment**, two sentences a 1200 can act on when the opponent leaves the book.
3. **Every trap has a `why` comment on the losing move**, written in the quiz vocabulary (motif id in square brackets), so the quiz generator can build the "why is this bad?" question from it.
4. **Depth:** main lines to move 10 to 12; sidelines to move 8; traps to the move that wins material or mates.
5. **Opponent choices in a course are ordered by explorer popularity at the band**, and that order is the card order. Anything under 5 % is kind `rare` and gets no cards until the learner opts in.
6. **One answer per branch.** Alternatives (4.d3 instead of 4.Ng5; Fischer instead of 2...Bc5) are separate files marked `alternative: true` and are off by default.
7. **Both-sides consistency.** Where a position is in both a White and a Black course (the Giuoco Pianissimo in W1 and B1), the build checks the two PGNs agree on the moves up to the point where they diverge, so the learner never meets a contradiction.

## 11. What to park and why

`_parked/` is not deleted content; it is content without a course. Each entry says what would bring it back.

| Parked | Why | Comes back when |
| --- | --- | --- |
| Sicilian Najdorf, English Attack, Sozin | Black's side of an Open Sicilian; three layers above the band | A Black Sicilian course is added for 1600+ |
| Semi-Slav (Meran, Moscow, Anti-Moscow) | Grandmaster theory | Never at this level; keep for a club tier |
| Slav | Sound, but a second answer to 2.c4 is one more than a beginner needs | If learners reject the QGD's cramped bishop |
| Queen's Gambit, QGA as White | Replaced by the London as the second White repertoire | If a learner outgrows systems |
| Ruy Lopez as White | More theory than the Italian for no more wins at this band | At 1600+, as the natural next White course |
| Scotch as White | A fine alternative; one White 1.e4 answer to 1...e5 is enough for now | As the first "alternative" file in W1 |
| King's Gambit as White | Fun; needs a lot of knowledge to survive 2...exf4 | Optional tier 3 file in W1 |
| King's Indian Defence | A pawn-storm opening that punishes beginners who play it | Never at this band |
| French as Black | We chose 1...e5 and the Caro-Kann | If a third 1.e4 defence is wanted |
| Caro-Kann Panov and Two Knights as White | We chose the Advance | If the Advance proves unpopular with learners |
| Jobava as White | One 1.d4 system is enough | If a learner wants an aggressive d4 option |
| Traxler 5.Nxf7 lines | A whole course of forced lines | For the learner who insists |

## 12. Learning path and sizes

| Order | Course | Tier | Cards (estimate) | Prerequisite |
| --- | --- | --- | --- | --- |
| 1 | W1 Italian | 1 | 90 to 120 | none |
| 2 | B1 Open Games | 1 | 110 to 140 | W1 (shares positions) |
| 3 | B3 QGD | 1 | 60 to 80 | none |
| 4 | B4 vs systems, London file only | 1 | 20 | none |
| 5 | W2 Alapin | 2 | 50 to 70 | W1 |
| 6 | W3 French Advance | 2 | 40 to 60 | W1 |
| 7 | W4 Caro-Kann Advance | 2 | 35 to 50 | W3 (same structure) |
| 8 | W5 Scandinavian | 2 | 40 to 55 | W1 |
| 9 | B4 vs systems, the rest | 2 | 50 to 70 | B3 |
| 10 | B5 flank and irregular | 2 | 50 to 60 | B3 |
| 11 | W6 rare replies | 3 | 30 | W1 |
| 12 | W-alt London | 3 | 60 to 80 | none |
| 13 | B-alt Caro-Kann | 3 | 80 to 100 | none |

Tier 1 is about 300 cards, which at ten new cards a day is a month of study before the learner has an answer to roughly 80 % of the first ten moves they will meet. All thirteen courses are about 800 cards; that is the whole product for the stated audience, and it is smaller than the current tree.

Open questions this document does not settle: whether 1...e5 or the Caro-Kann should be the default Black course (this recommends 1...e5 and keeps the Caro as the alternative); whether 4.Ng5 or 4.d3 is the default against the Two Knights (this recommends 4.Ng5 because the content exists and the lesson is worth it); and the exact rating band to bake into the explorer counts (1200 to 1800 Lichess proposed, which is roughly 1000 to 1600 chess.com).
