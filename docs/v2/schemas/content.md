# Content: the authored files

Everything a person writes. Plain text, reviewed in git, validated by the build. Four kinds of file and the config.

```
content/
  config.yaml                  how the site behaves (../config.md)
  ideas.yaml                   every idea
  tracks.yaml                  suggested orders of openings
  openings/<opening>.yaml      one opening for one side
  lines/<first move>/<opening>/<variation>/<line>.pgn  one line each, shared by any opening
```

Why lines are separate from openings (as in v1): a line can belong to several openings (the Two Knights is in the
Italian for White and in 1...e5 for Black), and its notes are written once.

## A line: `lines/e4/giuoco-piano-main.pgn`

Standard PGN, so any chess tool can open it. Few headers:

```
[For "white"]
[Kind "main"]
[Start "italian-core 3...Bc5"]

4. c3 { Prepares d4 to build a big centre. [%cal Gc3d4] } 4... Nf6 { Hits e4. }
5. d4 exd4 6. cxd4 Bb4+ ( 6... Bb6? { Gives up the centre without a fight. } 7. d5 ) 7. Bd2 *
```

| Header  | Required | Meaning                                                                                     |
| ------- | -------- | ------------------------------------------------------------------------------------------- |
| `For`   | yes      | the side the line is written for; `Kind` is from that side's point of view                  |
| `Kind`  | yes      | `main`, `sideline`, `rare`, `gambit`, `trap` (you spring it), `danger` (a trap against you) |
| `Start` | no       | where it branches: another line's id and the move after which it starts; none means move 1  |
| `Name`  | no       | a display name when the Lichess name of its last named position is not right                |

The file name is the line's id. Moves, comments, marks and refutations are in [annotations.md](annotations.md). The
name, ECO code and opening family come from Lichess's names for the positions, so they are not written. (v1's
`Character`, `Risk`, `EarlyMate`, `Tricks`, `Themes`, `Opponent`, `ECO`, `Variation` headers are dropped: each is
either worked out or moved to the opening.)

## An opening: `openings/italian-white.yaml`

```yaml
name: Italian Game
side: white
start: 1. e4 e5 2. Nf3 Nc6 3. Bc4 # where the opening begins (v1 `trigger`)
level: first # first, next, further (v1 `tier`)
style: [classical, trap-heavy]
summary: The bishop aims at f7 while White builds a centre with c3 and d4.
about:
  idea: ...
  risks: ...
  suits: ...
  origin: ... # optional
sources: # optional
  - { title: ..., url: ..., author: ... }
ideas: [f7-weakness, fork, centre-pawns]
variations:
  - id: giuoco-piano
    name: Giuoco Piano # optional: Lichess's name of where it starts is the default
    intro: Black copies White's set-up; White builds the centre.
    lines: [giuoco-piano-main, giuoco-piano-d3, fried-liver-trap]
    plans:
      - Play c3 and d4 before Black castles.
  - id: two-knights
    lines: [two-knights-main, two-knights-d4]
steps: # optional: only to name a step, write its text, or change the cut
  giuoco-piano-main:1:
    title: The quiet bishop
    text: The bishop on c4 looks at f7, ... {1. e4 e5 2. Nf3 Nc6 3. Bc4}
alternatives: [giuoco-piano-d3] # shown, never drilled (v1 `alternative: true`)
config: # optional: the few config keys an opening may override
  coverage.minShare: 0.03
```

- **Variations** list lines in teaching order; the order of variations is the order of the opening.
- **Steps** are cut automatically from the lines (about `teach.stepMoves` of your moves each). The `steps` map only adds
  a title and text, or splits and joins (`after`, `until` keys, as v1's `units:` did).
- **One answer per position** within an opening, as in v1: a second answer is an alternative.
- Quizzes in words (v1 `quizzes.yaml`) become optional `questions:` on a variation, same format as v1.

## Ideas: `ideas.yaml`

```yaml
- id: fork
  name: Fork
  kind: tactic # tactic, plan, structure, principle
  summary: One piece attacks two or more targets at once, and only one can be saved.
  themes: [fork] # Lichess puzzle themes that show it
- id: carlsbad
  name: Carlsbad structure
  kind: structure
  summary: ...
```

Seeded from v1's `motifs.yaml`. An idea's page lists what links to it; nothing else is written there.

## Tracks: `tracks.yaml`

```yaml
- id: first-e4
  name: A first repertoire with 1.e4
  openings: [italian-white, vs-sicilian-alapin, vs-french-advance, vs-caro-advance, vs-scandinavian]
```

Replaces v1's `curriculum.yaml` and `openings.yaml`. Onboarding suggests from tracks.

## Validated at build

Unknown keys and values, ids that do not exist, a line that does not reach its opening's start, two comments on one
move, two answers in one opening, an illegal move, a step override that no longer fits, an idea not in `ideas.yaml`. As
v1: a failed build leaves the last good built data in place.
