# Content

Authored by hand, shipped read-only. `pnpm content:build` parses everything here, validates it against the Zod schemas in
`packages/core`, and writes `apps/web/public/content/`. A broken file fails the build. `content/curriculum.yaml`,
`content/openings.yaml` and `content/motifs.yaml` sit beside the courses.

## The idea

Organise by **who is to move and what the opponent has done**, not by opening name. A learner needs one White repertoire,
one defence to 1.e4, one defence to 1.d4 and one setup against everything else. Each of those is a **course**: a tree
rooted at a **trigger** position, whose branches are the opponent's choices and whose leaves are our replies. Gambits, traps
and sidelines are branches inside the course where they arise, tagged by kind, never top-level items. `docs/CURRICULUM.md`
is the proposal this follows, with the changes noted at its end.

## Layout

```
content/
  curriculum.yaml     the order to study courses in, and what each depends on
  openings.yaml       the openings courses are grouped under, and who plays each (play it / play against it)
  motifs.yaml         the vocabulary for `motifs:` and the glossary
  white/e4/<course>/  courses where the learner is White ...
  black/vs-e4/<course>/   ... and where the learner is Black (the folder decides the side; course.yaml must agree)
  _parked/            material kept for later; folders starting with _ are never built
  analysis/           native-Stockfish results from `pnpm analyse`
```

A course is any folder under `white/` or `black/` (at any depth) that holds a `course.yaml`. Its **id is the folder name**,
so folder names must be unique across the whole tree.

```
<course>/
  course.yaml                 name, side, tier, opening, trigger, summary, plans, motifs, the lines and traps
  lines/<file>.pgn            one PGN per opponent choice; `( ... )` variations inside are fine
  traps/<file>.pgn            tricks inside the course (see below)
  quizzes.yaml                optional questions about positions
```

`<file>` names (without `.pgn`) are ids that end up in card ids and the learner's history, so do not rename them casually.

## course.yaml

```yaml
name: Italian Game
eco: C50 # optional, shown on the card
side: white # must match the white/ or black/ folder
opening: italian-game # an id from content/openings.yaml
tier: 1 # 1: study first. 2: next. 3: alternatives and rare replies
trigger: '1. e4 e5 2. Nf3' # SAN to the position every line of the course passes through
summary: >-
  Two plain sentences.
plans: # a few bullets a 1200 can act on when the opponent leaves the book
  - Castle by move six; Re1, Nbd2, Bb3, h3 and Nf1-g3 is the middlegame.
motifs: [f7-weakness, fork-trick] # ids from motifs.yaml
tags: [e4, open] # optional, searchable
lines: # teaching order; the first is the main line
  - file: giuoco-pianissimo
    opponent: '3...Bc5' # what the opponent does to reach this line
    kind: main # main | sideline | rare | gambit
  - file: vs-elephant-gambit
    opponent: '2...d5'
    kind: gambit # a gambit the opponent plays and we must meet
  - file: four-knights-alternative
    opponent: '3...Nf6'
    kind: sideline
    alternative: true # shown and playable, never drilled: a second answer to a position another line answers
traps:
  - file: blackburne-shilling
    opponent: '3...Nd4'
    kind: against-us # what we must not fall for (our mistake is marked ?)
  - file: legal-mate
    opponent: '3...d6 4.Nc3 Bg4'
    kind: for-us # what we spring when the opponent errs
```

**What `kind` does to cards.** `main` and `gambit` lines always produce cards. `sideline` lines do unless the explorer says
too few games reach them. `rare` lines produce cards only when the learner turns on "include rare lines" in Settings.
`alternative` lines never do. `against-us` traps produce cards for the move that avoids the trap (it is the repertoire move
in `lines/`, and the trap file shows the mistake, marked `?`). `for-us` traps produce no cards, because the opponent has to
move first: give each one a quiz instead (a question about the position where we strike).

Every PGN may also carry `[Kind "main"]` (or `for-us` and so on). It is optional, but if present the build checks it
against course.yaml.

## Openings, order and motifs

`openings.yaml` lists openings with `id`, `name`, `side` (who plays the opening), `eco`, `summary` and `moves` (SAN to the
defining position, drawn as its thumbnail). A course on the opening's side is **playing it**; a course on the other side is
**playing against it**. So the Caro-Kann is one opening: the Black course plays it and the White Advance course plays
against it, and they sit together. An opening needs at least one course.

`curriculum.yaml` is the study order, one `- id:` per course with optional `prerequisites: [ids]`. Every course appears
exactly once, after anything it depends on.

`motifs.yaml` is the tag vocabulary (`id`, `name`, one plain sentence, `group: tactical | structural`). Courses may name only
listed ids. It also feeds the glossary page. The `Tricks` header tag and move-level motif detection use the smaller
enum in the Variant tags section below.

## Repertoire rules (checked by the build)

