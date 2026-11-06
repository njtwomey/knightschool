# Beyond memorising moves

A plan drawn from a review of Chessly (a course site built round video lessons and drills). The reviewer liked its
progress page, its compact layout and its checkpoints, which Knight School already has in the study path and spaced
repetition. These are the points they missed, and how each fits here. The order is the suggested build order: the
first three make the drills teach, the fourth improves the content, the last three take the app past the opening.

Status: a plan, nothing built. Decisions still open are marked **Decide**.

## 1. Say why a wrong move is wrong

The review: a drill says only "wrong, try again", so learners memorise instead of understanding. Half the mistakes are
moves that look natural.

Here: a wrong move in Drill or Learn still flashes a cross and snaps back at once (nothing waits for a click). In
addition, the panel says why, and that stays on screen until the next move:

- the cost, in the words `training/regret.ts` already uses (a memory slip, an inaccuracy, a mistake), from baked analysis
  or the browser engine;
- the opponent's best answer to it, drawn as a red Threat arrow (the board marks, `R`) when it is a mistake;
- the author's note when the course knows that move.

For the last, a course needs somewhere to write notes on wrong moves. PGN already has it: a variation in brackets,
`5. Bf4 (5. Bg6? Nxg5 6. Bxg5 Qxg5) 5... Nf6`. Variations would be **refutations**: shown when the learner plays that
move, never lines, never cards. The chapter reader would need to accept them (today a chapter is one line).

## 2. Keep the note of your own move on screen

The review: the explanation of a right move shows for half a second before the opponent's reply replaces it.

Here: keep the rule that play carries on by itself, and instead keep the comment of the learner's last move in the
panel next to the opponent's, until the learner moves again. To do: check Learn and Drill against this and fix
whichever drops it.

## 3. Show where a line leaves you

The review: no evaluation anywhere in the drills, so learners don't know how good their position is, or how
confidently to play it.

