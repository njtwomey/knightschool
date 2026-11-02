---
name: add-content
description: Use when adding to or changing Knight School's chess content - a new opening, a line, a follow-up (an opponent's mistake and its punishment), a question, a step's text, or an opening's setup - whether migrated from v1 (.content/), written from a source (a YouTube transcript, a book, an article) or led by data (gaps on the map, the explorer's counts). Covers the model, the strategy for choosing moves, the pipeline commands and the checks.
---

# Adding content to Knight School

The learner is a beginner (about 1000 to 1600) who must learn **why** each move is played, and must meet in their
games what they learned. So every addition is decided by three things, in this order: **sound** (the engine), **what
the band plays** (the explorer's counts), **one plan** (the opening's own style). Text is ours, in plain British
English, verified, never copied.

Read first: `docs/v2/schemas/content.md` (the formats), `docs/v2/courses.md` (the bar an opening must meet, the
pipeline), `docs/v2/schemas/annotations.md` (comments, marks, refutations). This skill is the working procedure.

## The model in one screen

- `content/openings/<id>.yaml`: one opening for one side. `start` (where it begins), `setup` (title and text for the
  first step, the moves up to `start`), `about`, `ideas`, `variations` (each lists **lines** in teaching order, with an
  `intro` and optional `questions`), `steps` (titles and texts by step id `<line>:<n>`), `alternatives` (shown, never
  drilled), `sources`.
- `content/lines/<first move>/<line>.pgn`: one line, shared by any opening. Headers `For`, `Kind` (`main`, `sideline`,
  `rare`, `gambit`, `trap` you spring, `danger` against you), `Start "<line> <N.move>"` (where it branches off another
  line; the file holds only the moves after it), `Name` (display name). The file name is the id: never rename casually,
  learner history is keyed by position and move, but steps and links use it.
- **Steps** are cut automatically (about `teach.stepMoves` learner moves each); the setup is step 1. **Follow-ups** are
  derived, never written: every `?`/`??` variation (an authored refutation) and every reply the band plays at least
  `coverage.minShare` that the engine grades a mistake becomes one, hung off the step whose stretch reaches it. A
  follow-up's "why it is worth knowing" is its notes plus the evaluations, so **say what is won** in the notes.
- **One comment per move** across all lines (keyed by position and move), **one answer per position** within an
  opening (a second is a line in `alternatives`). A line may simply stop where it **transposes** into a position another
  line already teaches; the position graph carries on.

## Choosing the moves (the strategy)

1. **State the opening's plan** before writing a move, in one sentence (the Italian: quiet c3 and d3, castle, Re1 and
   Bb3, the d4 break when ready). Every learner move either serves it or is the reason it changes; prefer a move that
   transposes back into a line already taught.
2. **Engine first.** No learner move worse than an inaccuracy against the engine's best (`content:check` enforces). When
   two moves are close, take the one that fits the plan and that the band itself plays; say in the note when a stronger
   or sharper move exists ("4.Ng5 attacks f7 at once, but asks for a run of exact moves; 4.d3 needs none").
3. **Cover what the band plays.** Answer every reply played at least `coverage.minShare` (5%) of the time, to about
   move 10, most common first. A reply the data shows but the line does not answer is a gap: write a line, or list it
   as a known gap in your report.
4. **Punish what the band gets wrong.** Every common reply that loses material or more is an authored refutation:
   `( 5... Nxd4?? { why } 6. cxd4 exd4 7. Nxd4 { what is won } )`. It becomes a follow-up taught after the main line.
5. **Re-check every inherited choice against the data.** v1 met 4...d6 with 5.d3; the band plays 5.d4 61% of the time
   and the engine agrees, and after 5.d3 Black rarely transposes. Old content is a starting point, not an authority.

## Where content comes from

- **v1 (`.content/`, a read-only snapshot).** A course becomes one opening per side; `trigger` → `start`, `tier` →
  `level`, `motifs` → `ideas` (`content/ideas.yaml`), `quizzes.yaml` → `questions:` on a variation, `alternative: true`
  → `alternatives`. Traps: `for-us` → `Kind "trap"`, `against-us` → `Kind "danger"`. Drop v1's `Character`, `Risk`,
  `EarlyMate`, `Tricks`, `Themes`, `Opponent`, `ECO`, `Variation` headers. A v1 `( ... )` variation that is not a
  mistake becomes a line file of its own with `[Start]`; a mistake keeps its bracket, first move marked `?`/`??`. Rewrite
  every comment in the voice below and verify it; v1 text was written fast.
