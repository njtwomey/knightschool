# Formats: layout, chapters, course.yaml, tags

Code is the authority: `packages/core/src/{theory-tree,tree,tags,training,openings}.ts`, `packages/core/src/schema/content.ts`,
`scripts/content-lib.ts`. The full format reference is `content/README.md`; read it first. This page is the working summary.

```
content/curriculum.yaml  openings.yaml  motifs.yaml   shared files: study order, opening groups, the idea glossary
content/tree/<first move>/<opening family>/<id>.pgn   the theory: one chapter (one line) per file, both sides
content/courses/<id>/course.yaml                      a course: side, trigger, introduction, plans, the lines it takes
content/courses/<id>/quizzes.yaml                     optional
```

- The folders under `tree/` are for people: first move (`e4`, `d4`, `other`), then the opening family
  (`evans-gambit`, `open-games`, `vienna-game`). The build reads every `.pgn` under `tree/` at any depth; only `[Start]`
  decides the shape. Put a new chapter beside its relatives.
- A line's id is its file name: kebab-case, unique across the whole tree (`all` is reserved), stable (it is in learner
  history and links). A course's id is its folder name.
- A chapter no course lists is allowed (`make doctor` reports it). A course lists any chapter it wants.

## Chapters

```pgn
[Event "Knight School"]
[Opening "Evans Gambit"]
[Variation "Italian Game: Evans Gambit, Morphy Attack"]
[ECO "C52"]
[Character "gambit,sharp"]
[Risk "medium"]
[EarlyMate "none"]
[Tricks "pawn-grab"]
[Themes "centre-fight,lead-in-development"]
[For "white"]
[Kind "main"]
[Opponent "4...Bxb4 5.c3 Ba5"]
[Start "evans-gambit 5.c3"]

5... Ba5 6. d4 { Takes the centre and attacks e5. } 6... exd4 7. O-O ( 7... Nge7 8. cxd4 d5 ) 7... d6 ...
```

- **`[Start "<chapter> <move>"]`**: the line branches after that move of that chapter. The move is written with its
  number (`5.c3`, `6...exd4`) and must be one the named chapter **writes itself**, on its main line or in a variation;
  a move it only inherits through its own `[Start]` does not count (name the chapter that writes it). If the chapter
  writes that move in more than one place, give the moves before it too: `[Start "odd-first-moves 1.h4 d5"]`. No
  `[Start]` (or empty): the line begins at the initial position (only a handful of chapters do, one per first move).
- The **moves** continue right after the `[Start]` move, numbered as in the game (`5... Ba5` when Black moves first).
  Never retype the parent's moves: they are inherited, with their comments.
- `( ... )` variations are the line's side branches. A branch that deserves its own id, kind, tags, course listing or
  more than about four moves is its own chapter instead, branching off this one.
- **`[For]`** `white` or `black`: the side the line is written for. `[Kind]` and `[Risk]` are from that side's view.
- **`[Kind]`**: `main`, `sideline`, `rare`, `gambit` (a line) or `for-us` (the `[For]` side springs it), `against-us`
  (the `[For]` side must avoid it) (a trap). A course of the other side sees a trap flipped.
- **`[Opponent]`**: what the opponent does to reach the line, with move numbers (`3...Bc5`, `4...Bxb4 5.c3 Ba5`, `2.f4`),
  shown in the lines list.
- **One comment per move, tree-wide.** A move (a position and a move from it, so transpositions included) has one
  comment wherever it is written; two chapters commenting it differently fail the build. Every line that passes through the
  move shows that comment and its marks (`?`, `!`, arrows, circles), merged over every chapter that writes it, so
  marking a move `?` marks it for every course that passes there. Write comments neutrally: "White", "Black", never "we". When both sides' courses explain a move, the side
  making it says it.

## course.yaml

| Key       | Meaning                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `name`    | The course name; quote it if it has a colon                                                                                    |
| `eco`     | Optional ECO code of the opening                                                                                               |
| `side`    | The learner's side, `white` or `black` (the folder no longer says it)                                                          |
| `opening` | An id in `content/openings.yaml`: who plays that opening decides "play it" versus "play against it"                            |
| `tier`    | 1 study first, 2 next, 3 alternatives and rare replies                                                                         |
| `trigger` | SAN to the position every listed line passes through: `1. e4 e5 2. Nf3` (`''` is the initial position)                         |
| `summary` | Two plain sentences (a `>-` block): what the opening is, and what the course covers                                            |
| `about`   | Required introduction: `idea` (why our side plays it), `risks` (what can go wrong, the opponent's best try), optional `origin` |
| `plans`   | A few bullets a 1200 can act on when the opponent leaves the book                                                              |
| `motifs`  | Ids from `content/motifs.yaml`                                                                                                 |
| `tags`    | Optional, searchable                                                                                                           |
| `lines`   | Teaching order, the first is the main line. Each entry is a line id, or `{id, kind?, opponent?, alternative?, section?}`       |

```yaml
lines:
  - accepted-main-line # a plain id: the chapter's [Kind] and [Opponent] apply
  - id: knight-recapture # traps are listed here too; the chapter's [Kind] says it is one
    section: Traps # the course page groups by section, in course.yaml order (give every entry one, or none)
  - id: kings-gambit-declined
    kind: sideline # this course sees it differently from the chapter's [Kind]
    opponent: '2.f4' # override the chapter's [Opponent]
  - id: four-knights
    alternative: true # shown and playable, never drilled: a second answer, or a line another course drills
```

- There is no `traps:` list, no `file:` and no `from:`. A trap cannot be `alternative`; a course needs at least one
  entry that is not a trap.
- Kind as this course sees it: the `kind` override if given; else the chapter's `[Kind]`, with a trap flipped when the
  chapter's `[For]` is not the course's `side` (`for-us` <-> `against-us`); lines keep their kind.
- Every listed line, rebuilt from move 1, must pass through the trigger position.

Which lines earn cards (`training.ts`): `main` and `gambit` always; `sideline` unless the explorer says too few games reach it;
`rare` only when the learner turns on "include rare lines"; `alternative` never. `against-us` traps give cards for the move that
avoids the trap (the repertoire move of another listed line; the trap shows the mistake marked `?`). `for-us` traps give no
move cards: give each one a quiz.

## PGN

- Header block, then moves in SAN with `{ comments }`. A comment before the first move is dropped. The final `*` is optional.
- NAGs: `?`, `??`, `?!`, `!`, `!!`, `!?` after the move (or `$2` etc.). `?`, `??`, `?!` mark a move as a mistake.
- Variations `( ... )` come immediately after the move they replace (before the reply to it), never after the reply.
- Shapes go inside a comment: `[%cal Gc4f7,Gh5f7]` arrows, `[%csl Ge4]` circles; colours `G R Y B`. Squares are not
  validated; check them by eye. Drawn in Browse, Play and Review.

## The repertoire rule and cards

At every position where it is the learner's turn there must be **exactly one move, across all the course's listed lines
and their variations, that is not marked `?`/`??`/`?!`** (alternative lines do not count). That move is the card. More
than one is a build error; none (all marked) is fine and gives no card. Only the learner's moves are cards. The rule is
per course: the tree may hold several moves at a position.

- Positions reachable only through a marked mistake **by the learner's own side** (a trap they fall into) are shown but never
  cards and are not conflict-checked. A mistake marked on the **opponent's** move does not stop cards: the punishing reply is a card.
- A line written for the other side shows several of the learner's moves at a position (they are its opponent's choices),
  so list it as `alternative: true`.
