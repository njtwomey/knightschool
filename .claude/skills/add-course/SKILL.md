---
name: add-course
description: Use when adding or extending a Knight School course (an opening) in content/openings - a new course, a repertoire against an opening, a new line, trap/refutation or quiz, or when checking a course's tags, notes or engine evaluation.
---

# Add a course to Knight School

A course normally goes in `content/openings/<id>/`. A **motif** (a named position or idea that belongs to no opening, like the Traxler or Fried Liver) goes in `content/motifs/<id>/` with the same files and no `family`/`against`; the directory marks it. Both directories are read by the build and by `pnpm course:eval`.

A **course** is one opening for one learner side: a few lines (PGN), optional traps (`refutations/`) and optional quizzes, in
`content/openings/<course-id>/`. The build turns it into spaced-repetition cards. The audience is a beginner who must learn
**why** each move is played. Courses are grouped under **openings** (families) in `content/families.yaml`.

Reference pages (read the one you need): `references/formats.md` (files, yaml, families, PGN, tags, card rules),
`references/writing.md` (choosing lines, explaining moves, quizzes), `references/verify.md` (errors, course:eval, mistakes).
Templates in `templates/`.

## Rules for parallel work (many agents author at once)

- Write the course in a **scratch directory** first (`$SCRATCH/<course-id>/`), check it there, then `mv` the whole directory
  into `content/openings/` in one command, so the shared loader never sees half a course.
- **Never run `pnpm content:build`** (it recreates the shared output folder). Never edit another course. Never edit
  `content/families.yaml` when told "report, don't edit": give the entry in your report instead.
- Evaluate with `pnpm course:eval <course-id> --no-cache`. If it fails because ANOTHER course is broken, wait a minute and retry.
- Do not commit or push, add dependencies, run whole-repo formatters, or rename ids. Format only your own yaml.
- `pnpm` missing? use `npx -y pnpm@12.11.2`.

## Procedure

1. **Decide** (ask the user only what is unclear): opening and ECO, learner side, which replies/systems, which traps, the
   family. If it is a repertoire _against_ an opening, each system is its own course (`against:`), see formats.md.
2. **Scaffold** in scratch:
   ```sh
   mkdir -p $SCRATCH/<id>/lines $SCRATCH/<id>/refutations
   cp .claude/skills/add-course/templates/opening.yaml $SCRATCH/<id>/
   cp .claude/skills/add-course/templates/line.pgn $SCRATCH/<id>/lines/<variant>.pgn
   ```
   Also `refutation.pgn` and `quizzes.yaml` if needed. The templates are a valid mini Vienna course: replace everything.
3. **opening.yaml**: name, eco, side, level `beginner`, two-sentence summary, tags, `family` (and `against`), `lines` (first =
   main line), `refutations` (`[]` if none). Quote values with colons.
4. **Lines**: most common reply first, every likely reply covered, stop around move 10 to 12, exactly one unmarked learner move
   per position. Mark mistakes `?`/`?!`. Use the engine's preferred moves (step 8).
5. **Tags** on every PGN (Character, Risk, EarlyMate, Tricks, Themes; `Refutes` for traps). Choose honestly: formats.md.
6. **Notes**: explain _why_ on every non-obvious learner move, every bait and punishing reply (writing.md has the rules).
7. **Quizzes**: two to four on the best teaching moments, with `examples.match` and `examples.miss`.
8. **Check in scratch**, then fix until it prints `OK`:
   ```sh
   cp .claude/skills/add-course/templates/check-course.mts.txt "$SCRATCH/check-course.mts"
   KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/check-course.mts" "$SCRATCH/<id>"
   ```
   Read every note it prints as a beginner would.
9. **Move in and evaluate**:
   ```sh
   mv $SCRATCH/<id> content/openings/<id>
   pnpm course:eval <id> --no-cache
   ```
   Fix findings (follow what the engine prefers) by editing the files in place, then rerun. A fix that changes
   the idea of a line means rewriting its notes too. If the build says your `family`/`against` is missing from families.yaml,
   that is expected until the coordinator adds your entry.
10. **Report**: files created; the families.yaml entry if a new family is needed (`templates/families.yaml`); course:eval result
    (paste the tail); anything you could not resolve.

## Definition of done

- [ ] Check script prints `OK`; `pnpm course:eval <id> --no-cache` prints `no findings`.
- [ ] `[Opening]` equals `name` in every PGN; every PGN is listed; ids are kebab-case.
- [ ] Main line = the most common reply; every likely reply has a line or variation with a learner answer.
- [ ] One unmarked learner move per position; mistakes marked; refutations are real traps with `Refutes`, ending clearly better.
- [ ] Tags honest; notes give reasons in plain words, no copied text, no undefined jargon.
- [ ] Quizzes have 3+ match and 3+ miss examples.
- [ ] `family` set and, for `against` courses, the families.yaml entry exists or is in your report.
- [ ] Nothing left in the scratch directory that should be in the repo; nothing else touched.

## Do not

- Do not rename ids, or reorder `lines:` casually.
- Do not put two systems against one opening in one course; do not file a dubious move as a refutation.
- Do not invent tag values; do not change schema, vocabulary, explainers or the matcher while adding content (that needs
  `content/README.md`, the Zod enum and `docs/PLAN.md` updated together).
- Do not copy text from books, paid courses or Wikibooks.
- Do not run `pnpm content:build`, commit, push, or touch files outside your course (and `content/families.yaml` only when allowed).