- **A source (video transcript, book, article).** Ideas, never text: rebuild the moves on a board (transcripts garble
  them: "night takes c6"), verify every claim with the engine (a "winning" trick may only win a pawn), write the notes
  fresh, credit it in the opening's `sources:` (title, url, author, what was taken). Where a move already has a comment,
  merge the new point into that one comment.
- **Data.** The opening's Map tab shows gaps (replies the band plays that nothing answers, with their share) and
  marks the band's mistakes. `make popularity` asks the explorer about positions not yet known; the helper below prints
  the band's replies anywhere.

## Writing

- Neutral voice ("White", "Black"), plain words, British spelling, no exclamation marks. Say **why**: what the move
  does, what it stops, what it prepares. One to three sentences.
- In a refutation, the mistake's note says why it looks tempting and why it fails; the punishment's last note says
  **concretely what is won** ("White is a knight up for a pawn"), or, when nothing material is won, what is (tempi, the
  centre) and that the gain is positional.
- Marks: `[%cal Gc3d4]` arrows, `[%csl Ye5]` squares; colours mean G idea or plan, R threat, Y target, B support. One to
  three where they say something.
- A step's `text` is two to four sentences: the idea of the stretch, not a list of its moves. The setup's text says how
  the opening comes about and why its first moves are played.

## The procedure

`SCRATCH` is the session scratchpad. Copy the helpers once:
`cp .claude/skills/add-content/templates/engine.mts.txt "$SCRATCH/engine.mts"` (and `replies.mts.txt` →
`replies.mts`).

1. **Scope.** Which opening, which replies. Look at the gaps (Map tab, or `node --import tsx "$SCRATCH/replies.mts"
"after 3...Nf6:e2e4 e7e5 g1f3 b8c6 f1c4 g8f6"`). `NO DATA` means the explorer was never asked: write the line
   first, then run `make popularity`.
2. **What exists.** `grep -rn "<move>" content/lines` and the opening's yaml: reuse lines, find the parent for `[Start]`,
   find the comment a shared move already has.
3. **Engine-check the candidates** before writing: `node --import tsx "$SCRATCH/engine.mts" 20 "name:<uci moves>" ...`
   (one engine, one thread; never two at once).
4. **Write the line(s)** in `content/lines/<first move>/`. PGN rules the build enforces: a bracketed variation comes
   **after the move it replaces** (Black's alternative after Black's move) and starts with a move marked `?` or `??`;
   numbering as in the game (`5... d6`); `[Start "giuoco-main 4.c3"]` names the parent and the move after which the
   line begins.
5. **List them** in the opening: a variation's `lines` (teaching order; most common first), a new variation with `id`,
   `name`, `intro` when it is a new decision for the learner, `steps` titles and texts for the new steps.
6. **Data and checks**, in this order: `npx -y pnpm@12.11.2 content:build` (formats), `make popularity` (the new
   positions; needs `LICHESS_TOKEN` in `.env`, never print it), `npx -y pnpm@12.11.2 analyse` (depth 24, one engine,
   resumable; long: run it in the background and say so), `content:build` again, `npx -y pnpm@12.11.2 content:check`
   (the authors and the engine must agree; a disagreement is either the content's mistake or a note to add), `make
puzzles` when puzzles should follow the new lines, `make check`.
7. **Report**: what was added and why each choice, what the data and engine said, the gaps left (replies above the share
   with no answer), and what the user should look at in the browser. Do not run browser play-throughs: the user checks
   the browser. Do not commit or push unless asked.

## The bar (docs/v2/courses.md)

An opening is ready when it answers every reply above `coverage.minShare` to about move 10, punishes the band's common
losing replies as follow-ups, has a verdict for the tempting wrong moves at each learner move, is engine-checked, has
five to eight variations of three to six steps with titles and texts, an introduction, notes on every move with
something to say, puzzles and Play on positions, and credits its sources. A migration can land below the bar if the
report says what is missing.
