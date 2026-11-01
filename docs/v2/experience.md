# The experience

Who comes, what they want, and what they meet, from the first visit to the hundredth. Pages and parts are named as in
[model.md](model.md) and [board.md](board.md); where a v1 page already does the job, it is named.

## Who comes

1. **The new player.** Knows the moves, loses in the first ten. Wants to know what to play and not fall for tricks. Has
   never heard of a repertoire.
2. **The improver (about 1000 to 1600).** Has openings half-learned from videos. Wants a repertoire that holds up,
   to stop being surprised, and to know what to do when the theory ends.
3. **The curious.** Wants to understand positions: why one move is better, what an advantage is, what the plan is.
   Studies more than drills.
4. **The author.** A coach, a club player, a parent: writes a course for themselves or others (Create).

## Arriving

**First visit.** Home makes one promise and offers one action: _"Learn what to play in the first moves, why, and what
to do when your opponent goes wrong. Start with a repertoire in two minutes."_ Below, the v1 hero (a line playing with
the idea of each move, `features/home/home-page.tsx`) shows what learning looks like. No account; everything stays in
the browser.

**Choosing a repertoire** (new: onboarding, three steps, each skippable):

1. _How much do you play?_ New to the game, a few hundred games, a club player. This sets the explorer band and the
   suggested courses.