- One answer per position: across all non-alternative variants of a course, every position where it is our move has exactly
  one move that is not marked `?`, `??` or `?!`. Two variants may not teach different moves from the same position. Put
  second answers in a variant marked `alternative: true`.
- A move marked `?` or `??` is a warning, never a card. It shows what not to do and is a quiz candidate. The moves that follow
  a mistake of ours are shown but never asked.
- Every line's main path passes through the trigger position.
- One game per `.pgn`. Lines run to move 10 to 12 for main lines and to the point the trick is resolved for traps; sidelines
  to move 8. Each `main` line ends with a comment that names the plan.
- Where a White course and a Black course reach the same position, the build prints a warning when they disagree about the
  move the White side plays.

## Variant tags

Every `.pgn` starts with a header block. The standard tags name it; the Knight School tags describe it in a fixed
vocabulary so the app can filter, badge and quiz on them. Unknown tags or values fail the build; add a value here and
to the Zod enum in the same commit.

| Tag         | Required | Value                                                                           | Example                                 |
| ----------- | -------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| `Opening`   | yes      | The opening this line belongs to (free text)                                    | `Italian Game`                          |
| `Variation` | yes      | Variant name                                                                    | `Giuoco Pianissimo`                     |
| `ECO`       | yes      | ECO code of the variant's last named position                                   | `C50`                                   |
| `Character` | yes      | One or more of `solid`, `sharp`, `gambit`, `positional`, `tactical`             | `solid,positional`                      |
| `Risk`      | yes      | How badly a beginner on our side can go wrong: `low`, `medium`, `high`          | `low`                                   |
| `EarlyMate` | yes      | Who has mating chances in the first 12 moves: `white`, `black`, `both`, `none`  | `none`                                  |
| `Tricks`    | yes      | Tricks either side can fall for, from the motif list below, or `none`           | `trap,fork`                             |
| `Refutes`   | no       | SAN from the start position of the opponent idea this line punishes             | `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5` |
| `Kind`      | no       | `main`, `sideline`, `rare`, `gambit` (lines) or `for-us`, `against-us` (traps)  | `main`                                  |
| `RefutedBy` | no       | SAN from the start of the line that punishes this one, if it is a known mistake | `1. e4 e5 2. Qh5 Nc6 3. Bc4 g6`         |
| `Themes`    | no       | Plans and ideas, kebab-case, open vocabulary                                    | `d4-break,f7-pressure`                  |

`Refutes` and `RefutedBy` are checked for legality at build time. Lists are comma-separated with no spaces.

Motif ids (shared with `Annotation.motifs` and the MotifExplainer, so a quiz answer and a tag use the same words):
`trap`, `fork`, `pin`, `skewer`, `discovered-attack`, `hanging-piece`, `back-rank`, `queen-trap`, `smothered-mate`,
`early-queen`, `pawn-grab`, `castling-lost`, `mate-threat`.

Move-level tags (a trick at one specific move) belong in that move's annotation, not the header.

## Example

```
content/white/e4/vs-e5-italian/course.yaml
content/white/e4/vs-e5-italian/lines/giuoco-pianissimo.pgn      <- main line, listed first
content/white/e4/vs-e5-italian/lines/two-knights-fried-liver.pgn
content/white/e4/vs-e5-italian/traps/blackburne-shilling.pgn    <- kind: against-us
```

## Sources

See docs/PLAN.md "Opening content" for licences. Lichess chess-openings and the puzzle database are CC0; Wikibooks text
is CC BY-SA 4.0 and must not be pasted into comments without attribution and the same licence.

## Quizzes

`<course>/quizzes.yaml` is an optional list of questions about positions in the course. Each is a
review card of its own, scheduled like a move; about one card in five is a quiz.

```yaml
- id: nxe5-trap # kebab-case, unique in the course
  line: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 # SAN from the start: the position the question is about
  prompt: White just took the pawn on e5. Why is that a mistake?
  accept: # the first entry that matches wins
    - keywords: [[queen, qg5], [fork, attack, two]] # groups of any-of words
      all: true # every group must match (false: any one group)
      feedback: Yes. 4...Qg5 attacks the knight on e5 and the pawn on g2 at once.
  reveal: Shown after a miss, with the move played on the board.
  showMove: Qg5 # optional, SAN from the quiz position
  examples: # optional but encouraged: checked at build time
    match: [Black plays Qg5 forking e5 and g2]
    miss: [it develops a piece]
```

An accept entry with `partial: true` is a "close" answer: it shows its feedback as "Close." but is graded as a miss.

Matching is deliberate plain string matching: lowercase, punctuation removed, a small list of near-synonyms mapped to one
word each (drops, loses, hangs, en prise all become "lose"; forks and attacks two become "fork"), whole words only. Write
keywords the way a learner would say them. Quote any sentence that contains a colon.
