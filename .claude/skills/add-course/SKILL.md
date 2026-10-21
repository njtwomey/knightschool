---
name: add-course
description: Use when adding or extending a Knight School course in content/white or content/black - a new course, a new line or trap, a quiz, a gambit, a position link, or checking a course's notes, tags or engine evaluation.
---

# Add a course to Knight School

A **course** is one side's answer to one trigger position: a folder under `content/white/<group>/` or `content/black/<group>/`
(the folder decides the side) holding `course.yaml`, `lines/*.pgn`, optional `traps/*.pgn` and `quizzes.yaml`. Its id is the
folder name. The build turns it into spaced-repetition cards and a browsable tree. The audience is a beginner (about 800 to 1600) who must learn **why** each move is played. `content/README.md` is the authoritative format; `CLAUDE.md` (Content)
is the short version.

Reference pages (read the one you need): `references/formats.md` (files, yaml, tags, card rules),
`references/writing.md` (choosing lines, explaining moves, quizzes, position links), `references/verify.md` (errors,
`course:eval`, gotchas). Templates are in `templates/`.

## The ideas that decide the design

1. **One side, one drilled answer per position.** Within a course, every position where the learner is to move has exactly one
   unmarked move. A second answer is a line with `alternative: true` (shown, never drilled). So three gambits that all start
   from `1.e4 e5` (King's, Vienna, Danish) cannot share one course: each is its **own course with a deep trigger** at the
   gambit move (`1. e4 e5 2. f4`), so nothing before the trigger is compared with other courses.
2. **Both sides of one opening.** Courses that share an `opening:` (an id in `content/openings.yaml`) are shown together. The
   opening says who plays it, so a course on that side is "playing it" and one on the other side is "against it". Write the
   other side as its own course under `black/` when it is wanted; do not mix colours in one folder.
3. **Group a course page with `section:`.** Give every line and trap a heading (`section: If Black takes the pawn`) and the
   course page groups by it instead of by kind. Use it when the kinds (main, sideline, trap) are not how a learner thinks.
4. **Reuse, never copy.** `from: <course id>` on a line takes that course's PGN for the same side (shown here, never drilled:
   its home course drills it). A line from the other colour cannot be reused (its unmarked alternatives would break rule 1).
   Transpositions already share positions, so no duplication is needed for them.
5. **Which positions earn cards** (`cardDefinitions`): main and gambit lines always; sidelines unless the explorer says too few
   games reach them (`content/popularity/popularity.json`, filled by `make popularity`); rare only with the setting;
   alternatives never; `for-us` traps never (they get quizzes); `against-us` traps yes.

## Work in place, or stage

- **Alone:** build the course directly at its place and iterate with the real tools (`pnpm content:build`, `make check`).
- **With other agents authoring at once:** work in `content/_staging/<id>/` (folders starting with `_` are never built or
  loaded), check it there, and the coordinator moves it in. In staging do **not** run `pnpm content:build` (it fails while any
  opening in `openings.yaml` has no course, and rewrites shared output).
- Always: one engine job at a time with `--threads 1` when the machine is shared. No commit, no push unless asked (the user
  decides). `pnpm` missing? `npx -y pnpm@12.11.2`. macOS `sed -i ''`; use Python for edits. No whole-repo formatters on content;
  format your own yaml with `pnpm exec prettier --write <file>` (PGN is prettier-ignored).

## Procedure

1. **Decide** side, group folder, trigger (as deep as the course's own idea), opening, tier (1 study first, 2 next,
   3 alternatives), and for each opponent reply which line (`main`, `sideline`, `rare`, `gambit`). Check what already exists:
   `grep -ril "<opening name>" content` and `content/openings.yaml`. If a Black or White course already answers the same
   position, agree with it (a warning, "X plays A but Y plays B", appears at `pnpm content:build` otherwise).
2. **Register** the opening if new: an entry in `content/openings.yaml` (`id`, `name`, `side` = who plays it, `eco`, `summary`,
   `moves` = SAN to the defining position), and the course in `content/curriculum.yaml` (study order and `prerequisites`, which
   must appear earlier in the list). Motif ids come from `content/motifs.yaml`; add a motif there only if it is genuinely new.
