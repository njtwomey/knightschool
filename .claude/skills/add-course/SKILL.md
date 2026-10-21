---
name: add-course
description: Use when adding or extending Knight School content - a new course in content/courses, a new line or trap (a chapter in content/tree), a quiz, a gambit, a position link, or checking a course's notes, tags or engine evaluation.
---

# Add a course to Knight School

Content is one **theory tree** and **courses** that select lines from it. The tree (`content/tree/<first move>/<opening
family>/<line>.pgn`) holds every move we teach, for both sides, split into **chapters**: one PGN per line, written from
the point where it branches off another chapter (`[Start]`). A chapter's file name is the line's id, unique across the
whole tree. A **course** (`content/courses/<id>/`, id = folder name) is `course.yaml` (side, trigger, introduction,
plans, and the line ids it teaches in order) plus an optional `quizzes.yaml`. The build rebuilds each listed line from
move 1 and merges a course's lines into the course's own tree, which becomes spaced-repetition cards and a browsable
tree. The audience is a beginner (about 800 to 1600) who must learn **why** each move is played. `content/README.md` is
the authoritative format; `CLAUDE.md` (Content) is the short version.

Reference pages (read the one you need): `references/formats.md` (layout, chapters, course.yaml, tags, card rules),
`references/writing.md` (choosing lines, explaining moves, quizzes, position links), `references/verify.md` (scripts,
errors, `make doctor`, `course:eval`, gotchas). Templates are in `templates/`.

## The ideas that decide the design

1. **Each move is written once.** The tree is shared by every course and both sides: the Black Open Games chapter
   `evans-gambit` writes 4.b4 and 5.c3, and the White Evans chapters branch off it. Before writing a line, find what the
   tree already has (`tree-at`, below) and start the new chapter with `[Start "<chapter> <move>"]` after the last move it
   already writes. A move has **one comment** across the whole tree, and its marks (`?`, `!`) are shared too, so comments
   are neutral ("White", "Black", never "we") and you read the existing one before writing on a move.
