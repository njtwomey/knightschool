---
name: add-content
description: Use when adding to or changing Knight School's chess content - a new opening, a line, a follow-up (an opponent's mistake and its punishment), a question, a step's text, or an opening's setup - whether migrated from v1 (.content/), written from a source (a YouTube transcript, a book, an article) or led by data (gaps on the map, the explorer's counts). Covers the model, the strategy for choosing moves, the pipeline commands and the checks.
---

# Adding content to Knight School

The mental model is in `CLAUDE.md`, under Content: who the learner is, the three tests (sound, what the band plays, one
plan), breadth first. This skill is the working procedure and says only how.

Read first: `docs/v2/making-openings.md` (what an opening must be, how much to write, link lines),
`docs/v2/schemas/content.md` (the formats), `docs/v2/schemas/annotations.md` (comments, marks, refutations).

## The model in one screen

- `content/openings/<id>.yaml`: one opening for one side. `start` (where it begins: required and one run of moves, so two first moves are two
  openings; for Black, it includes Black's first move, so the setup step exists), `setup` (title and text for the
  first step, the moves up to `start`), `about`, `ideas`, `variations` (each lists **lines** in teaching order, with an
  `intro` and optional `questions`), `steps` (titles and texts by step id `<line>:<n>`), `alternatives` (shown, never
  drilled), `sources`.
- `content/lines/<first move>/<opening>/<variation>/<line>.pgn`: one line, shared by any opening. Headers `For`, `Kind` (`main`, `sideline`,
  `rare`, `gambit`, `trap` you spring, `danger` against you), `Start "<line> <N.move>"` (where it branches off another
  line; the file holds only the moves after it), `Name` (display name). The file name is the id: never rename casually,
  learner history is keyed by position and move, but steps and links use it.
- **Steps** are cut automatically (about `teach.stepMoves` learner moves each); the setup is step 1. **Follow-ups** are
  derived, never written: every `?`/`??` variation (an authored refutation) and every reply the band plays at least
  `coverage.minShare` that the engine grades a mistake becomes one, hung off the step whose stretch reaches it. A
  follow-up's "why it is worth knowing" is its notes plus the evaluations, so **say what is won** in the notes.
- **Names:** a line's id is its file name, unique across every opening whatever folder it is in. A name that starts
  with a move carries its opening's name (`caro-nf3-e6`, not `nf3-e6`), even if a little redundant. `make doctor` checks
  this, name clashes, and lines no opening lists. So choose a prefix that does not read like a move: `open-`, not `e5-`.
- **One comment per move** across all lines (keyed by position and move), **one answer per position** within an
  opening (a second is a line in `alternatives`). A line may simply stop where it **transposes** into a position another
  line already teaches; the position graph carries on.
- **Transpositions count as the same move.** A note is keyed by position and move, so the same move reached by another
  order must stay bare in the second line (the build refuses it otherwise; the first opening to comment on 1.e4 owns
  that note). Put the "this is the main line by another order" remark on the move before it. And a band reply that only
  walks into a known position is not an edge until a line plays it: a one-move link line (`2. Nf3 d5 3. Nc3 *`, with
  `[Start]`) closes the gap on the map and adds no step. Whether it is worth one is in `making-openings.md`.
- **Notes across sides and openings.** A note is shared by every opening that reaches it, whichever side reads it, so write
  notes in the neutral voice and read inherited ones from your side. `For` is not checked against the opening's side:
  a White line can be listed for Black, and its `Kind` flips (`danger` shows as a trap to spring). A `[Start]` prefix
  drops its parent's notes unless the parent is listed in the opening, so list it, in `alternatives` if it is not drilled.

## Choosing the moves (the strategy)

1. **Choose the system with the numbers.** Where the learner's side has a choice, set out each candidate's share, score
   at the band and evaluation, and pick one plan, as `making-openings.md` says. A system that splits into many plans
   loses to one that keeps a single set-up, even with a better evaluation.
2. **State the opening's plan** before writing a move, in one sentence (the Italian: quiet c3 and d3, castle, Re1 and
   Bb3, the d4 break when ready). Every learner move either serves it or is the reason it changes; prefer a move that
   transposes back into a line already taught.