- Introduction order: main line of the first line, then other lines, then trap-only positions; each by distance from
  the start. After every 4th move card a quiz is slotted in.
- **Every-branch drill** (`/play/<course>/all/branches`): the learner plays the repertoire move; the computer plays a random
  known reply, the main-line one three times as often. So: list every reply the opponent is likely to try (lines or short
  variations), put the most common reply in the first line, and give each sideline reply its own repertoire answer, or the
  drill ends there.

## Tags (PGN header)

Required: `Opening`, `Variation`, `ECO`, `Character`, `Risk`, `EarlyMate`, `Tricks`, `For`, `Kind`, `Opponent`. Optional:
`Event`, `Start`, `Refutes`, `RefutedBy`, `Themes`. Lowercase values, comma lists without spaces. Unknown tags or values fail
the build. (The code accepts a missing `Kind` or `Opponent` when every course listing the line gives one; always write them.)

| Tag         | Values and how to choose                                                                                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Opening`   | The opening this line belongs to (free text, shown as the family).                                                                                                                                                                       |
| `Variation` | The standard name (check `.cache/openings.tsv`, the Lichess openings list, if present). Shown to the learner.                                                                                                                            |
| `ECO`       | ECO of the variant's last named position. Not checked for correctness.                                                                                                                                                                   |
| `Character` | 1 to 3 of `solid` (few weaknesses), `positional` (plan or structure), `sharp` (open, accurate play), `gambit` (material offered), `tactical` (about a concrete tactic; usual for refutations)                                            |
| `Risk`      | For the `[For]` side. `low`: a slip costs a tempo. `medium`: a slip loses a pawn or piece, or early queen, hanging pieces, pins. `high`: one slip loses the game fast. When unsure pick the higher.                                      |
| `EarlyMate` | `none` unless a concrete mating pattern exists in the first 12 moves: `white`, `black`, or `both`. Means "who can mate if the line goes wrong".                                                                                          |
| `Tricks`    | `none` (alone) or motifs that actually occur in the line: `trap fork pin skewer discovered-attack hanging-piece back-rank queen-trap smothered-mate early-queen pawn-grab castling-lost mate-threat`. A trap has `trap` plus its tactic. |
| `For`       | `white` or `black`: the side the line is written for.                                                                                                                                                                                    |
| `Kind`      | `main`, `sideline`, `rare`, `gambit` (a line) or `for-us`, `against-us` (a trap), from the `[For]` side's view.                                                                                                                          |
| `Opponent`  | What the opponent does to reach the line, with move numbers: `3...Bc5`, `4...Bxb4 5.c3 Ba5`.                                                                                                                                             |
| `Start`     | The chapter and move this line branches after: `evans-gambit 5.c3`, `accepted-main-line 6...exd4`, `odd-first-moves 1.h4 d5`.                                                                                                            |
| `Refutes`   | Optional. Legal SAN from move 1 ending on the opponent's mistake: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4`. Shown to the learner verbatim.                                                                                                       |
| `RefutedBy` | Optional. Legal SAN from move 1 of the line that punishes this one, if it is a known mistake.                                                                                                                                            |
| `Themes`    | kebab-case plans, 1 to 3: `d4-break`, `f7-pressure`, `good-bishop`. Reuse: `grep -rh '^\[Themes' content/tree`.                                                                                                                          |

A trap is a chapter with a trap `[Kind]`: one specific trick, a mistake the `[For]` side must avoid (`against-us`, the
mistake marked `?` or `$2`) or an opponent mistake it punishes (`for-us`, which must end clearly better for it). A strong
line against a merely dubious move (`2.Bc4?!`) is a regular line (mark the dubious move `?!`).

## Position links

In a comment, `summary`, `about` text or `plans` bullet, `[words](EPD-or-FEN)` makes the words hover-able: the board beside the text shows that position. Get the EPD with `pnpm fen "1. e4 e5 2. Nf3"`. See `content/README.md`, "Position links in text".
