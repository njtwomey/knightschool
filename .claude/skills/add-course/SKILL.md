---
name: add-course
description: Use when adding or extending a Knight School course in content/white or content/black - a new course, a new line or trap, a quiz, or checking a course's tags, notes or engine evaluation.
---

# Add a course to Knight School

A **course** is one side's answer to one trigger position: `content/white/...` or `content/black/...`, a folder with
`course.yaml`, `lines/*.pgn`, optional `traps/*.pgn` and `quizzes.yaml`. The build turns it into spaced-repetition cards.
The audience is a beginner (about 800 to 1600) who must learn **why** each move is played. Gambits, traps and sidelines are
branches inside the course where they arise, never courses of their own. `content/README.md` is the authoritative format;
`docs/CURRICULUM.md` says which courses exist and why.

Reference pages (read the one you need): `references/formats.md` (files, yaml, tags, card rules),
`references/writing.md` (choosing lines, explaining moves, quizzes), `references/verify.md` (errors, course:eval, mistakes).
Templates in `templates/`.

## Rules for parallel work (many agents author at once)

- Write the course in a **scratch directory** first (`$SCRATCH/<course-id>/`), check it there, then `mv` the whole directory
  into its place under `content/white/...` or `content/black/...` in one command, so the shared loader never sees half a course.
- **Never run `pnpm content:build`** (it recreates the shared output folder). Never edit another course. Never edit
  `content/openings.yaml`, `curriculum.yaml` or `motifs.yaml` when told "report, don't edit": give the entries in your report.
- Evaluate with `pnpm course:eval <course-id> --no-cache`. If it fails because ANOTHER course is broken, wait a minute and retry.
- Do not commit or push, add dependencies, run whole-repo formatters, or rename ids. Format only your own yaml.
- `pnpm` missing? use `npx -y pnpm@12.11.2`. macOS `sed -i` needs `''`; use python for edits.

## Procedure

1. **Decide**: the course's side, trigger position, opening, tier, and for each opponent reply which line (kind: main,
   sideline, rare or gambit). Where theory offers three good moves, teach one; others go in a variation or an `alternative` line.
2. **Scaffold** in scratch:
   ```sh
   mkdir -p $SCRATCH/<id>/lines $SCRATCH/<id>/traps
   cp .claude/skills/add-course/templates/course.yaml $SCRATCH/<id>/
   cp .claude/skills/add-course/templates/line.pgn $SCRATCH/<id>/lines/<file>.pgn
   ```
   Also `trap.pgn` and `quizzes.yaml` if needed. The templates are a valid mini course: replace everything.
3. **course.yaml**: name, side, opening, tier, trigger, summary, plans, motifs, tags, `lines` (first = main line, each with
   `opponent` and `kind`), `traps` (each `for-us` or `against-us`). Quote values with colons.
4. **Lines**: most common reply first, every likely reply covered, main lines to move 10 to 12, sidelines to move 8, exactly one
   unmarked learner move per position. Mark mistakes `?`/`?!`. Every `main` line ends with a comment naming the plan. Use the
   engine's preferred moves (step 8).
5. **Tags** on every PGN (Character, Risk, EarlyMate, Tricks, Themes). Choose honestly: formats.md.
6. **Notes**: explain _why_ on every non-obvious learner move, every bait and punishing reply (writing.md has the rules).
7. **Quizzes**: two to four on the best teaching moments, with `examples.match` and `examples.miss`. Each `for-us` trap needs
   one, because it produces no move cards.
8. **Check in scratch**, then fix until it prints `OK`:
   ```sh
   cp .claude/skills/add-course/templates/check-course.mts.txt "$SCRATCH/check-course.mts"
   KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/check-course.mts" "$SCRATCH/<id>"
   ```
   Read every note it prints as a beginner would.
9. **Move in and evaluate**:
   ```sh
   mv $SCRATCH/<id> content/<white|black>/<path>/<id>
   pnpm course:eval <id> --no-cache
   ```
   Fix findings (follow what the engine prefers) by editing in place, then rerun. If the build says your `opening` or `motif` is
   missing from openings.yaml or motifs.yaml, that is expected until the coordinator adds it.
10. **Report**: files created; the openings.yaml, curriculum.yaml and motifs.yaml entries needed; the course:eval result (paste the
    tail); anything you could not resolve.

## Definition of done

- [ ] Check script prints `OK`; `pnpm course:eval <id> --no-cache` prints `no findings`.
- [ ] Every PGN is listed in course.yaml; ids are kebab-case; the side matches the folder.
- [ ] Main line = the most common reply; every likely reply has a line or variation with a learner answer.
- [ ] One unmarked learner move per position; mistakes marked; for-us traps are real and end clearly better.
- [ ] Tags honest; notes give reasons in plain words, no copied text, no undefined jargon.
- [ ] Quizzes have 3+ match and 3+ miss examples.
- [ ] Nothing left in the scratch directory that should be in the repo; nothing else touched.

## Do not

- Do not rename ids, or reorder `lines:` casually.
- Do not put two systems for the same side in one course unless one is `alternative: true`.
- Do not invent tag values; do not change schema, vocabulary, explainers or the matcher while adding content.
- Do not copy text from books, paid courses or Wikibooks.
- Do not run `pnpm content:build`, commit, push, or touch files outside your course.