3. **Engine first.** No learner move graded inaccuracy or worse against the engine's best (`content:check` flags them):
   near equality that is a drop of about half a pawn (0.1 in winning chances). When two moves are close, take the one
   that fits the plan and that the band itself plays; say in the note when a stronger or sharper move exists ("4.Ng5
   attacks f7 at once, but asks for a run of exact moves; 4.d3 needs none").
4. **Cover what the band plays,** most common first, until the size in `making-openings.md` runs out. A reply the data
   shows but the lines do not answer is a gap to list in your report.
5. **Punish what the band gets wrong.** Every common reply that loses material or more is an authored refutation:
   `( 5... Nxd4?? { why } 6. cxd4 exd4 7. Nxd4 { what is won } )`. It becomes a follow-up taught after the main line. A
   `?` must cost at least an inaccuracy on the engine (`content:check` says so when it does not): a move that only
   costs a little is a line, not a refutation. The band's mistakes you did not write still become follow-ups from the
   engine's line; where that line wins no material, `content:check` asks for an authored refutation with a note.
6. **Re-check every inherited choice against the data.** v1 met 4...d6 with 5.d3; the band plays 5.d4 61% of the time
   and the engine agrees, and after 5.d3 Black rarely transposes. Old content is a starting point, not an authority.
7. **Keep the shape.** Every line with one new learner move is a step of its own, so a one-move line is a one-move step.
   Prefer one longer line to several short ones. A line whose moves are all taught already makes no step: list a
   transposition after the line that teaches its target.
8. **Check how the band actually punishes you.** A low score for White at a move is a sign to look deeper: the London's
   6.Qc2 Bf5 scores 36% because 7.Qxf5 walks into ...Qxb2. Such a trap is a `?`/`??` refutation of your own move.

## Where content comes from

- **v1 (`.content/`, a read-only snapshot).** A course becomes one opening per side; `trigger` → `start`, `tier` →
  `level`, `motifs` → `ideas` (`content/ideas.yaml`), `quizzes.yaml` → `questions:` on a variation, `alternative: true`
  → `alternatives`. Traps: `for-us` → `Kind "trap"`, `against-us` → `Kind "danger"`. Drop v1's `Character`, `Risk`,
  `EarlyMate`, `Tricks`, `Themes`, `Opponent`, `ECO`, `Variation` headers. A v1 `( ... )` variation that is not a
  mistake becomes a line file of its own with `[Start]`; a mistake keeps its bracket, first move marked `?`/`??`. Rewrite
  every comment in the voice below and verify it; v1 text was written fast.
- **A video or transcript that becomes an opening.** Expect heavy overlap with what exists: reuse a line that already
  teaches the same moves (one comment per move; merge the new point into it) rather than writing a second copy, and a new
  opening can list existing lines. Credit the source.
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
`replies.mts`, `explore.mts.txt` → `explore.mts`, `gaps.mts.txt` → `gaps.mts`, `precheck.mts.txt` → `precheck.mts`). Moves
in SAN or UCI; an illegal move list says where it fails.

**One engine and one explorer client at a time, machine-wide** (several agents may be authoring). Wrap every command
that runs Stockfish (`engine.mts`, `pnpm analyse`) or asks the explorer (`explore.mts`, `make popularity`):
`until mkdir /private/tmp/claude-501/ks-engine.lock 2>/dev/null; do sleep 15; done; <command>; rmdir
/private/tmp/claude-501/ks-engine.lock`, and wait while `pgrep -x stockfish` finds one. Remove the lock only in the same command that took it, never by hand or while cleaning up: another agent may hold it. Stopping: Ctrl-C (`kill -INT`)
saves `analyse` and `popularity`, which resume where they left off.

Several agents can write openings at once, two or three at most, each with `templates/agent-brief.md`. See **Working
alongside others** below.

1. **Scope.** Which opening, which replies. Look at the gaps (Map tab, or `node --import tsx "$SCRATCH/replies.mts"
"after 3...Nf6:e2e4 e7e5 g1f3 b8c6 f1c4 g8f6"`). `NO DATA` means the explorer was never asked: ask it live with
   `node --env-file-if-exists=.env --import tsx "$SCRATCH/explore.mts" "d4 d5 Bf4"` (cached beside the script), or
   write the line first and run `make popularity`.
