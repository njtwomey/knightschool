# Verify: scripts, build errors, doctor, course:eval, gotchas

## 1. Look up the tree, check one course

```sh
cp .claude/skills/add-course/templates/tree-at.mts.txt "$SCRATCH/tree-at.mts"
cp .claude/skills/add-course/templates/check-course.mts.txt "$SCRATCH/check-course.mts"
KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/tree-at.mts" "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3"
KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/check-course.mts" content/courses/<course-id>
```

`$SCRATCH` is any directory outside the repo (in a Claude session: the scratchpad).

- `tree-at` plays the moves and prints, for each, the chapters that write it, its marks and its comment (or `NOT IN THE
TREE`), then every move the tree has from the last position, and the `[Start]` for a new chapter from there.
- `check-course` loads the course with `loadCourseAt` (the real build's code: `content/tree` plus the folder's own
  `tree/`), prints every listed line move by move with whose move it is, the author and generated notes and
  `(from <chapter>)` where other chapters write the move, flags `[no note]` on the learner's moves, and ends with
  `OK <id>: N positions, M cards` or `FAILED: <file>: <message>`. It does not know `openings.yaml`, `motifs.yaml`,
  `curriculum.yaml` or other courses; `pnpm content:build` checks those.

Build errors start with the file. The ones whose fix is not obvious:

- `[Start "..."] should name a chapter and one of its moves, like "evans-gambit 6.d4"`: write the move with its number,
  `6.d4` or `6...exd4`.
- `[Start] branches from "x", but there is no chapter of that name`: a typo in the chapter name.
- `[Start] branches after 5.c3 in "x", which does not write that move itself`: `x` only inherits it, or the number is
  wrong. Name the chapter `tree-at` lists as writing it.
- `[Start] is ambiguous: "x" writes 5.c3 in more than one place; give the moves before it too`: `[Start "x 4...Bxb4 5.c3"]`.
- `[Start] chapters branch from each other in a circle`: two chapters name each other, directly or not.
- `illegal move 6.d4`: the first move is not numbered from the `[Start]` position, or the `[Start]` is the wrong one.
- `the line id "x" is also used by <file>`: ids are unique across the tree; pick a new file name.
- `[For] must say which side the line is written for`: add `[For "white"]` or `[For "black"]`.
- `5.c3 is commented differently in <file>: "a" / "b". A move has one comment, wherever it is written.`: the move
  already has a comment. Drop yours (best: start your chapter after that move instead of retyping it) or improve the one
  comment in place, checking every course that passes there.
- `<course>/course.yaml: there is no line "x" in content/tree`: a typo, or a staged chapter checked without its folder.
- `no [Kind], and <course>/course.yaml does not give one` (or `[Opponent]`): add the header.
- `"x" is a trap and cannot be an alternative`; `lists only traps; a course needs at least one line`.
- `<course>: two repertoire moves for the same position <epd>: A (x) vs B (y). Mark the wrong one ?`: two listed lines
  (or a variation) teach different learner moves. Usual causes now: a line written for the other side, or one another
  course answers differently. List it with `alternative: true`, or drop it. Mark a move `?` only if it really is a
  mistake: the mark is seen by every course that passes there.
- `the main line does not pass through the trigger "..."`: the course's trigger is wrong, the line belongs to another
  course, or its `[Start]` parent reaches the position by a move order that skips the trigger position.
- `content/openings.yaml: "X" has no course`: an opening with no course yet. `... opening "X",
which is not in content/openings.yaml` or `motif "Y" is not in motifs.yaml`: add the entry.
- A position link error names the file and the bad target: regenerate it with `pnpm fen "<moves>"`.
- `Nested mappings are not allowed ...` (no file name): an unquoted `: ` in a yaml value.
- `the answer "..." should match but does not` / `should not match but does`: adjust quiz keywords or examples.

## 2. Whole repo, doctor and engine

```sh
pnpm content:build        # every chapter and course, opening and motif ids, curriculum, cross-course warnings
make doctor               # what overlaps: never fails
make check                # format, lint, typecheck, tests (scripts/content.test.ts builds the real content)
pnpm course:eval --dir content/courses/<course-id> --no-cache --depth 16 --lose 75 --threads 1
```

`course:eval` takes `<course-id>` for a course in `content/courses`, or `--dir <course folder>`.

`make doctor` sections: **moves written in more than one chapter** (start the later chapter after them; a new chapter of
yours should never appear here), **chapters no course lists** (list it or remove it), **lines in more than one course**
(intended or not: each drills it unless one lists it as `alternative`), and **courses for the same side that play
different moves** (often intended, as with gambits; say so in the report).

### course:eval

