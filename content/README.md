# Content

Authored by hand, shipped read-only. `pnpm content:build` parses everything here, validates it against the Zod schemas in
`packages/core`, and writes `apps/web/public/content/`. A broken file fails the build.

## The idea

Opening theory is a **tree**. 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 is the Italian; 4.c3 grows the Giuoco Piano out of it, 4.b4
the Evans Gambit, and each branches again. Everything upstream of a branch is shared, so it is written **once**:

- **The tree** (`tree/`) holds every position and move we teach, for both sides, split into **chapters**. A chapter is
  one PGN file holding one **line**, written from the point where it branches off another chapter. Its file name is the
  line's id.
- **A course** (`courses/<id>/`) is a selection of lines from the tree for one side: a trigger position, an
  introduction, plans, and the lines it teaches in order. Any course can list any line, so the same line can be in several
  courses ("also in" on the course page).
- **The build** rebuilds each listed line from the start and merges a course's lines into the course's own tree, which
  is what the app reads. The app never sees chapters.

A course is still organised by who is to move and what the opponent has done (one White repertoire, one defence to 1.e4,
one to 1.d4, one setup against everything else, plus gambit courses); gambits, traps and sidelines are lines inside the
course where they arise.

## Layout

```
content/
  tree/<first move>/<opening family>/<line>.pgn   the theory, e.g. tree/e4/evans-gambit/accepted-main-line.pgn
  courses/<course>/course.yaml                    a course: side, trigger, introduction, plans, the lines it takes
  courses/<course>/quizzes.yaml                   optional questions about positions in the course
  curriculum.yaml     the order to study courses in, and what each depends on
  openings.yaml       the openings courses are grouped under, and who plays each (play it / play against it)
  motifs.yaml         the vocabulary for `motifs:` and the glossary
  analysis/           native-Stockfish results from `pnpm analyse`
  popularity/         Lichess explorer counts from `make popularity`
  _staging/ _parked/  folders starting with _ are never built
```

The folders under `tree/` are for people (first move, then the opening family); the build reads every `.pgn` under
`tree/` and only the `[Start]` headers decide the shape. Line ids are file names, so they must be unique across the
whole tree, and they end up in the learner's history: do not rename them casually. A course's id is its folder name.

`make doctor` reports what is worth tidying: moves written out in more than one chapter, chapters no course lists, lines
in several courses, and courses for the same side that play different moves. It never fails; the build enforces the
rules below.

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
[For "white"]
[Kind "main"]
[Opponent "4...Bxb4 5.c3 Ba5"]
[Start "evans-gambit 5.c3"]

5... Ba5 6. d4 { Takes the centre and attacks e5. } 6... exd4 7. O-O ( 7... Nge7 8. cxd4 d5 ) ...
```

- **`[Start "<chapter> <move>"]`** says where the line branches: after that move of that chapter. The move must be one
  the named chapter writes itself (on its main line or in a variation). If the chapter writes that move in more than one
  place, give the moves before it too, as many as it takes: `[Start "odd-first-moves 1.h4 d5"]`. No `[Start]`: the line
  begins at the initial position. Chapters may come in any order; a missing chapter, a move the parent does not write, an
  ambiguous start or a circle fails the build.
- The chapter's moves continue from there, numbered as in the game (`5... Ba5`). `( ... )` variations are the line's
  side branches. A side branch that deserves its own id, kind or course listing should be its own chapter instead.
- **`[For]`** is the side the line is written for: `[Kind]` and `[Risk]` are from that side's point of view.
- **`[Kind]`** is `main`, `sideline`, `rare` or `gambit` for a line, `for-us` (we spring it) or `against-us` (we must
  avoid it) for a trap. A course of the other side that lists a trap sees it flipped: one side's `for-us` is the other's
  `against-us`. A course can override the kind of any line it lists.
- **`[Opponent]`** is what the opponent does to reach the line ("3...Bc5"), shown in the lines list. A course can override it.
- **A move has one comment**, wherever it is written: two chapters that comment differently on the same move fail the
  build. The comment explains the move for both sides, so write "White", "Black", never "we". When both sides' courses
  explain a move, the side making the move says it.
- Every line rebuilt from the start passes through the trigger of each course that lists it.

## course.yaml

```yaml
name: Italian Game
eco: C50 # optional, shown on the card
side: white # the side the learner plays
opening: italian-game # an id from content/openings.yaml
tier: 1 # 1: study first. 2: next. 3: alternatives and rare replies
trigger: '1. e4 e5 2. Nf3' # SAN to the position every line of the course passes through
summary: >-
  Two plain sentences: what the opening is (the position, and who gives what) and what the course covers.
about: # required: the introduction at the top of the course page and on the play page
  idea: >- # why our side plays it and what it hopes for
    Two to four plain sentences.
  risks: >- # its weaknesses for our side, and the opponent's best try against it
    Two to four plain sentences.
  origin: >- # optional: where it comes from or who made it popular; leave it out rather than guess
    One sentence.
plans: # a few bullets a 1200 can act on when the opponent leaves the book
  - Castle by move six; Re1, Nbd2, Bb3, h3 and Nf1-g3 is the middlegame.
