# Content as a tree

Status: proposal (2026-10-21). `content/` as it was before this change is snapshotted in `.content/` (git-ignored) and in
commit `8f7b801`.

## The idea

Opening theory is a tree. 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 is the Italian; 4.c3 grows the Giuoco Piano out of it, 4.b4 the
Evans Gambit, and each of those branches again. Everything upstream of a branch is shared. Today each course is a folder
of line files, and every line file retypes the moves from the start: across the 20 courses 4,204 plies are typed and
2,928 of them are distinct, so 30% is repetition (47% in the Evans course). Each copy has to keep the same annotations,
and the build fails when two copies disagree.

The new model:

- **The book.** One tree per side (`content/white/book`, `content/black/book`) holding every position and move we
  teach, keyed by EPD so transpositions meet. Each move is written once, with its annotation.
- **A line** is a path through the book from the start to a tip. It has a stable id (today's file names keep their ids).
- **A course** is a selection of lines: a trigger position plus the lines through it it wants, in teaching order. The
  same line can be in several courses, and the course page can say "also in Evans Gambit, Italian Game" exactly, from
  the data, with no heuristics.
- **Drilling** is still along lines, exactly as now.

### Several answers per position

The book cannot be "one move for our side per position". The current content already says so: after 1.e4 e5 the
Italian plays 2.Nf3, the Danish 2.d4, the King's Gambit 2.f4 and the Vienna 2.Nc3; at the Italian position 4.c3 and the
Evans' 4.b4 both stand; Black answers 1.e4 with ...e5 in two courses and ...c6 in another. So:

- the book may hold several of our moves at a position (it is theory, not a repertoire);
- **a course** still has one answer per position (a second one is an `alternative` in that course, as now), and that is
  the move the drill asks for;
- **a card** is a position _and_ its answer: `white:<epd>:<uci>`. Two courses that agree share a card (learn the Italian
  trunk once, it counts for the Evans too); two that disagree get one card each, and the review screen names the course
  so you know which repertoire is being asked.

## Authoring format

A book is split into **chapters**, one PGN file each, in any folders the author likes (`book/e4/italian.pgn`,
`book/e4/evans.pgn`). A chapter is one line plus its side branches, written from the point where it leaves the rest of
the book:

```pgn
[Line "evans-accepted"]
[Name "Italian Game: Evans Gambit"]
[Start "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5"]
[Kind "gambit"]
[Character "gambit,sharp"]
[Risk "medium"]
...

4. b4 { Offers a pawn to gain time for c3 and d4. } 4... Bxb4 5. c3 Ba5 6. d4 ( 6. O-O ... ) ...
```

- `[Start]` is moves from the initial position to a position the book already has (or empty for the start). The build
  resolves chapters in dependency order and fails if a start is never reached.
- The main line of the chapter is the line `[Line]` names; the full line is the path to `[Start]` followed by it.
  Variations inside the chapter are that line's side branches (as in today's files). A variation that should be a line
  of its own gets a `[%line <id>]` command in a comment at its tip.
- Line metadata moves from `course.yaml` into the chapter header: `[Kind]` (main, sideline, rare, gambit),
  `[Trap "for-us" | "against-us"]` for traps, and the tags we have now (character, risk, tricks, themes, refutes).
- A move written twice must carry the same annotation (today's rule). `make doctor` lists every move written in more
  than one chapter so they can be cleaned up case by case.

`course.yaml` keeps the course-level material (name, opening, tier, summary, plans, motifs, introduction) and replaces
the `lines:`/`traps:` file lists with ids:

```yaml
trigger: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5'
lines: # teaching order; any line of the book of this side, by id
  - giuoco-piano
  - evans-accepted
  - { id: two-knights-fried-liver, kind: rare } # override the chapter's kind for this course
  - { id: scotch-gambit, alternative: true }
```

Every listed line must pass through the trigger. The course page groups lines by where they branch, so `section:` goes
away (the tree is the grouping); `from:` goes away (any course lists any line of its side).

Quizzes stay per course (`quizzes.yaml`, `quiz:<course>:<id>`).

## Loading: convert the tree back into what the app reads

`content:build` reads the books and courses, then **projects** each course into today's `OpeningContent` (its nodes are
the positions on its lines, its variants are its lines) and writes the same `public/content/<course>.json`. So most of
the web app keeps working untouched; it gains a `book-<side>.json` only where it needs the whole tree (board search,
Guess, "also in").

