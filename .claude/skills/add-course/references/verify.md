# Verify: scratch check, build errors, course:eval, gotchas

## 1. Check in scratch (nothing shared is touched)

```sh
cp .claude/skills/add-course/templates/check-course.mts.txt "$SCRATCH/check-course.mts"
KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/check-course.mts" "$SCRATCH/<course-id>"
```

`$SCRATCH` is a directory outside the repo (in a Claude session: the scratchpad). The script builds the course exactly as
the real build does (same `buildOpening`), prints every move with its author and generated notes, flags `[no note]` on the
learner's moves, and ends with `OK <id>: N positions, M cards` or `FAILED: <file>: <message>`. Fix until OK.

Build errors always start with the file. The ones whose fix is not obvious:

- `two repertoire moves for the same position <epd>: A (x) vs B (y)`: two files (or a variation) teach different learner
  moves from one position. Keep one; mark the other `?`/`?!`. It can be caused by another file of the course.
- `two variants comment differently on the same move`: comment a shared move once.
- `... is against "X" but its family "Y" is not described in content/families.yaml`: needs a families.yaml entry (report it).
- `Nested mappings are not allowed ...` (no file name): an unquoted `: ` in a yaml value.
- `the answer "..." should match but does not` / `should not match but does`: adjust quiz keywords or examples.

## 2. Move it in, evaluate

```sh
mv "$SCRATCH/<course-id>" content/openings/<course-id>      # one mv: the shared loader never sees half a course
pnpm course:eval <course-id> --no-cache
```

Never run `pnpm content:build` (it deletes and rewrites the shared output folder). If `course:eval` fails with a build error
in ANOTHER course, wait a minute and retry. If a moved-in course fails, fix it in place quickly or `mv` it back to scratch.
(`pnpm exec vitest run scripts/content.test.ts` also builds all content; run it only if nobody is mid-edit.)

### course:eval

`pnpm course:eval [course[/variant] ...] [--depth 14] [--multipv 3] [--lose 100] [--line-floor -50] [--gambit-floor -150]
[--refute-min 150] [--quiet] [--no-cache]`. Stockfish 19 lite (the app's engine) run as a child process; scores are pawns from
**White's point of view**; "for you" is the learner's. Exit 1 on findings; 2 on usage or engine failure. It prints the
score after every move and flags:

| Finding                                                                                 | Threshold (reason)                                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| An unmarked learner move (including card moves in variations) costing at least `--lose` | 100 cp = one pawn, several times search noise; the same test the app uses for "mistake" |
| A line ending worse than `--line-floor` for the learner                                 | -50 cp; openings are about level, Black normally sits at 0 to -0.4                      |
| A line with `Character` including `gambit` ending worse than `--gambit-floor`           | -150 cp; a gambit may be down material for compensation                                 |
| A refutation ending below `--refute-min` for the learner                                | +150 cp; a trap must really win                                                         |

It also notes (no failure) opponent moves costing 100+ (expected in traps) and `?`/`??` moves the engine thinks cost under 50.
`--quiet` prints only flagged moves; `--depth 18` for traps and gambits before believing a result. Dubious-not-losing opponent
moves are not refutations (they fail the +1.5 test): file them under `lines/` with `?!`.

Concurrency: the shared cache `.cache/course-eval.json` is written atomically (temp file then rename) and merged, but when
other agents may be running use **`--no-cache`**, which neither reads nor writes it. First full run of a course takes seconds.

## Common mistakes

1. Lines from memory that the engine dislikes (drafts lost 100 to 700 cp): always run `course:eval`; end on a move the engine likes.
2. Two systems against one opening in a single course: make separate courses sharing a `family`.
3. `against` without a family entry in families.yaml (report it); unquoted colon in `name`.
4. A note that restates the move ("Attacks e5") instead of saying why; undefined jargon.
5. A dubious opponent move filed as a refutation; a trap that does not end clearly better.
6. A comment on a shared move in two files; a second unmarked learner move at one position.
7. Sideline replies with no learner answer (the branch drill ends there); first line not the most common reply.
8. Quiz keywords that miss notation (`qxf7`) or match wrong answers; no `examples.miss`.

## Native analysis

After authoring a course run `pnpm analyse <course-id>` (needs `brew install stockfish`; depth 24 on all cores, resumable).
It is far deeper than the in-browser engine, so use `course:eval` afterwards (it reads the stored results, printing "from
analysis") and trust it over a shallow JS run when judging gambits. The results are committed in
`content/analysis/analysis.json` and ship with the app. Authors running in parallel leave `--all` to the coordinator.

## Optional: Lichess data

Opening names and ECO come from the Lichess openings TSV (CC0) that the real build caches in `.cache/openings.tsv`; grep it for
the ECO and variation name. With a free `LICHESS_TOKEN` (never commit it) the real build adds explorer popularity, and sideline
cards reached in under 5 % of games at 1000 to 1600 are not introduced; no token means skipped. Authors running in parallel
do not run the build, so leave this to the coordinator. Sources: Lichess openings and puzzles are CC0; Wikibooks is CC BY-SA
(attribution and share-alike); never copy text from paid or copyrighted courses or books.

## Lessons from authoring the first batch

- Evaluation is noisy: a move can cost 100 cp at the default depth and nothing deeper. Before cutting a line the engine
  flags by a small margin, rerun with `--depth 18`. Scores wobble by about 10 cp, so lines ending within 10 cp of the floor
  are fragile.
- `course:eval` reads only `content/openings` (not a scratch folder) and fails for everyone while another course is
  half-moved-in. Retry after a minute. Use `&&` (not `;`) between a failed check and `mv`.
- A new line cannot add a second learner move where the course already has one (for example a Scotch Gambit next to the
  existing 4.Nxd4). Branch only on the opponent's moves, or make a separate course.
- A variation goes straight after the move it replaces. Two variations that reach the same position cannot comment the
  shared move differently: comment the first and leave the transposing move bare. Variation endings are not held to the
  end-of-line floor; only the main line's end and unmarked learner moves are.
- Every new file must be listed in `opening.yaml` the moment it exists, or the whole loader fails.
- A quiz `showMove` is played after the quiz position and must be legal from it. Omit it when unsure.
- macOS: `sed -i` needs `''` (use python for edits); in zsh loop with `${=var}`; keep `$SCRATCH` set in the same command.