2. **One side, one drilled answer per position, per course.** Within a course every position where the learner is to move
   has exactly one unmarked move. A second answer is a line listed with `alternative: true` (shown, never drilled). The
   tree itself may hold several (after 1.e4 e5: 2.Nf3, 2.f4, 2.Nc3); each course picks one. So three gambits from `1.e4 e5`
   (King's, Vienna, Danish) are three courses, each with a **deep trigger** at the gambit move (`1. e4 e5 2. f4`).
3. **A course lists lines; it does not own them.** Any course can list any line by id: another course's, or one written
   for the other side. Just list it. Cards are per course, so a drilled line listed in two courses is asked twice; list it
   with `alternative: true` to show it without drilling (how `vs-pawn-gambits` gathers the Black gambit lines). A line
   written for the other side usually needs `alternative: true`, because its variations are your side's different
   choices. A trap listed by a course of the other side flips: `for-us` becomes `against-us`.
4. **Both sides of one opening.** Courses that share an `opening:` (an id in `content/openings.yaml`) are shown together.
   The opening says who plays it, so a course on that side is "playing it" and one on the other side is "against it".
   `section:` on `lines:` entries groups the course page when kinds (main, sideline, trap) are not how a learner thinks.
5. **Which positions earn cards** (`cardDefinitions`): main and gambit lines always; sidelines unless the explorer says too
   few games reach them (`content/popularity/popularity.json`, filled by `make popularity`); rare only with the setting;
   alternatives never; `for-us` traps never (they get quizzes); `against-us` traps yes (the move that avoids them).

## Where to work

- Write chapters straight into `content/tree/<first move>/<family>/` and the course into
  `content/courses/<id>/`; iterate with the check script, `pnpm content:build` and `make doctor`.
- **With other agents authoring at once:** chapters are separate files, so write your own and do not edit another
  chapter's moves or comments without saying so (other courses read them). Two courses may need the same `course.yaml` or
  `curriculum.yaml` lines; agree who edits them.
- Always: one engine job at a time with `--threads 1` when the machine is shared. No commit, no push unless asked (the user
  decides). `pnpm` missing? `npx -y pnpm@12.11.2`. macOS `sed -i ''`; use Python for edits. No whole-repo formatters on content;
  format your own yaml with `pnpm exec prettier --write <file>` (PGN is prettier-ignored).

Two helper scripts live in `templates/` (copy each to the session scratchpad, `$SCRATCH`, once):

```sh
cp .claude/skills/add-course/templates/tree-at.mts.txt "$SCRATCH/tree-at.mts"
cp .claude/skills/add-course/templates/check-course.mts.txt "$SCRATCH/check-course.mts"
KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/tree-at.mts" "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4"
KS_ROOT="$PWD" pnpm exec tsx "$SCRATCH/check-course.mts" content/courses/<id>
```

`tree-at` prints who writes each move, its marks and comment, what the tree plays next, and the `[Start]` for a new
chapter there. `check-course` builds one course as the real build does.

## Procedure

1. **Decide** side, trigger (as deep as the course's own idea), opening, tier (1 study first, 2 next, 3 alternatives), and
   for each opponent reply which line (`main`, `sideline`, `rare`, `gambit`). Check what already exists:
   `ls content/courses`, `content/openings.yaml`, `grep -ril "<opening name>" content/tree`, and `tree-at` along the
   trigger to see the lines the tree already has from there. If another course for either side answers the same
   positions, agree with it (`pnpm content:build` warns otherwise).
2. **Register** the opening if new: an entry in `content/openings.yaml` (`id`, `name`, `side` = who plays it, `eco`, `summary`,
   `moves` = SAN to the defining position), and the course in `content/curriculum.yaml` (study order and `prerequisites`, which
   must appear earlier in the list). Motif ids come from `content/motifs.yaml`; add a motif there only if it is genuinely new.
3. **Scaffold** the course: copy `templates/course.yaml` (and `quizzes.yaml`) into the course folder and replace everything.
   Write the introduction (`summary` plus `about: {idea, risks, origin?}`, writing.md) so a beginner knows what the
   opening is for.
4. **List what exists** first: every tree line the course should teach goes into `lines:` by id, with `kind`, `opponent`,
   `section` or `alternative` overrides where this course sees it differently.
5. **Write the missing lines**, one chapter each:
   - Find the parent: run `tree-at` on the moves up to the branch point (or `grep -rl "5. c3" content/tree`); it prints the
     `[Start]`. Add earlier moves when the parent writes that move in more than one place (`[Start "x 4...Bxb4 5.c3"]`);
     the build says when.
   - Copy `templates/chapter-line.pgn` or `chapter-trap.pgn` (real Evans chapters: replace every header and move) to
     `content/tree/<first move>/<family>/<id>.pgn`, beside its relatives.
   - Headers: `[For]` (the side it is written for), `[Kind]`, `[Opponent]` (what the opponent does to reach it,
     "4...Bxb4 5.c3 Ba5"), `[Start]`, and the tags (step 6). The moves begin right after the `[Start]` move, numbered as
     in the game (`5... Ba5` when Black moves first). Never retype moves the parent already has.
   - Most common reply first; every likely reply covered; main lines to move 10 to 12 ending with a comment that names the
     plan; sidelines to move 8; `( ... )` variations for the opponent's realistic alternatives (so the every-branch drill
     has branches); exactly one unmarked learner move per position; mistakes marked `?`/`?!`. Take the engine's preferred
     moves. Gambits may end a little worse (say so in `Risk` and the note), but never teach a line the engine calls lost.
   - List the new id in `lines:`.
6. **Tags** on every new chapter (`Opening`, `Variation`, `ECO`, `Character`, `Risk`, `EarlyMate`, `Tricks`, `Themes`,
   `For`, `Kind`, `Opponent`, `Start`). Honest values, from the `[For]` side's point of view: formats.md.
7. **Notes**: say _why_ on every non-obvious learner move, bait and punishing reply (writing.md). Before commenting a move
   other chapters also write, read its comment with `tree-at`: keep it, or improve it for every course that passes there.
   Where a position is hard to picture, add a **position link**: `[f7](<EPD or FEN>)`; `pnpm fen "1. e4 e5 2. f4"` prints
   the EPD. The build checks that the target is legal (not that it is the position you meant: regenerate with `pnpm fen`).
8. **Quizzes**: two to four on the best teaching moments, each with 3+ `examples.match` and 3+ `examples.miss`. Every
   `for-us` trap the course lists (including flipped ones) needs one.
9. **Check the course** with `check-course` until it prints `OK`. Read every note as a beginner would; it flags
   `[no note]` on learner moves and shows `(from <chapter>)` on moves another chapter writes.
10. **Engine**: `pnpm course:eval --dir <course folder> --no-cache --depth 16 --lose 75 --threads 1` (a few minutes; run it
    in the background and read the output; do not poll with sleep). Fix findings by switching to the engine's move or
    shortening the line. Rerun a flagged gambit or trap at `--depth 18` before believing it.
11. **Whole repo**: `pnpm content:build` (ids, `[Start]`s, comments, curriculum, cross-course
    warnings), then `make doctor` and read what names your chapters (moves written twice: start the later chapter after
    them; a chapter no course lists: list it or remove it), then `make check` (`scripts/content.test.ts` builds the real
    content).
12. **Afterwards, offer** (heavy, so ask): `pnpm analyse <id>` (native Stockfish at depth 24, committed) and, for the card
    threshold, `make popularity` (needs `LICHESS_TOKEN`; fills only the new positions).
13. **Report**: files, `opening:` id, tier and trigger, the lines and traps (new chapters and listed existing ones) with
    the final eval of each, any comment you changed on a shared move, every departure from the plan because the engine
    disagreed, and anything unresolved.

## Definition of done

- [ ] The check script prints `OK`; `course:eval` prints `no findings`; `pnpm content:build` and `make check` are green.
- [ ] Every new chapter has a new kebab-case id, `[For]`, `[Kind]`, `[Opponent]` and the right `[Start]`, and retypes
      no move the tree has; `make doctor` lists none of them as unlisted or written twice.
- [ ] Main line = the most common reply; every likely reply has a line or variation with a learner answer.
- [ ] One unmarked learner move per position; mistakes marked; `for-us` traps are real and end clearly better (+1.5).
- [ ] The opening is in `openings.yaml`, the course in `curriculum.yaml`, motifs exist.
- [ ] `about` has an `idea` and `risks` a beginner can follow, true to the engine; `origin` only if certain.
- [ ] Notes give reasons in plain words and neutral sides, no copied text, no undefined jargon; position links were made
      with `pnpm fen`.
- [ ] Quizzes have 3+ match and 3+ miss examples.
- [ ] Nothing left in a scratch folder that should be in the repo; nothing committed or pushed unasked.

## Do not

- Do not rename chapter files or reorder `lines:` casually (line ids appear in learner history and links).
- Do not retype moves another chapter writes, and do not change a shared move's comment or marks for one course without
  reading who else passes there (`tree-at`, `make doctor`).
- Do not teach two answers to one position in a course unless one is `alternative: true` or the trigger separates them.
- Do not invent tag values; do not change schema, vocabulary, explainers or the quiz matcher while adding content.
- Do not copy text from books, paid courses or Wikibooks. Do not edit `content/popularity/popularity.json` or `.env`.