`pnpm course:eval [--dir <folder> | course[/line] ...] [--depth 14] [--multipv 3] [--lose 100] [--line-floor -50] [--gambit-floor -150]
[--refute-min 150] [--quiet] [--no-cache] [--threads N] [--wasm]`. The native Stockfish when installed (`STOCKFISH` or on PATH), else (or with `--wasm`)
Stockfish 19 lite run as a child process; scores are pawns from **White's point of view**; "for you" is the learner's (the
course's `side`, whoever the chapter was written for). Exit 1 on findings; 2 on usage or engine failure. It prints the
score after every move and flags:

| Finding                                                                                 | Threshold (reason)                                                                       |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| An unmarked learner move (including card moves in variations) costing at least `--lose` | 100 cp = one pawn, several times search noise; the same test the app uses for "mistake"  |
| A line ending worse than `--line-floor` for the learner                                 | -50 cp; openings are about level, Black normally sits at 0 to -0.4                       |
| A line with `Character` including `gambit` ending worse than `--gambit-floor`           | -150 cp; a gambit may be down material for compensation                                  |
| A `for-us` trap ending below `--refute-min` for the learner                             | +150 cp; a trap we spring must really win (against-us traps end badly for us, by design) |

It also notes (no failure) opponent moves costing 100+ (expected in traps) and `?`/`??` moves the engine thinks cost under 50.
`--quiet` prints only flagged moves; `--depth 18` for traps and gambits before believing a result. Dubious-not-losing opponent
moves are not for-us traps (they fail the +1.5 test): make them regular lines with `?!`. A line borrowed from the other
side is judged from this course's side, so its end may be flagged here and not in its home course: list it as
`alternative`, or pick another line.

Concurrency: when other agents may be running use **`--no-cache`** and `--threads 1`. A course takes a few minutes at
depth 16 on a busy machine: run it in the background and read the output when it finishes.

It also flags unmarked learner moves inside `( ... )` variations that end on a learner card: end a variation before a learner
move you have not verified, or mark it.

## Common mistakes

1. Lines from memory that the engine dislikes (drafts lost 100 to 700 cp): always run `course:eval`; end on a move the engine likes.
2. Retyping moves the tree already has instead of starting after them (`make doctor` shows it); a `[Start]` that names a
   chapter which only inherits the move.
3. Two answers for the same side to one position in a course: mark one `alternative: true` or put it in a variation.
4. An `opening` or `motif` id missing from openings.yaml or motifs.yaml (add it); unquoted colon in `name`.
5. A note that restates the move ("Attacks e5") instead of saying why; undefined jargon; "we" or "you" in a comment that
   both sides' courses read.
6. Writing a comment on a shared move without reading the one it has; marking a move `?` that another course plays.
7. A dubious opponent move filed as a `for-us` trap; a trap that does not end clearly better; `[Kind]` written from the
   wrong side's view (it follows `[For]`).
8. Sideline replies with no learner answer (the branch drill ends there); first line not the most common reply.
9. Quiz keywords that miss notation (`qxf7`) or match wrong answers; no `examples.miss`.

## Native analysis

After authoring a course run `pnpm analyse <course-id>` (needs `brew install stockfish`; depth 24 on all cores, resumable).
It is far deeper than the in-browser engine, so use `course:eval` afterwards (it reads the stored results, printing "from
analysis") and trust it over a shallow JS run when judging gambits. The results are committed in
`content/analysis/analysis.json` and ship with the app. Authors running in parallel leave `--all` to the coordinator.

## Lichess data

Opening names and ECO come from the Lichess openings TSV (CC0) that the build caches in `.cache/openings.tsv`; grep it for the
ECO and variation name. Popularity is **not** fetched by the build: it is read from the committed
`content/popularity/popularity.json`, which `make popularity` fills (needs `LICHESS_TOKEN` in `.env`, resumable, hours on a
first run). A new course's positions have no popularity until that is run, so its sidelines all get cards meanwhile. Never
edit that file or read `.env`. Sources: Lichess openings and puzzles are CC0; Wikibooks is CC BY-SA; never copy paid courses.

## Lessons from authoring

- Evaluation is noisy: a move can cost 100 cp at the default depth and nothing deeper. Before cutting a line the engine
  flags by a small margin, rerun with `--depth 18`. Scores wobble by about 10 cp, so lines ending within 10 cp of the floor
  are fragile.
- A new line cannot add a second learner move where the course already has one (for example a Scotch Gambit next to the
  existing 4.Nxd4). Branch only on the opponent's moves, make it `alternative: true`, or make a separate course with a deeper
  trigger (how the gambit courses avoid clashing: King's, Vienna and Danish each start after their own gambit move). The
  tree itself can hold both; only the course has to choose.
- A variation goes straight after the move it replaces. Variation endings are not held to the end-of-line floor; only the
  main line's end and unmarked learner moves are.
- The moves before a chapter's `[Start]` come with the parent's comments: do not comment them again, and read them in
  `check-course` output, because the learner of your course sees them too.
- A quiz `showMove` is played after the quiz position and must be legal from it. Omit it when unsure.
- macOS: `sed -i` needs `''` (use python for edits); in zsh loop with `${=var}`; keep `$SCRATCH` set in the same command.
- Cards are per course, so a line two courses drill is asked twice; `alternative: true` in one of them avoids that.
