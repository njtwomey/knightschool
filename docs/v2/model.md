# The model: what the site is made of

The things a learner meets, from smallest to largest, then how they connect. Each says where it lives in v1.

## The pieces

**Position.** A board state, keyed by EPD so transpositions are one position. _v1: everywhere; `chess/epd.ts`,
`positionId`._

**Move.** A move out of a position, with its annotation: comment, marks (`[%cal]` / `[%csl]`), symbol (`?`, `!`, as PGN
NAGs) and tags. One comment per move across the whole site. _v1: `LineEdge` and `Annotation` in `schema/built.ts`;
marks in `content/marks.ts`._

**Line.** One path of moves written for one side, from where it branches off another line: a main line, a sideline, a
rare line, a gambit, a trap. All lines together are the **theory tree**. _v1: the PGN files in `content/tree/`, today
called chapters; `resolveTree` in `content/theory-tree.ts`._ **Rename: these become "lines" everywhere**, so that
"chapter" can mean what learners expect.

**Refutation.** A wrong move with the reason it is wrong: a PGN variation starting with a move marked `?` or `??`.
Shown when someone plays that move; never a line, never drilled. _New; the PGN reader already keeps variations and
NAGs (`chess/pgn.ts`)._

**Idea.** A reusable piece of understanding that has a name: a tactic (fork, pin), a plan (minority attack, kingside
pawn storm), a structure (Carlsbad, isolated queen's pawn), a principle (develop before attacking), a trap pattern
(the Fried Liver). An idea has a page with a short explanation and every lesson, move and puzzle that shows it.
_v1: motifs in `content/motifs.yaml` and the Glossary page (`features/glossary`); course `plans` as plain sentences;
`explain/motif.ts` spots some motifs on the board._ v2 widens motifs into ideas of several kinds.

**Lesson.** The unit of learning: five to ten minutes, about four of your moves. A lesson has a title, two to four
sentences of text, the stretch of moves it teaches, the ideas it shows, and a check. _v1: units (`training/units/`,
`courseUnits`), cut automatically, with `units:` overrides in course.yaml._ v2 keeps the automatic cut as the default
and lets an author name a lesson and write its text.

**Chapter.** A group of lessons round one decision: "When Black plays 3...Nf6", "The main line", "Traps to know". Ends
with a **checkpoint**: a mixed test of its lessons. _v1: a course line's `section`, shown as groups on the course page
and in Create._

**Course.** One opening for one side: an introduction (idea, risks, who it suits, origin), chapters in order, its
ideas, its puzzles, a final test. _v1: `content/courses/<id>/course.yaml`; `projectCourse` and `buildOpening` build
its tree._

**Exercise.** Anything the learner answers: play a move, replay a stretch, answer a question in words, solve a puzzle,
play on from a position. Every exercise is graded and recorded the same way. _v1: review cards (`training/cards.ts`),
quizzes, Speed lines, Name it positions, each with its own store._

**Puzzle.** A tactic from a real game, from the Lichess puzzle database, attached to the courses whose openings or pawn
structures it comes from. _New._

**Verdict.** How good a move is in a position and why: a grade, a symbol, the cost, the punishing reply, the author's
note. _New; grows from `training/regret.ts` and `data/analysis.ts`._

**Repertoire.** The courses a learner has chosen, together: what they play as White, against 1.e4, against 1.d4 and
the rest. Measured by **coverage**: the share of games at their level that stay inside what they know, move by move.
_v1: "courses I am learning" (enrolled openings in `data/training-settings.ts`); `make gaps` (`scripts/gaps.ts`)
measures holes for the whole catalogue._

**Curriculum.** The order courses are best taken in, as tracks: "a first repertoire with 1.e4", "a first repertoire
with 1.d4", "traps every beginner should know". _v1: `content/curriculum.yaml` with prerequisites._

## How they relate

```mermaid
graph TD
  Curriculum -->|orders| Course
  Repertoire -->|chooses| Course
  Course -->|has, in order| Chapter
  Chapter -->|has, in order| Lesson
  Chapter -->|ends with| Checkpoint
  Lesson -->|teaches a stretch of| Line
  Course -->|selects| Line
  Line -->|is a path through| TheoryTree[Theory tree]
  TheoryTree -->|made of| Move
  Move -->|from / to| Position
  Move -->|may carry| Refutation
  Idea -->|shown by| Lesson
  Idea -->|shown by| Move
  Idea -->|shown by| Puzzle
  Puzzle -->|attached by opening or structure| Course
  Lesson -->|checked by| Exercise
  Checkpoint -->|made of| Exercise
  Exercise -->|graded with| Verdict
  Exercise -->|scheduled as| Card
```

Two rules keep this simple:

- **Lines are shared, lessons are not.** The theory tree belongs to the site; a line can be in many courses. A lesson
  belongs to one course, because the same moves are taught differently in different courses. _v1 already separates
  the tree from courses this way._
- **Material keyed by position attaches itself.** A puzzle, a refutation, an explorer count or an evaluation is stored
  against a position, and appears in every course that reaches it. Nothing is copied into a course by hand.

## Progress, per piece

| Piece      | States                                                                        | v1                                           |
| ---------- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| Move       | new, learning, known (last two answers good), mastered (FSRS 7 days and more) | cards, `unitProgress` in `units/progress.ts` |
| Lesson     | locked, open, learning, passed, mastered (from its moves)                     | unit states (`features/path/unit-state.ts`)  |
| Chapter    | locked, open, checkpoint passed                                               | new                                          |
| Course     | percent of moves known and mastered; final test passed                        | partly, on Overview                          |
| Repertoire | coverage by move 5, 10, 15 at the learner's band                              | new                                          |
| Idea       | seen, practised (puzzles and moves showing it answered well)                  | new                                          |

State stays derived from the answer log, never stored, as v1 does for units.

## What stays fixed

Learner history is keyed by course id and position (`card id = <course>:<epd>`) and line ids appear in it. Renaming
a course or line id loses history, so v2 keeps every existing id; the rename of "chapter" to "line" is in words and
code, not in ids or files.