2. **What exists.** `grep -rn "<move>" content/lines` and the opening's yaml: reuse lines, find the parent for `[Start]`,
   find the comment a shared move already has.
3. **Engine-check the candidates** before writing: `node --import tsx "$SCRATCH/engine.mts" 20 "name:<uci moves>" ...`
   (one engine, one thread; never two at once).
4. **Write the line(s)** in `content/lines/<first move>/<opening>/<variation>/` (folders are only for finding things; the id is
   the file name; a line shared by two openings stays with the first that lists it). PGN rules the build enforces: a bracketed variation comes
   **after the move it replaces** (Black's alternative after Black's move) and starts with a move marked `?` or `??`;
   numbering as in the game (`5... d6`); `[Start "giuoco-main 4.c3"]` names the parent and the move after which the
   line begins. A refutation shows `judge.refutationPlies` moves after the mistake, so end it within that on your own
   move and put what is won there. One comment per move also holds across transpositions: the same move from the same
   position in two lines carries a note in only one. A shared checkout builds every line and opening file, so stage a large change
   outside `content/` and copy it in at once, and write an opening's yaml in one go. `gaps.mts` shows what the tree leaves unanswered; `precheck.mts` catches
   weak moves before the long analysis. The build does not check a `#` or `+` you write, so a mate in a note or a
   refutation must be proved first (`engine.mts` prints `#n`): a `Qf7#` that was only a check got through it.
5. **List them** in the opening: a variation's `lines` (teaching order; most common first), a new variation with `id`,
   `name`, `intro` when it is a new decision for the learner, `steps` titles and texts for the new steps.
6. **Data and checks**, in this order: `npx -y pnpm@12.11.2 content:build` (formats), `make popularity` (the new
   positions; needs `LICHESS_TOKEN` in `.env`, never print it), `npx -y pnpm@12.11.2 analyse --opening <id> --minutes 15`
   again until it says done (one engine, resumable; run it in the background), `content:build` again,
   `npx -y pnpm@12.11.2 content:check` (the authors and the engine must agree; a disagreement is either the content's
   mistake or a note to add), `make doctor`, `make puzzles`, `make check`. Size the analysis before starting: every
   position of the tree plus the band's replies at `coverage.analyseShare` or more comes to about four positions for every
   position in the opening, at roughly 3 seconds each at depth 18 and 30 at depth 24. Stay at `engine.bakedDepth` unless
   asked to go deeper. `content:check` may end by saying some positions lack analysis: a position that is already mate is
   never searched, so those are harmless, and any other is not. After a full pass it also names every engine follow-up
   that wins nothing on the board: write those as refutations with a note, one by one (the Italian had ten).
7. **Report**: what was added and why each choice, what the data and engine said, the gaps left (replies above the share
   with no answer), and what the user should look at in the browser. Do not run browser play-throughs: the user checks
   the browser. Do not commit or push unless asked.

## Working alongside others

What changes when several agents share the checkout. The lead runs the agents, commits and pushes; agents write one
opening each.

- **The engine and the explorer stay one at a time**, under the lock above, however many agents run. Long analysis goes in
  chunks (`--minutes 15`), so others get a turn.
- **Agents do not run `make puzzles`**, which rewrites every opening's file. The lead runs it once, after the agents stop.
- **Shared files:** `content/ideas.yaml` and `content/tracks.yaml` are append only; re-read them right before editing.
  Never edit another opening's lines or comments.
- **Judge only your own opening.** `content:check` and `make check` may show another agent's unfinished work.
- **The lead commits one opening at a time**: its yaml and line folder, and `tracks.yaml` staged with only that opening's
  entry, so nothing unfinished lands. `analysis.jsonl` and `popularity.jsonl` can go with any commit: extra rows are unused.
- **Before a push, check a clean copy of the commit**, not the working tree, when unfinished work is in it:
  `git archive HEAD | tar -x -C <scratch folder>`, then install, `content:build`, `content:check`, `make check` and
  the build there.
- **Stopping early:** an agent finishes its chunk, releases the lock, leaves `content:build` passing, and writes
  `docs/progress-v2/<opening>.md` with what is done, what is left, the commands to resume, and its decisions and gaps.

## Is it finished?

The standard is in `docs/v2/making-openings.md`: the first pass is what ships, and a migration or a thin opening says in
its report what is missing.