## Migration, step by step

Each step leaves `make pre-push` green.

1. **Book in core, additive.** `book.ts`: parse chapters, resolve starts, build the per-side tree, validate (unique line
   ids per side, every tip reachable, consistent annotations). `project.ts`: book + course → `OpeningContent`. Tests.
2. **Converter** (`scripts/to-book.ts`, run once, then deleted): per side, courses in curriculum order, lines in
   teaching order; each line file becomes a chapter whose `[Start]` is where it leaves what is already in the book.
   Course-level kind/trap/section move into chapter headers; `from:` becomes a plain listing. Line ids that collide
   between courses of the same side are renamed `<course>-<line>` and recorded in a rename map.
   **Check:** projecting the converted book gives the same nodes, edges, annotations, variants and cards as the old
   build for every course (an equivalence test over the real content, then dropped).
3. **Switch the build** to the books; delete the old loader. Content README, `add-course` skill and templates rewritten.
4. **Cards keyed by position and answer.** `cardId(side, epd, uci)`; `cardDefinitions` per course as now, ids shared.
   A storage migration rewrites `cards.id` and `reviews.cardId` (`<course>:<epd>` → `<side>:<epd>:<uci>`), merging cards
   that become one (keep the one with more reviews; reviews are append-only and all kept) and applies the line rename
   map to `speed_attempts.lineId`. Export/import accepts both forms.
5. **App.** "Also in" on the course page and play page; course page grouped by branch point; review names the course on
   a card that two courses answer differently; old `/play/<course>/<old-id>` URLs redirected through the rename map.
6. **`make doctor`**: moves written in more than one chapter, chapters nothing lists, lines in no course, positions where
   two courses of one side disagree (informational: that is often intended, as with the gambits).
7. Tools: `course:eval`, `analyse`, `popularity` take a course or a line as now (they iterate projected courses);
   `CLAUDE.md` and `README.md` updated.

## Blast radius

| Area       | Files                                                                                                          | Change                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `content/` | 340 PGN, 20 `course.yaml`                                                                                      | regenerated by the converter, then hand-tidied as the doctor reports                               |
| core       | `schema/content.ts`, new `book.ts` + `project.ts`, `tree.ts`, `training.ts` (`cardId`), tests                  | the heart of it                                                                                    |
| scripts    | `content-lib.ts`, `content-build.ts`, `content.test.ts`, new `doctor.ts`; eval/analyse/popularity entry points | moderate                                                                                           |
| storage    | one migration (card ids, line renames), `transfer.ts` import of old ids                                        | small, but needs care: it touches learner history                                                  |
| web        | course page and lines table, play URLs, review card label, guess/board search (book JSON), stats labels        | about 10 of the 42 files that touch course or line ids; the rest read the projected JSON unchanged |
| docs       | `content/README.md`, `add-course` skill, `CLAUDE.md`, `README.md`                                              | rewrite of the authoring parts                                                                     |

The risky part is step 4 (learner data); everything else is checked by the equivalence test in step 2.

## Decisions to confirm

- One book per side (not one tree for both): our moves and theirs swap roles between the sides, and the existing
  cross-side check (`consistencyWarnings`) already compares the two.
- Cards shared between courses that agree. The alternative, cards staying per course, keeps duplicate drilling of the
  shared trunk, which is the problem this solves.
- Chapters in free folders under `book/`, not a folder per tree node (deep nesting reads badly and branches move).
