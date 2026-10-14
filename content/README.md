# Opening content

Authored by hand, shipped read-only. `pnpm content:build` (Phase 2) parses everything here, validates it against the
Zod schemas in `packages/core`, and writes `apps/web/public/content/<opening-id>.json`. A broken file fails the build.

## Courses, families and what a refutation is

A course has one learner side and, at each position where it is the learner's turn, exactly one repertoire move. That is
why two different systems against the same opening (say 2.Nc3, the Two Knights, and 2.d4, the Advance and Panov) are
**separate courses**, not lines of one course. Courses about the same opening share a `family:` in `opening.yaml`, and
a course that is a repertoire against an opening says so with `against: "Caro-Kann Defence"`; a named position or idea that belongs to no single
opening (a counter-attack such as the Traxler, a famous attack like the Fried Liver) is a _motif_: put it in
`content/motifs/<id>/`, same files as a course, with no `family` or `against`; the app links them and
labels the cards. Each system gets lines for every reply Black is likely to try, and the **Practise every branch** drill
walks all of them.

`refutations/` is narrower: lines that punish one specific mistake or trap (Blackburne Shilling, Elephant Trap), each with a
`Refutes` tag. A strong, learnable line against an opponent's opening is not a refutation in this sense; it belongs in
`lines/` of an `against` course. After a mistake the learner's own side is shown making (a `?` move of theirs), the moves
that follow are shown but never become cards.

## Openings: `content/families.yaml`

The Openings page lists _openings_ (families), and each opening groups the courses about it from either side. An entry
describes the opening itself:

```yaml
- id: caro-kann # kebab-case; courses join it with `family: caro-kann` in their opening.yaml
  name: Caro-Kann Defence
  eco: B10-B19
  summary: One or two plain sentences.
  moves: 1. e4 c6 # SAN to the defining position: its thumbnail and board-search position
```

A course with `against:` must name a family listed here. A course with no `family:` stands alone as its own opening, so
the file only needs entries for openings with more than one course (but listing every opening lets you write a proper
summary and defining moves). A listed family needs at least one course and a legal `moves` line, or the build fails.

## Layout

```
content/openings/<opening-id>/
  opening.yaml                    # the Opening record: name, ECO, side, level, summary, tags, variant order
  lines/<variant-id>.pgn          # the repertoire: what we play against the opponent's sensible choices
  refutations/<variant-id>.pgn    # how we punish an opponent mistake or trap attempt; needs a Refutes tag
```

Both folders hold variants with the same format; the folder sets the variant's `kind` (`line` or `refutation`).
Lines are taught first. Refutations are introduced after the lines that reach their starting position, and are where
most quizzes come from.

- `<opening-id>` and `<variant-id>` are kebab-case and stable. They end up in card ids and the learner's history, so
  renaming one orphans that history.
- `opening.yaml` lists every variant under `lines:` and `refutations:`, each in teaching order. The first line is the
  main line. A `.pgn` file not listed, or a listed one that is missing, fails the build. Variant ids are unique across
  both folders.
- The build merges all variants of an opening into one tree keyed by EPD. Shared moves become shared nodes, and a
  variant that transposes into another lands on the same node. Each node records which variants pass through it.
- One game per `.pgn` file. Sub-variations `( ... )` inside a file are fine for short sidelines; a sideline that needs
  its own tags or teaching order gets its own file.
- `side` in `opening.yaml` is the side the learner plays. Variants are usually the opponent's choices.

## Repertoire rules (checked by the build)

- One answer per position: across all variants of an opening, every position where it is our move has exactly one
  move that is not marked `?`, `??` or `?!`. Two variants may not teach different moves from the same position.
- A move marked `?` or `??` is a warning, never a card. It shows what not to do (a trap line, a greedy capture) and
  is a quiz candidate.
- Lines stop around move 10 to 12.

## Variant tags

Every `.pgn` starts with a header block. The standard tags name it; the Knight School tags describe it in a fixed
vocabulary so the app can filter, badge and quiz on them. Unknown tags or values fail the build; add a value here and
to the Zod enum in the same commit.

| Tag         | Required    | Value                                                                           | Example                                 |
| ----------- | ----------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| `Opening`   | yes         | Opening name, same as `opening.yaml`                                            | `Italian Game`                          |
| `Variation` | yes         | Variant name                                                                    | `Giuoco Pianissimo`                     |
| `ECO`       | yes         | ECO code of the variant's last named position                                   | `C50`                                   |
| `Character` | yes         | One or more of `solid`, `sharp`, `gambit`, `positional`, `tactical`             | `solid,positional`                      |
| `Risk`      | yes         | How badly a beginner on our side can go wrong: `low`, `medium`, `high`          | `low`                                   |
| `EarlyMate` | yes         | Who has mating chances in the first 12 moves: `white`, `black`, `both`, `none`  | `none`                                  |
| `Tricks`    | yes         | Tricks either side can fall for, from the motif list below, or `none`           | `trap,fork`                             |
| `Refutes`   | refutations | SAN from the start position of the opponent idea this line punishes             | `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5` |
| `RefutedBy` | no          | SAN from the start of the line that punishes this one, if it is a known mistake | `1. e4 e5 2. Qh5 Nc6 3. Bc4 g6`         |
| `Themes`    | no          | Plans and ideas, kebab-case, open vocabulary                                    | `d4-break,f7-pressure`                  |

`Refutes` and `RefutedBy` are checked for legality at build time. Lists are comma-separated with no spaces.

Motif ids (shared with `Annotation.motifs` and the MotifExplainer, so a quiz answer and a tag use the same words):
`trap`, `fork`, `pin`, `skewer`, `discovered-attack`, `hanging-piece`, `back-rank`, `queen-trap`, `smothered-mate`,
`early-queen`, `pawn-grab`, `castling-lost`, `mate-threat`.

Move-level tags (a trick at one specific move) belong in that move's annotation, not the header.

## Example

```
content/openings/italian-game/opening.yaml
content/openings/italian-game/lines/giuoco-pianissimo.pgn         <- main line, listed first
content/openings/italian-game/lines/two-knights.pgn
content/openings/italian-game/refutations/blackburne-shilling.pgn <- Refutes "... 3. Bc4 Nd4"
```

## Sources

See docs/PLAN.md "Opening content" for licences. Lichess chess-openings and the puzzle database are CC0; Wikibooks text
is CC BY-SA 4.0 and must not be pasted into comments without attribution and the same licence.

## Quizzes

`content/openings/<opening-id>/quizzes.yaml` is an optional list of questions about positions in the course. Each is a
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