3. **Scaffold**: copy `templates/` (`course.yaml`, `line.pgn`, `trap.pgn`, `quizzes.yaml`) into the course folder and replace
   everything. Every PGN must be listed in `course.yaml` the moment it exists, or the whole loader fails. Write the
   introduction (`summary` plus `about: {idea, risks, origin?}`, writing.md) so a beginner knows what the opening is for.
4. **Lines**: most common reply first; every likely reply covered; main lines to move 10 to 12 ending with a comment that names
   the plan; sidelines to move 8; `( ... )` variations for the opponent's realistic alternatives (so the every-branch drill
   has branches); exactly one unmarked learner move per position; mistakes marked `?`/`?!`. Take the engine's preferred
   moves. Gambits may end a little worse (say so in `Risk` and the note), but never teach a line the engine calls lost.
5. **Tags** on every PGN (`Character`, `Risk`, `EarlyMate`, `Tricks`, `Themes`, optional `Kind`, which must equal
   course.yaml). Honest values: formats.md.
6. **Notes**: say _why_ on every non-obvious learner move, bait and punishing reply (writing.md). Where a position is hard to
   picture, add a **position link**: `[f7](<EPD or FEN>)` hovers to show that position on the board; `pnpm fen "1. e4 e5 2. f4"`
   prints the EPD. The build checks that the target is legal (not that it is the position you meant: regenerate with `pnpm fen`).
7. **Quizzes**: two to four on the best teaching moments, each with 3+ `examples.match` and 3+ `examples.miss`. Every
   `for-us` trap needs one.
8. **Check the course** until it prints `OK` (works on staging or the real folder, and understands `from:`):
   ```sh
   cp .claude/skills/add-course/templates/check-course.mts.txt "$SCRATCH/check-course.mts"
   KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/check-course.mts" content/<white|black>/<group>/<id>
   ```
   Read every note it prints as a beginner would; it flags `[no note]` on learner moves.
9. **Engine**: `pnpm course:eval --dir content/<...>/<id> --no-cache --depth 16 --lose 75 --threads 1` (a few minutes; run
   it in the background and read the output; do not poll with sleep). Fix findings by switching to the engine's move or
   shortening the line. Rerun a flagged gambit or trap at `--depth 18` before believing it.
10. **Whole repo** (alone, not in staging): `pnpm content:build` (opening and motif ids, curriculum, cross-course warnings), then
    `make check`; `scripts/content.test.ts` builds the real content. Read any warning that names your course.
11. **Afterwards, offer** (heavy, so ask): `pnpm analyse <id>` (native Stockfish at depth 24, committed) and, for the card
    threshold, `make popularity` (needs `LICHESS_TOKEN`; fills only the new positions).
12. **Report**: files, `opening:` id, tier and trigger, the lines and traps with the final eval of each, every departure from the
    plan because the engine disagreed, and anything unresolved.

## Definition of done

- [ ] The check script prints `OK`; `course:eval` prints `no findings`; `pnpm content:build` and `make check` are green.
- [ ] Every PGN is listed in `course.yaml`; ids are kebab-case and stable; the side matches the folder.
- [ ] Main line = the most common reply; every likely reply has a line or variation with a learner answer.
- [ ] One unmarked learner move per position; mistakes marked; `for-us` traps are real and end clearly better (+1.5).
- [ ] The opening is in `openings.yaml`, the course in `curriculum.yaml`, motifs exist.
- [ ] `about` has an `idea` and `risks` a beginner can follow, true to the engine; `origin` only if certain.
- [ ] Notes give reasons in plain words, no copied text, no undefined jargon; position links were made with `pnpm fen`.
- [ ] Quizzes have 3+ match and 3+ miss examples.
- [ ] Nothing left in a scratch folder that should be in the repo; nothing committed or pushed unasked.

## Do not

- Do not rename line ids or reorder `lines:` casually (file names appear in learner history).
- Do not teach two answers to one position in a course unless one is `alternative: true` or the trigger separates them.
- Do not invent tag values; do not change schema, vocabulary, explainers or the quiz matcher while adding content.
- Do not copy text from books, paid courses or Wikibooks. Do not edit `content/popularity/popularity.json` or `.env`.
