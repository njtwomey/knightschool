# Content as a tree

Opening theory is a tree. 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 is the Italian; 4.c3 grows the Giuoco Piano out of it, 4.b4 the
Evans Gambit, and each of those branches again. Everything upstream of a branch is shared. Until October 2026 each course
was a folder of line files, and every file retyped the moves from the start: 4,204 plies typed, 2,928 distinct. The
content now has the shape of the theory. `content/README.md` is the authoring format; this page is the design and what is
still to do. The old layout is in commit `8f7b801` (and, locally, the git-ignored `.content/`).

## The model

- **The tree** (`content/tree/`) is one tree of positions and moves for **both sides**. Positions do not belong to a
  side: the Italian is the same tree whether you learn it as White or as Black. It is split into **chapters**, one PGN
  file per line, each written from where it branches off another chapter: `[Start "evans-gambit 5.c3"]` means "after
  5.c3 in the chapter `evans-gambit`" (more moves are given when that move appears in more than one place there). So
  each move is written once, and the files themselves say how the tree grows.
- **A line** is a chapter rebuilt from the start: the path to its `[Start]`, then its own moves. Its id is the file name.
- **The tree may hold several of our moves at a position.** After 1.e4 e5 the Italian plays 2.Nf3, the Danish 2.d4,
  the King's Gambit 2.f4 and the Vienna 2.Nc3; at the Italian position 4.c3 and the Evans' 4.b4 both stand. It is
  theory, not a repertoire.
- **A course** (`content/courses/<id>/`) is a selection: a side, a trigger, an introduction, and the lines it teaches,
  from either side. Within a course there is still one answer per position (a second is an `alternative`), and that is
  what the drill asks for. A line can be in several courses.
- **`[For]`** says which side a chapter is written for, because `[Kind]` and `[Risk]` are points of view; a trap listed by
  a course of the other side flips (`for-us` ↔ `against-us`).
- **One comment per move.** Where both sides' courses explained a move differently (54 moves at conversion), the side
  making the move kept its explanation.

## Loading

`content:build` reads the chapters (`resolveTree`, parents first), then **projects** each course (`projectCourse`): the
listed lines, rebuilt from the start, merged by the same `buildOpening` as before into the course's EPD-keyed tree. So
everything the app reads (`public/content/<course>.json`, `index.json`, `search.json`) has the shape it always had. The
conversion was checked against the old build course by course: the same positions, moves, repertoire answers, lines,
cards and quizzes; only comments differ, where a course gained the tree's comment on a move it had left bare or a clash
was settled.

The build also writes `tree.json` (`treeGraph`): every chapter with the chapter and move it branches after, and every
move between positions named by `positionId(epd)`, a ten-character hash. It is there to draw the tree.

`make doctor` reports what is worth tidying, case by case: moves written in more than one chapter (71 groups at
conversion, mostly a White and a Black chapter covering the same theory), chapters no course lists, lines in more than one
course, courses for one side that disagree.

## Still to do

1. **Draw the tree.** Done in a first form: `tree.json` carries each chapter's whole main line (UCI) and the courses
   that list it; core `navigation/move-tree.ts` builds a prefix tree keyed by the moves (not the position, so it stays a tree),
   with `scopeTree`, `pathOf`, `compress` and `everyMove`, and `tree-layout.ts` lays it out. One component
   (`features/tree/tree-view.tsx`) draws it top-down on `/tree` (the curriculum, only branch points), on the course page
   and on a line's Tree tab (every move a node, coloured by line). Still to do: put a clicked position on the course
   page's board.
2. **"Also in" on the course and play pages.** `index.json` already carries each line's `alsoIn` (other courses listing
   it); it needs showing.
3. **Cards keyed by position and answer** (`<side>:<epd>:<uci>` instead of `<course>:<epd>`), so a line shared by two
   courses is learned once. Needs a storage migration of `cards.id` and `reviews.cardId` (merging cards that become one)
   and export/import of both forms. Two courses that answer one position differently keep separate cards, and the review
   names the course.
4. **Renamed line ids.** Five clashed at conversion and became `<course>-<line>` (`vs-e6-french-rare-third-moves`,
   `caro-kann-exchange`, `flank-and-irregular-odd-first-moves`, `queens-gambit-orthodox`, `queens-gambit-albin`). Old
   `/play` links are redirected (`RENAMED_LINES` in `apps/web/src/route.ts`); Speed history rows for them keep the old id.
5. **Tidy with the doctor**: start later chapters after moves already written, and drop duplicate chapters where a White
   and a Black line are the same moves.
