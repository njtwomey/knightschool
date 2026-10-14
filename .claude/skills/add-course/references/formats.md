# Formats: files, opening.yaml, families.yaml, PGN, tags

Code is the authority: `packages/core/src/{schema/content,tree,tags,families}.ts`, `scripts/content-lib.ts`. The build
errors name the file and the problem; this page only covers what they cannot tell you.

## Layout

```
content/families.yaml                    openings that group courses (shared file; see Families)
content/openings/<course-id>/
  opening.yaml                           required
  lines/<variant-id>.pgn                 the repertoire; at least one; the first listed is the main line
  refutations/<variant-id>.pgn           optional: ONE specific mistake or trap each, needs [Refutes]
  quizzes.yaml                           optional
```

- Ids (course folder, variant file, quiz id) are kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`) and **permanent**: they are part
  of card ids and learner history. `all` is reserved as a variant id.
- Variant ids are unique across `lines/` and `refutations/`. Every `.pgn` must be listed in `opening.yaml` and every listed
  id must exist.
- One game per `.pgn`. Everything in a course merges into one tree keyed by position, so transpositions share cards and
  comments. A shared move may be commented in only one place (different comment text on the same move is an error).

## opening.yaml

| Field         | Rule                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `name`        | Non-empty. Every PGN `[Opening "..."]` must equal it. **Quote it if it contains a colon.**          |
| `eco`         | `A00`..`E99`                                                                                        |
| `side`        | `white` or `black`: the learner's side                                                              |
| `level`       | `beginner` (use this) or `club`                                                                     |
| `summary`     | Two plain sentences. Use a `>-` block.                                                              |
| `tags`        | kebab-case words, may be `[]`: `e4`/`d4`, `open`/`semi-open`/`closed`, `solid`, `system`, `against` |
| `family`      | Optional: id of the opening (families.yaml) this course belongs to                                  |
| `against`     | Optional: the name of the opening this course is a repertoire against (e.g. `Queen's Gambit`)       |
| `lines`       | Ids in teaching order; at least one; **first = main line**                                          |
| `refutations` | Ids, or `[]` (the key must be present)                                                              |

**One course = one learner side = exactly one repertoire move per position.** Alternative systems against the same
opening (Two Knights, Advance, Panov against the Caro-Kann) are separate courses, never lines of one course.

## Families (content/families.yaml)

An opening seen from both sides. The app groups courses under it: courses that **play it** (no `against`) and courses that
**meet it** (`against: <opening name>`). Example: family `queens-gambit` has "Queen's Gambit" (White) and the Black courses
QGD, Slav, Semi-Slav with `against: Queen's Gambit`.

Entry fields (`FamilyMeta`): `id` (kebab), `name`, `eco` (optional, `D06` or `D06-D69`), `summary`, `moves` (legal SAN from
move 1 to the defining position, `1. d4 d5 2. c4`). Template: `templates/families.yaml`.

Rules (`families.ts`, `content-lib.ts`):

- A course with `family:` joins that family; with no `family` it stands alone as its own opening (id = course id).
- A course with `against:` **must** name a family that is **listed in families.yaml**, or the build fails. A listed family must
  have at least one course, and its `moves` must be legal.
- Ids in families.yaml are unique. `family`/`against` are not checked against each other beyond that, so keep them consistent.
- **Adding a course to a family that already exists**: set `family:` in the course; no families.yaml edit needed.
- **A new family** (e.g. you add the first course of `slav-defence` with `against`): add one entry. families.yaml is shared and
  edited by everyone, so **when told to "report, don't edit", do not touch it**: put the entry (from the template) in your
  final report for the coordinator, and say which course needs it. The build of your course fails until it is added; that is
  expected.

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
- Introduction order: main line of the first line, then other lines, then refutation-only positions; each by distance from
  the start. After every 4th move card a quiz is slotted in.
- **Every-branch drill** (`#/play/<course>/all/branches`): the learner plays the repertoire move; the computer plays a random
  known reply, the main-line one three times as often. So: list every reply the opponent is likely to try (lines or short
  variations), put the most common reply in the first line, and give each sideline reply its own repertoire answer, or the
  drill ends there.

## Tags (PGN header)

Required: `Opening`, `Variation`, `ECO`, `Character`, `Risk`, `EarlyMate`, `Tricks`. Optional: `Event`, `Refutes` (required in
`refutations/`), `RefutedBy`, `Themes`. Lowercase values, comma lists without spaces. Unknown tags or values fail the build.

| Tag         | Values and how to choose                                                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Variation` | The standard name (check `.cache/openings.tsv`, the Lichess openings list, if present). Shown to the learner.                                                                                                                                 |
| `ECO`       | ECO of the variant's last named position. Not checked for correctness.                                                                                                                                                                        |
| `Character` | 1 to 3 of `solid` (few weaknesses), `positional` (plan or structure), `sharp` (open, accurate play), `gambit` (material offered), `tactical` (about a concrete tactic; usual for refutations)                                                 |
| `Risk`      | `low`: a slip costs a tempo. `medium`: a slip loses a pawn or piece, or early queen, hanging pieces, pins on our pieces. `high`: one slip loses the game fast. When unsure pick the higher.                                                   |
| `EarlyMate` | `none` unless a concrete mating pattern exists in the first 12 moves: `white`, `black`, or `both`. Means "who can mate if the line goes wrong".                                                                                               |
| `Tricks`    | `none` (alone) or motifs that actually occur in the file: `trap fork pin skewer discovered-attack hanging-piece back-rank queen-trap smothered-mate early-queen pawn-grab castling-lost mate-threat`. A trap file has `trap` plus its tactic. |
| `Refutes`   | Legal SAN from move 1 ending on the opponent's mistake: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4`. Shown to the learner verbatim. Keep it a prefix of the file.                                                                                        |
| `Themes`    | kebab-case plans, 1 to 3: `d4-break`, `f7-pressure`, `good-bishop`. Reuse: `grep -rh '^\[Themes' content/openings`.                                                                                                                           |

`refutations/` is **only** for a line that punishes one specific mistake or trap (Blackburne Shilling, Elephant Trap), each
with `Refutes`. A strong line against an opponent's opening, or against a merely dubious move (`2.Bc4?!`), is a regular
`lines/` file (mark the dubious move `?!`).