Here: Learn and the course page have the eval bar. Drill tests, so no bar while answering, but the end of every line
(the complete card, and the line's About) says where it leaves you, in words and numbers: "White is a little better,
+0.6", "equal", "Black is winning, -3.1". From baked analysis, so it costs nothing at run time.

## 4. Find the opponent's common mistakes (a content method)

The review's sharpest point: a London course skips a reply that half of players under 1600 make, which loses to a
knight sacrifice nobody would find without being shown.

Here: `make gaps` already lists popular replies no course answers. Add the engine: for every position on our lines
where the opponent moves, take the replies played in at least about 10% of explorer games (`popularity.json` holds
them) that the engine says lose 1.5 pawns or more, and rank them by games times swing. That ranked list is the to-do
list of traps worth writing, found from data rather than memory. It needs the positions after those replies analysed
(`pnpm analyse`, one engine at a time). The add-content skill would gain a step: run it after writing a course.

**Decide:** a trap to spring (`for-us`) is a quiz today, never a card. A blunder that a large share of opponents make
is something the learner should _play_, not only read about. Should those (above some share of games) be drilled like
main lines, perhaps as a new kind `punish`? That changes which cards exist, so it is your call.

## 5. Puzzles from your opening

The review: there are no puzzles, yet every puzzle comes from an opening, and tactics are best learned in the
structures you will actually reach.

Here: the Lichess puzzle database is public domain (CC0) and tags each puzzle with its opening (`OpeningTags`, in
Lichess's own names, which the build already fetches). Method:

- `make puzzles` downloads the database once into `.cache/` (about 250 MB compressed), like `make popularity`: run
  rarely, on a maintainer's machine, never by the build.
- For each course it picks puzzles whose opening tags match the course's names, rated about 600 to 1800, well liked and
  much played, and writes the selection (ids, position, moves, themes) to a committed file under `content/puzzles/`,
  so the build stays offline and reproducible.
- In the app: a few puzzles as extras on the path, after the unit that reaches that opening, and a **Puzzles** practice
  mode next to Quiz, Speed and Name it, with the same set-up card (courses I am learning, everything, one course;
  favour popular). Answered with the attempt machine Drill uses (hint, show, two tries). Credited on the Credits page.

**Decide:** whether puzzle answers are saved and scheduled (a new table, so a stored-data change), or only counted.

## 6. Structures, not just positions

What makes the above more than a filter on opening names: a **pawn structure key** in core (the pawns only, and which
side each king castled), and for each course its home structures, the ones its lines end in. Then:

- puzzles match a course by structure as well as name (a Caro-Kann structure reached from a London still counts);
- the course page can show "the structures you will play" with their plans;
- Play on (below) starts from them.

Positions are keyed by EPD already, so this is one more key beside it.

## 7. Play on: plans, not theory

The review: drills only repeat the lines taught. A good course should let you play on from a position past the theory
and show you understood the plan.

Here: a **Play on** exercise from the end of a line the learner has passed. Five moves against the computer, which
answers with what players at the explorer band actually play where that is known (`popularity.json` has counts per
move) and with Stockfish beyond it. Each of the learner's moves is graded by its engine cost with the same thresholds
as the quiz report; it passes with no mistake (100 cp or more) and the evaluation held within a margin. It sits on the
path as an extra after the unit it starts from.

A second step for authors: course `plans` (today plain sentences) could carry a starting line and an aim the game can
check: "play c4", "a knight to e5", "castle long". The exercise then shows the plan before you play and says whether
you carried it out.

## Left out

- Leagues and leaderboards need a server, and there is none. Streaks and a progress figure per course could come later
  from what is stored already.
- Video: courses are written, not filmed. Sources credit videos (`sources:` in course.yaml).

## Order and size

| Step                                          | Size                            | Touches stored data               |
| --------------------------------------------- | ------------------------------- | --------------------------------- |
| 1 Why a move is wrong (engine cost and arrow) | small                           | no                                |
| 1 Refutations in PGN                          | medium                          | no (content only)                 |
| 2 Note stays on screen                        | small                           | no                                |
| 3 Where a line leaves you                     | small                           | no                                |
| 4 Common-mistake finder                       | small script, then content work | no; a `punish` kind changes cards |
| 5 Puzzles                                     | medium to large                 | only if answers are scheduled     |
| 6 Structure key                               | small in core                   | no                                |
| 7 Play on                                     | large                           | likely a log of attempts          |

# What the site needs

The app was built round one idea: a course is a tree of moves, and practice is replaying it. Everything above needs
three things that are not about any one opening: a judgement of any move in any position, one way to run an exercise,
and courses that hold more than lines. Openings stay the spine (the path, the tree, the cards); the new parts are
shared layers they and everything else use.

## A. Move judgement: how good is this move here

One question asked everywhere (a wrong move in Drill, a puzzle, Play on, Create, the explorer): _how good is this move
in this position, and why_. Today the answer is scattered: the course tree knows its own move, `regret.ts` grades
against it after a quiz, `data/analysis.ts` merges baked and live evaluations for the strip.

**One function in core, `judgeMove(epd, uci, facts)`**, returning a verdict, never needing full coverage:

```ts
type MoveVerdict = {
  grade: 'book' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'unknown';
  symbol?: '!' | '?!' | '?' | '??'; // the standard PGN marks (NAGs 1, 6, 2, 4)
  winChanceDrop?: number; // 0 to 100
  cp?: number; // White's view, as everywhere
  refutation?: string[]; // the punishing reply and what follows, UCI
  note?: string; // the author's words, when there are any
  source: 'author' | 'baked' | 'live';
};
```

**Facts come in layers, the first that knows wins**, so coverage is targeted, not total:

1. **The author.** The course's own move is `book`. A move written with `?` or `??` in a chapter (the PGN reader already
   keeps NAGs and variations) is judged by the author, with the comment as the why. A variation whose first move is
   marked `?` or `??` is a **refutation**: kept with the position, never put into the tree. Authors annotate only the
   moves worth a word.
2. **Baked analysis.** `pnpm analyse` today covers the courses' own positions (`analysis.json`, multipv 3). Extend it
   to the moves people actually play: at each card position, the explorer's popular moves (already in
   `popularity.json`) are the likely wrong answers, so analyse the position after each. About 1,000 card positions times
   three or four moves: a few hours, one engine, resumable, run rarely. That covers most wrong moves anyone will make.
3. **Live.** Anything else goes to the browser engine at a modest depth, cached in `eval_cache` as now. The verdict
   shows as soon as it is known; play never waits for it.

**Grade by winning chances, not centipawns.** Losing a pawn matters at equality and hardly at all when a rook up. Lichess
turns centipawns into a winning chance (a logistic curve) and grades by its drop: on its scale from -1 to 1, 0.1
is an inaccuracy, 0.2 a mistake and 0.3 a blunder (5, 10 and 15 points of winning percentage). Adopt the same, so our
symbols mean what players already know. `regret.ts` becomes a user of `judgeMove` rather than a second grader.

**Shown one way everywhere**, three small components in `components/judgement/`:

- `VerdictBadge`: the symbol on the board's target square, in its colour (AppBoard's tick and cross badge grows into
  it).
- `VerdictNote`: one line in the panel: "Bg6? A mistake: after ...Nxg5 the knight is lost", the refutation drawn as a
  red Threat arrow through the board marks, with a button to step through it.
- `EvalWords`: "White is a little better (+0.6)", for line ends, puzzles and Play on.

## B. One exercise machine