2. _As White, what do you want?_ Two or three suggestions with a line each from the course introduction ("solid and
   simple", "sharp, with traps"), from `about.suits`. Optionally: _"Show me what I already play"_ with a Lichess
   username, which reads their public games and suggests courses that match.
3. _As Black, against 1.e4 and against 1.d4?_ The same.

The result is the learner's **repertoire** (v1: courses I am learning) and the first lesson opens at once.

**Returning.** Home becomes **Today**: continue the lesson in progress, reviews due (v1: "Due today" in Quiz), a
puzzle from your openings, your streak and coverage. One main button: whatever matters most now.

## Learning a lesson

A lesson is short and always runs the same five steps on one page, with the board in the `learn` preset and then
`test`:

1. **Read.** The title, two to four sentences, the position that matters with its marks. (v1 has the text for a
   course, not for a unit; lessons get their own.)
2. **Watch.** Step through the moves, each with its comment and marks; your moves in bold. (v1: Learn, with the arrow
   for the move to play.) The arrow fades: once you have played a move right twice it is no longer shown, and it comes
   back after two mistakes (Listudy does this; survey.md).
3. **Try.** Play your side without help; the other side plays the lesson's replies. A wrong move snaps back and says
   why (the verdict, the refutation on the board). (v1: Drill for a unit, `/play/<course>/<line>/drill/<n>`.)
4. **Their mistakes.** Where the opponent commonly goes wrong in this stretch, they do, and you find the punishment.
   The board says how often players at your level make that mistake.
5. **Done.** What you learned (the ideas, by name), where the line leaves you in words ("White is a little better,
   +0.6"), and what comes next. The moves join your reviews.

A lesson is passed when every move in it has been played right twice running (v1's unit rule). Nothing waits for a
click when you are right; a miss stays up with Next while there is an explanation to read (v1's rule, kept).

## Testing

All from one Practice page, with v1's set-up card (source, weighting, mode settings) and summary bar:

- **Review**: the moves and questions due today, on the FSRS schedule. The core habit. (v1: Quiz, Due today.)
- **Drill a line or a course**: every branch, the computer choosing replies as players at your level do, and saying
  so ("plays what 1000 to 1600 players play"). (v1: Drill, Every branch.)
- **Puzzles**: tactics from your openings. (New.)
- **Play on**: from the end of a line, five more moves against the computer, keeping your advantage. A variant leaves
  the book early: the computer plays a popular move the course does not cover, and three moves later you are told
  whether you kept your advantage or gave it away (Chessly's bot does this; survey.md). (New.)
- **Your games**: give a Lichess username, and each recent game's first move outside your repertoire becomes a card
  to review: what you played, what the course plays, and why. (Chessbook, Chesstempo and ChessAtlas do this with a
  server; the Lichess games API can be read from the browser.) (New.)
- **Speed**: lines against the clock. (v1: Speed.)
- **Name it**: which opening is this? (v1: Name it.)
- **Checkpoint**: the end of a chapter, a mixed test of its lessons; passing opens the next chapter. (New, made of the
  above.)

## Guards: how you move on

- A lesson opens when the lesson it builds on is passed (v1's path does this).
- A chapter ends in a checkpoint; the next chapter opens when it is passed.
- A course ends in a final test: every branch, a few puzzles and a Play on.
- **Test out**: any gate can be passed directly by taking its check. Learners who know a line skip it honestly.
- **Free choice beside the path**: any line can still be opened, learned and drilled from the course page or the map;
  only the path's order and the checkpoints are gated. (Being held to a course's order is a common complaint about
  Chessreps.) The first lesson of every course is always open; opening a later one asks once (as on Chess.com).
- Reviews come first: when many are due, Today puts them before new lessons, and new lessons are limited per day (v1:
  the new-cards-per-day limit).

## The map: seeing what you know

The theory tree (v1: `features/tree`, `TreeExplorer`, one lane per line) becomes the learner's map:

- every move coloured by state: not yet seen, learning, known, mastered;
- **gaps** drawn as short dashed stubs: replies players at your level make that your repertoire does not answer, with
  their share of games (v1: `make gaps` computes these for the catalogue);
- the opponent's common mistakes marked where they happen;
- click any move: the board shows it with its comment, verdict and explorer numbers, and offers Learn, Try or Review
  for the line through it.

## Feedback: why, every time

- **Your move, right:** a tick, and its comment stays in the panel until your next move (so the reason is never gone
  in half a second).
- **Your move, wrong:** a cross and snap back, the verdict ("a mistake: the knight is lost after ...Nxg5"), the
  refutation as a red arrow with a button to step through it, and the author's note when there is one.
- **Every guess, collected:** below the board, a table fills as you go: each move you were asked, what you played
  (every try, not only the last), its grade and symbol, the cost in centipawns against the line's move and the drop in
  winning chances, how long you took, and whether you used a hint. A cost fills in as soon as the judgement knows it.
  Click a row and the board goes to that position, showing your move and the refutation. The same table ends the
  session as its summary. (v1 lists wrong moves with their cost only at the end of a Quiz, `miss-list.tsx`.)
- **Their move, a mistake:** "Black's ...g5? is played in about a quarter of games at your level, and loses a piece"; the
  next move is yours to find.
- **Where you stand:** at the end of every line and puzzle, in words and numbers.
- **What it means:** ideas named and linked: "this is a fork", opening the idea's page.

## Progress you can see

- **Course page:** the path of chapters and lessons with their states (v1: the Path tab, `features/path`), percent of
  moves known and mastered, final test status.
- **Repertoire coverage:** per side, the share of games at your level that stay inside what you know by move 5, 10 and 15. One honest number that goes up as you learn and shows where to go next.
- **What to do next, per course:** each mode with its own colour and a count on the course card and page ("Learn
  12/40, Review 6 due, Puzzles 3/15"), so one glance says where to go (Chessreps does this).
- **The biggest gap:** with coverage, a link straight to the most common reply your repertoire does not answer yet
  (Chessbook's "go to your biggest gap", from our popularity data).
- **Activity:** a streak and a calendar of days practised, from the answers already logged. Kept light: no currency,
  shop, wheel or leagues, which reviewers say crowd out the teaching on other sites.
- **Stats:** accuracy over time, slowest and most missed moves, Speed records (v1: Stats, `features/profile/stats`).

## The menu

v1: Courses, Search, Tree | Quiz, Speed, Name it | Create | Glossary. v2, by what you came to do:

| Item         | Holds                                                                        | v1                          |
| ------------ | ---------------------------------------------------------------------------- | --------------------------- |
| **Today**    | Home for a returning learner: continue, due, puzzle, streak                  | Home, Profile Overview      |
| **Learn**    | your repertoire and its courses; all courses; curriculum tracks              | Courses, course pages, Path |
| **Practice** | Review, Drill, Puzzles, Play on, Speed, Name it, behind one set-up card      | Quiz, Speed, Name it        |
| **Explore**  | the map (tree), search, the explorer and analysis board                      | Tree, Search, Lab           |
| **Ideas**    | tactics, plans, structures and principles, each with its lessons and puzzles | Glossary                    |
| **Create**   | your courses                                                                 | Create                      |

On the right: coverage and streak at a glance, settings, profile. On a phone, a bottom bar with Today, Learn,
Practice, Explore, and the rest in a menu.

## Written, not filmed

No video, so the writing carries the teaching. Short, plain, friendly, and always tied to the board. A note with a
bit of voice is what learners praise most on Chessreps and Chessly; plain English can still sound like a person.

- **Course introduction**: idea, risks, who it suits, origin (v1: `about` in course.yaml, `CourseIntro`).
- **Chapter introduction**: two or three sentences on the decision the chapter is about.
- **Lesson text**: two to four sentences, with board positions written inline that the reader can click to show
  (v1: `RichText`, `StaticBoard` can draw a PGN at a ply).
- **Move comments**: one per move, neutral, with marks.
- **Idea pages**: a paragraph, a diagram or two, and everything that shows it.
- **Sources** credited (v1: `sources:` in course.yaml).