motifs: [f7-weakness, fork-trick] # ids from motifs.yaml
tags: [e4, open] # optional, searchable
lines: # teaching order, any line of the tree by id; the first is the main line
  - giuoco-pianissimo
  - two-knights-fried-liver
  - blackburne-shilling # a trap: its chapter's [Kind] says so
  - id: four-knights-alternative
    alternative: true # shown and playable, never drilled: a second answer to a position another line answers
  - id: kings-gambit-declined
    kind: sideline # override the chapter's [Kind] for this course
    opponent: '2.f4' # override the chapter's [Opponent]
    section: "King's Gambit" # optional: group the course page by this heading instead of main / sideline / trap
```

**The introduction.** Nobody should land on a course without knowing what it is. `summary` says what the opening is,
`about.idea` why our side plays it, `about.risks` what can go wrong for our side (including the opponent's best try and,
for a gambit, what the engine thinks of it), and the optional `about.origin` where it comes from. Write for a beginner, a
few sentences each, without repeating the summary or the plans. Leave `origin` out unless you are sure of the history.

**What `kind` does to cards.** `main` and `gambit` lines always produce cards. `sideline` lines do unless the explorer says
too few games reach them. `rare` lines produce cards only when the learner turns on "include rare lines" in Settings.
`alternative` lines never do. `against-us` traps produce cards for the move that avoids the trap (it is the repertoire move
of another line, and the trap shows the mistake, marked `?`). `for-us` traps produce no cards, because the opponent has to
move first: give each one a quiz instead (a question about the position where we strike).

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

- One answer per position **within a course**: across the course's non-alternative lines, every position where it is our
  move has exactly one move that is not marked `?`, `??` or `?!`. Put a second answer in a line listed with
  `alternative: true`. The tree itself may hold several of our moves at a position (after 1.e4 e5 the Italian plays 2.Nf3,
  the King's Gambit 2.f4); each course picks one.
- A move marked `?` or `??` is a warning, never a card. It shows what not to do and is a quiz candidate. The moves that follow
  a mistake of ours are shown but never asked.
- Lines run to move 10 to 12 for main lines and to the point the trick is resolved for traps; sidelines to move 8. Each
  `main` line ends with a comment that names the plan.
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
| `For`       | yes      | The side the line is written for: `white` or `black`                            | `white`                                 |
| `Kind`      | yes      | `main`, `sideline`, `rare`, `gambit` (lines) or `for-us`, `against-us` (traps)  | `main`                                  |
| `Opponent`  | yes      | What the opponent does to reach the line                                        | `3...Bc5`                               |
| `Start`     | no       | The chapter and move this line branches after                                   | `evans-gambit 5.c3`                     |
| `RefutedBy` | no       | SAN from the start of the line that punishes this one, if it is a known mistake | `1. e4 e5 2. Qh5 Nc6 3. Bc4 g6`         |
| `Themes`    | no       | Plans and ideas, kebab-case, open vocabulary                                    | `d4-break,f7-pressure`                  |

`Refutes` and `RefutedBy` are checked for legality at build time. Lists are comma-separated with no spaces.

Motif ids (shared with `Annotation.motifs` and the MotifExplainer, so a quiz answer and a tag use the same words):
`trap`, `fork`, `pin`, `skewer`, `discovered-attack`, `hanging-piece`, `back-rank`, `queen-trap`, `smothered-mate`,
`early-queen`, `pawn-grab`, `castling-lost`, `mate-threat`.

Move-level tags (a trick at one specific move) belong in that move's annotation, not the header.

The app explains every tag value to the learner (a hover on each badge and a key above the lines), in
`apps/web/src/features/openings/explanations.ts`. A new value needs its explanation there too.

## Position links in text

A comment, a course `summary`, the `about` texts and a `plans` bullet may point at a position, so a reader can see what the words mean:
`[f7](r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -)`. The words in square brackets are shown; the part in
parentheses is any legal FEN or EPD. Beside a board, hovering (or tapping) the words puts that position on the board and
it goes back when the pointer leaves. `pnpm fen "1. e4 e5 2. Nf3 Nc6 3. Bc4"` prints the EPD for a move list. A target that
looks like a position (it contains `/`) but is not legal fails the build with the file name.

## Example: adding a branch

To teach the Evans Gambit's 5...Bc5 in the White Evans course:

1. Find the chapter that writes the move before the branch. `grep -rl "5. c3" content/tree` finds
   `tree/e4/open-games/evans-gambit.pgn`: a chapter written for Black (the Open Games course meets the Evans). The tree
   is shared, so White's Evans lines branch off it too.
2. Write `tree/e4/evans-gambit/evans-bc5.pgn` with `[Start "evans-gambit 5.c3"]`, `[For "white"]`, `[Kind "sideline"]`,
   `[Opponent "5...Bc5"]` and the moves from `5... Bc5` on.
3. Add `evans-bc5` to `lines:` in `courses/evans-gambit/course.yaml`.
4. `pnpm content:build`, then `make doctor`.

## Sources

See docs/PLAN.md "Opening content" for licences. Lichess chess-openings and the puzzle database are CC0; Wikibooks text
is CC BY-SA 4.0 and must not be pasted into comments without attribution and the same licence.

## Quizzes

`courses/<course>/quizzes.yaml` is an optional list of questions about positions in the course. Each is a
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