Play, Quiz, Speed and Name it are four stores of about 300 lines each, and each has its own copy of the same loop: a
position, the learner's move, a judgement, the opponent's reply, timers, recording. Puzzles and Play on would make six.
Split what varies from what does not:

- **An exercise** (core): a start position, the learner's side, and two plug-ins.
  - A **grader** says whether a learner move passes: _exact_ (the course's move, a puzzle's solution, any mate where a
    puzzle mates), _tolerant_ (any move that keeps the winning chance within a margin: Play on), or _typed_ (a Quiz or
    Name it answer, unchanged).
  - A **responder** gives the other side's move: _scripted_ (the course tree, a puzzle's moves), _popular_ (weighted
    explorer moves, as Every branch does), or _engine_ (Stockfish beyond the data).
- **A session** (web, `features/practice/session.ts`): runs exercises in turn with the attempt machine
  (`reduceAttempt`: hint, show, two tries), `FEEDBACK_DELAYS` and `createTimers`, asks `judgeMove` on a wrong move, and
  hands each result to a recorder.
- **An exercise page** (`components/exercise-board.tsx`): a StudyBoard wired to a session, with the verdict note and
  the practice bar. Each mode becomes a definition (which exercises, which grader and responder, what is recorded) and
  its own summary.

Build it with Puzzles, the first new mode, then Play on; move Drill and Speed onto it only once it has proved itself.
Nothing that works today is rewritten up front.

## C. Courses that hold more than lines

- **Path items of many kinds.** The path already holds units and extras (traps to spring, quizzes). Make the extras a
  registry, one file per kind, like the path's sessions: trap, quiz, **puzzle set**, **play on**. Each kind says when
  it unlocks (after which unit), how it is drawn on the path, and which exercise it starts.
- **Material keyed by position, attached to courses.** Puzzles live in `content/puzzles/` with their position; a course
  gets the ones whose opening or **pawn structure** (`structureKey(epd)` in core: the pawns and where the kings are)
  matches its line ends. Nothing is written into the course by hand, so new material reaches every course it fits.
- **Plans that can be checked.** `plans:` in course.yaml can take either a sentence, as now, or a plan with a starting
  line and an aim (`aim: c4`, `aim: Ne5`, `aim: O-O-O`) that Play on checks.
- **Later, courses that are not openings.** A "structure" course (the isolated pawn, the Carlsbad) is the same thing
  with no trigger and no lines: its path is puzzle sets and Play on positions. The schema keeps `trigger` and `lines`
  required for an opening course and gains a `kind`; nothing about openings changes. Not needed for the first steps;
  worth keeping the door open.

## D. What is stored

The rule stands: ask before changing the stored format. The smallest change that works:

- **Puzzle cards** reuse the cards table the way quizzes do: id `puzzle:<id>`, the first move of the solution as
  `expectedUci`, scheduled by FSRS like any card. No new column.
- **One attempts log for new modes** (`exercise_attempts`: id, at, mode, item, result, moves, errors, hints, time, and
  a small JSON field for the rest), instead of a new table per mode as Guess and Speed have. Puzzles and Play on write
  there; the old tables stay.
- **Verdicts are never stored** beyond the engine cache: they are worked out from content and analysis each time.

## E. Where it goes in the code

| Layer          | New                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core           | `judge/` (`judgeMove`, win chance, grades, symbols; `regret.ts` moves in), `exercise/` (exercise, graders, responders), `structure/` (`structureKey`), `schema/puzzle.ts` |
| content        | refutation variations in chapters, `content/puzzles/`, checkable plans, `analysis.json` covering popular wrong moves                                                      |
| scripts        | `make puzzles` (select from the Lichess database), `make punish` (the common-mistake finder), `pnpm analyse --replies`                                                    |
| storage        | `exercise_attempts` (asked first)                                                                                                                                         |
| web data       | `data/judgement.ts` (author, baked, live merged; grows out of `data/analysis.ts`), `data/puzzles.ts`                                                                      |
| web components | `components/judgement/` (`VerdictBadge`, `VerdictNote`, `EvalWords`), `components/exercise-board.tsx`                                                                     |
| web features   | `features/practice/` (the shared session), `features/puzzles/` (`/puzzles`, menu next to Quiz), path extra kinds, Play on as a line tab                                   |

## F. First slice

The smallest thing that proves the layers, in this order:

1. `judgeMove` with the author and live layers, `VerdictNote` and `VerdictBadge`, shown on a wrong move in Drill and
   Learn. (Step 1 of the plan above, built on the shared layer from the start.)
2. Refutation variations in chapters, and `EvalWords` on the complete card.
3. `pnpm analyse --replies` to bake the popular wrong moves; `make punish` falls out of the same data.
4. The exercise machine, proved on Puzzles.
