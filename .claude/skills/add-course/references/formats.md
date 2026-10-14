# Formats: files, course.yaml, PGN, tags

Code is the authority: `packages/core/src/{schema/content,tree,tags,training,openings}.ts`, `scripts/content-lib.ts`. The full
format reference is `content/README.md`; read it first. This page is the working summary.

```
content/curriculum.yaml  openings.yaml  motifs.yaml        shared files (report entries, do not edit when told so)
content/white/<...>/<course-id>/   or   content/black/<...>/<course-id>/    the folder decides the side
  course.yaml            required
  lines/<file>.pgn       the repertoire: one PGN per opponent choice, ( ... ) variations inside are fine
  traps/<file>.pgn       optional: a trick inside the course: for-us (we spring it) or against-us (we must not fall for it)
  quizzes.yaml           optional
```

- The course id is its folder name (unique across the tree). `<file>` names are ids too: kebab-case, stable, never renamed.
- Every `.pgn` must be listed in `course.yaml` (`lines:` or `traps:`) and every listed one must exist; files are unique across
  both folders. The `lines:` order is the teaching order and the first is the main line.
- Every line's main path passes through the course's `trigger` position.

## course.yaml

| Key       | Meaning                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `name`    | The course name; quote it if it has a colon                                                             |
| `eco`     | Optional ECO code of the opening                                                                        |
| `side`    | The learner's side: must match `white/` or `black/`                                                     |
| `opening` | An id in `content/openings.yaml`: who plays that opening decides "play it" versus "play against it"     |
| `tier`    | 1 study first, 2 next, 3 alternatives and rare replies                                                  |
| `trigger` | SAN to the position the course starts from: `1. e4 e5 2. Nf3`                                           |
| `summary` | Two plain sentences (a `>-` block)                                                                      |
| `plans`   | A few bullets a 1200 can act on when the opponent leaves the book                                       |
| `motifs`  | Ids from `content/motifs.yaml`                                                                          |
| `lines`   | Each `{file, opponent, kind: main\|sideline\|rare\|gambit, alternative?}`; `opponent` is what they play |
| `traps`   | Each `{file, opponent, kind: for-us\|against-us}`                                                       |

Which lines earn cards (`training.ts`): `main` and `gambit` always; `sideline` unless the explorer says too few games reach it;
`rare` only when the learner turns on "include rare lines"; `alternative` never. `against-us` traps give cards for the move that
avoids the trap (the repertoire move in `lines/`; the trap file shows our mistake marked `?`). `for-us` traps give no move cards:
give each one a quiz.

## PGN

- Header block, then moves in SAN with `{ comments }`. A comment before the first move is dropped. The final `*` is optional.
- NAGs: `?`, `??`, `?!`, `!`, `!!`, `!?` after the move (or `$2` etc.). `?`, `??`, `?!` mark a move as a mistake.
- Variations `( ... )` come immediately after the move they replace (before the reply to it), never after the reply. Use them for short sidelines; a sideline needing its own tags gets its own file.
- Shapes go inside a comment: `[%cal Gc4f7,Gh5f7]` arrows, `[%csl Ge4]` circles; colours `G R Y B`. Squares are not
  validated; check them by eye. Drawn in Browse, Play and Review.

## The repertoire rule and cards

At every position where it is the learner's turn there must be **exactly one move, across all files and variations, that is
not marked `?`/`??`/`?!`**. That move is the card. More than one is a build error; none (all marked) is fine and gives no card.
Only the learner's moves are cards; the opponent's moves never are.

- Positions reachable only through a marked mistake **by the learner's own side** (a trap they fall into) are shown but never
  cards and are not conflict-checked. A mistake marked on the **opponent's** move does not stop cards: the punishing reply is a card.
- Introduction order: main line of the first line, then other lines, then trap-only positions; each by distance from
  the start. After every 4th move card a quiz is slotted in.
- **Every-branch drill** (`/play/<course>/all/branches`): the learner plays the repertoire move; the computer plays a random
  known reply, the main-line one three times as often. So: list every reply the opponent is likely to try (lines or short
  variations), put the most common reply in the first line, and give each sideline reply its own repertoire answer, or the
  drill ends there.

## Tags (PGN header)

Required: `Opening`, `Variation`, `ECO`, `Character`, `Risk`, `EarlyMate`, `Tricks`. Optional: `Event`, `Refutes`, `RefutedBy`, `Themes`, `Kind` (optional: the line or trap kind, cross-checked with course.yaml). Lowercase values, comma lists without spaces. Unknown tags or values fail the build.

| Tag         | Values and how to choose                                                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Variation` | The standard name (check `.cache/openings.tsv`, the Lichess openings list, if present). Shown to the learner.                                                                                                                                 |
| `ECO`       | ECO of the variant's last named position. Not checked for correctness.                                                                                                                                                                        |
| `Character` | 1 to 3 of `solid` (few weaknesses), `positional` (plan or structure), `sharp` (open, accurate play), `gambit` (material offered), `tactical` (about a concrete tactic; usual for refutations)                                                 |
| `Risk`      | `low`: a slip costs a tempo. `medium`: a slip loses a pawn or piece, or early queen, hanging pieces, pins on our pieces. `high`: one slip loses the game fast. When unsure pick the higher.                                                   |
| `EarlyMate` | `none` unless a concrete mating pattern exists in the first 12 moves: `white`, `black`, or `both`. Means "who can mate if the line goes wrong".                                                                                               |
| `Tricks`    | `none` (alone) or motifs that actually occur in the file: `trap fork pin skewer discovered-attack hanging-piece back-rank queen-trap smothered-mate early-queen pawn-grab castling-lost mate-threat`. A trap file has `trap` plus its tactic. |
| `Refutes`   | Optional. Legal SAN from move 1 ending on the opponent's mistake: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4`. Shown to the learner verbatim.                                                                                                            |
| `Themes`    | kebab-case plans, 1 to 3: `d4-break`, `f7-pressure`, `good-bishop`. Reuse: `grep -rh '^\[Themes' content`.                                                                                                                                    |

A trap file (`traps/`) is one specific trick: a mistake we must avoid (`against-us`) or an opponent mistake we punish (`for-us`, which must end clearly better for us). A strong line against a merely dubious move (`2.Bc4?!`) is a regular `lines/` file (mark the dubious move `?!`).
