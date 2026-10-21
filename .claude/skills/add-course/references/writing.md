# Writing: choosing lines, explaining moves, quizzes

## Choosing lines

- A beginner (about 1000 to 1600) is the audience. Four to ten lines per course (a gambit course five to nine). First line = the most common reply with
  the clearest plan. List every reply the opponent is likely to try (the every-branch drill plays them).
- Lines stop around move 10 to 12, after exchanges finish and the plan is visible. Do not end mid-capture.
- Prefer the move that is easier to explain and harder to misplay. Never write a move you cannot give a reason for.
- **Check with the engine**: lines drafted from memory are often wrong. Run `course:eval` and follow what the engine prefers.
- Mark the opponent's bad moves `?`/`?!` and the learner's demonstrated mistakes `?`/`??`; keep demonstrations short.
- Variation inside the chapter for a short sideline (about 4 moves); a separate chapter, branching off this one, when it
  needs its own id, name, kind, tags or a place in another course.
- Transpositions are fine: same position = same card. Say so in a comment when a variation transposes.
- Before writing, see what the tree already has from the trigger (`tree-at`): list those lines instead of writing them
  again, and start new chapters after the last move the tree writes.

## The introduction (`about` in course.yaml)

The course page and the play page open with it, so a learner who has never heard of the opening knows what it is for.
`summary` says what the opening is (the position, and who gives what). Then:

- `idea`: why our side plays it and what it hopes for (space, a lead in development, a target such as f7, a simple
  repeatable plan). Two to four sentences.
- `risks`: what can go wrong for our side: the structural cost (a shut-in bishop, a weakened king, a pawn down), the
  opponent's best try, and for a gambit what the engine thinks of it (check with `course:eval` or native Stockfish).
- `suits`: who it suits and when to choose it: the style of player (attacker, solid, low on study time), the kind of
  game, and how it compares with the other courses for the same moment. One or two sentences.
- `origin` (optional): one sentence on where the name comes from or who made it popular. Only what you are sure of; leave
  it out rather than guess.

Do not repeat the summary or the plans; say why, not which moves. The same rules as for notes apply (plain words, define
any jargon in the same sentence, no exclamation marks).

## Explaining moves (this is what makes a course good)

A comment sits on a move: `3. Bc4 { Aims at f7, the square only Black's king protects. }`. A move has one comment in
the whole tree, read by every course that passes there, for either side, so before writing on a move another chapter also
writes, read what it says (`tree-at`): keep it, or improve that one comment. In Play and Review the learner sees the
comment plus at most one generated note; in Browse all of them. Generated notes (`explain/`) only name tactics
(mate threat, hanging piece, fork, pin or skewer of a piece, wins material) and are dropped below confidence 0.7 when you
wrote a note. They **cannot** say plans, prevention, structure or why a quiet move was chosen: that is your job.

Rules:

1. One or two sentences, under about 200 characters, plain words, name the pieces and squares.
2. Say **why**: what the move prepares, which threat it stops, what goes wrong without it, what a bait costs. Not what.
3. No jargon without a definition in the same sentence (tempo, outpost, initiative, prophylaxis, weak square, minority attack).
4. Name the sides ("White", "Black", "the knight"), never "we/you": a White and a Black course may both show the comment.
   When both sides' courses explain a move, write it as the side making the move would. British spelling. No
   exclamation marks, no emoji.
5. Note roughly half the learner's moves: every non-obvious one, each plan start, each prevention move, each bait and
   punishing reply. Obvious development in an explained sequence can be silent.
6. On a `?` move say what the mistake allows, concretely.
7. Be true: check claims on the board and with the engine. No "only move" or "winning" unless the engine agrees.
8. Own words. Never copy from paid or copyrighted courses or books, nor Wikibooks (CC BY-SA) without attribution.
9. Arrows/circles only where a picture saves words (at most two of each); also say the squares in words.

| Weak                                | Why                           | Better                                                                      |
| ----------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `Standard move.` / `The main idea.` | Says nothing                  | `Prepares d4: the pawn on c3 supports it, so White can take the centre.`    |
| `Prophylaxis against Bg4.`          | Jargon, no consequence        | `Stops ...Bg4, which would pin the knight on f3 to the queen.`              |
| `Attacks e5 and develops a piece.`  | Restates what the board shows | `Develops a piece and makes Black spend a move on e5.`                      |
| `Greedy.` (on `Nxe5?`)              | Does not say what it costs    | `Grabs a pawn and walks into ...Qg5, which hits the knight and g2 at once.` |

Read the result with `check-course.mts` (it prints the author and generated notes for every move).

## Position links

In any comment, course summary or plan, `[f7](r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -)` shows as dotted
bold text; hovering (or tapping) it puts that position on the board with a ring around the square. Use two to four where the
words refer to a square or position that is hard to picture ("the Fried Liver", "...Qg5"). Make the target with
`pnpm fen "1. e4 e5 2. Nf3 Nc6 3. Bc4"` (an EPD or FEN). The text outside the link must still read as plain English, because
searching and course cards show it without the link.

## Quizzes (quizzes.yaml)

A quiz is a review card: board at a position, a prompt, a typed answer, matched or missed. Format: `templates/quizzes.yaml`.
Two to four per course, about one per trap and per prevention move. Ask **why**, not "what is the next move"; the answer
should be two to eight words. Position = after the last move of `line` (SAN from move 1).

Matching (`packages/core/src/training/quiz.ts`): lowercase, punctuation to spaces, one plural `s` stripped from words over 3 letters,
synonyms collapsed to one word each, then **whole-word** containment. A group matches if any word is present; an entry
matches if all groups (`all: true`) or any group (default) matches; the first matching entry wins.

- Synonym families (a keyword and its family are interchangeable): lose = lose/drop/hang/en prise/undefended/unprotected/**free**;
  fork = fork/attacks two/double attack; attack = attack/hit/threaten/threat/target/chase/kick/tempo; defend =
  defend/protect/guard/support/cover; pin; check; mate = mate/checkmate/mating; develop; block = block/bury/shut in/trapped in;
  take = take/capture/**win**/won. Anything else (controls, stops, prevents, weak, trap) is NOT covered: list it.
- Notation is one token: `Qxf7+` becomes `qxf7`, so keyword `f7` does not match it; list `qxf7` too. Squares like `f7` match "f7".
- No negation ("does not attack" still matches `attack`), no order, no spelling tolerance (list `defence` and `defense`).
- Avoid keywords that appear in common wrong answers (`attack`, `take`, `piece`); use `all: true` with a specific group.
- `partial: true` on an entry: "close" answer, shows its feedback, graded as a miss. It cannot satisfy `examples.match`.
- `examples.match` (3+) must be accepted; `examples.miss` (3+, include a plausible wrong answer, a vague one, a negation)
  must not. Both are checked at build time.
- YAML: quote anything containing `: `; `keywords` is a list of lists; no apostrophes in keywords.
