# Puzzles: every Lichess puzzle, matched to where you are

A plan, nothing built. The data is downloaded (below); the jobs and the matching are described, not written.

## The data

`.cache/puzzles/lichess_db_puzzle.csv.zst`, from database.lichess.org (public domain, CC0), downloaded 1 November
2026: 310 MB compressed, 1.18 GB as CSV, **6,193,530 puzzles**. Decompressing and reading every row takes about 26
seconds.

Each row: `PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays, Themes, GameUrl, OpeningTags,
DailyDate`.

- **FEN** is the position _before_ the opponent's move; the first of **Moves** is that move, the rest the solution.
- **GameUrl** gives the game id and the ply (`lichess.org/787zsVup/black#48`).
- **Themes**: fork, pin, mateIn2, endgame, middlegame and so on (Lichess's list).
- **OpeningTags**: the game's opening as family and variation (`Italian_Game Italian_Game_Classical_Variation`). Only
  **1,231,709** puzzles have them (puzzles from early in a game); five million do not.
- What is **not** there: the game's moves. A puzzle says where its game ended up, not how it got there.

That last point is the whole problem. To ask "which puzzles came from games that passed through this position", we
need the games' moves. Hence the expansion job.

## Ways to connect a puzzle to a position

From strongest to loosest. Each answers a different teaching question.

| Level                    | Means                                                                                    | Needs                  | Teaches                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| **Through the position** | the puzzle's game passed through position X (by EPD, so transpositions count)            | expansion (game moves) | "this is what happens after this exact position"           |
| **After the line**       | the game passed through the last position of line Y                                      | expansion              | "you played the line; here is what came next"              |
| **Named variation**      | the puzzle's variation tag is the variation X is in (deepest named position on X's path) | tags and opening names | "a tactic from this variation"                             |
| **Opening family**       | same family tag ("the meta line": the course's opening as a whole)                       | tags                   | "a tactic from this opening"                               |
| **Same structure**       | the puzzle's pawns are the same as, or close to, those at the end of line Y              | the puzzle FEN only    | "a tactic in the structure you will get", from any opening |
| **Same idea**            | the puzzle's themes match an idea the lesson or course teaches (fork, pin, back rank)    | themes                 | "practise the idea", opening or not                        |

Every level also filters by:

- **Who solves.** The learner's side (a chance you get) or the opponent's (a danger to watch, the puzzle version of a
  trap to avoid).
- **How soon.** Plies from X to the puzzle: soon after (a direct result of the line) or later (the middlegame it leads
  to).
- **Rating band** (the learner's level), **popularity**, **number of plays**, a low rating deviation, and one puzzle per
  game.

## When to use which

| Moment                              | Level, filters                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| End of a lesson                     | through its last position, learner solves, soon after; one to three puzzles           |
| A trap lesson                       | through the position after the opponent's mistake, learner solves                     |
| A danger lesson (trap to avoid)     | through the position, opponent solves: "this is what happens if you play ...?"        |
| Chapter checkpoint                  | through the chapter's branch point (the meta line of its lessons), mixed timing       |
| Course: "puzzles from this opening" | opening family and named variations, then structure, ranked                           |
| Practice: Puzzles                   | the learner's repertoire, weighted by how often they reach each position (popularity) |
| An idea's page                      | same idea, preferring openings in the learner's repertoire                            |
| No match yet (a new or rare line)   | fall back down the levels until enough are found                                      |

## The jobs

All run on the maintainer's machine, resumable, never by the build. Output is a cache (git-ignored) plus a small
committed selection, as `make popularity` does today.

**1. Index** (minutes). Read the CSV once into a local SQLite file (`.cache/puzzles/puzzles.sqlite`; node has SQLite
built in): one row per puzzle, plus its tags, themes, game id, ply, the solver's side and its pawn structure. Indexes on
tag, theme, rating and structure.

**2. Name the tags** (seconds). Lichess's opening names (`.cache/openings.tsv`, 3,865 names with their moves, already
fetched by the build) give each tag its moves: "Italian_Game_Classical_Variation" is the shortest named line in that
variation. Replaying those moves gives the positions along each tag, so a course position can be matched to tags.

**3. Expand** (hours to days, in the background). Fetch each puzzle's game from Lichess (`POST
/api/games/export/_ids`, up to 300 games a request, one request at a time, a pause after a 429, the token from
`.env`), replay its moves up to the puzzle, and keep, per game, the positions it passed through in the first 30 or so
plies. Then an inverted index: **position → puzzles whose game passed through it**, kept for positions that at least
a few puzzle games reach.

- The 1.2 million tagged puzzles first (their games are in the opening): roughly half a day.
- Then the rest, which is what finds the middlegame puzzles from games that began in our openings: several days.
- The streaming rate for this endpoint is not documented; measure it on a small run before estimating properly.
- The alternative, Lichess's monthly game dumps, is tens of gigabytes per month across a decade: not worth it.

**4. Select** (minutes). For a course (or any set of lines, including one written in Create), walk its positions, look
each up at every level, filter and rank, and write a selection: up to a few hundred puzzles per course, with the level
and position each was matched at. Committed under `content/puzzles/`, so the build ships them offline (about 40 KB per
course).

**5. Look up** (instant). A small command to ask by hand: a course, a line, a ply or a move list, a level, a rating
band, a theme. Prints the puzzles with their Lichess links. This is how an author picks puzzles for a lesson, and how
we check that the matching makes sense before building any page.

## Independent of courses

The index maps puzzles to **positions**, not to courses. Any course, v1's, v2's, or one written in Create, asks the
same index with its positions. That is why parking the current courses (inventory.md) does not hold this up: the
matching can be tried on v1's lines today and kept for whatever replaces them.

## In the app, later

- A puzzle is an exercise: the puzzle preset of the board, the exact grader (any mate also counts), the solution as the
  scripted responder (capabilities.md 3).
- After it is solved or missed, the board turns to analysis: step through it, see each move's verdict, see its ideas.
- Puzzle cards reuse the cards table (`puzzle:<id>`), if agreed.
- Lichess is credited on the Credits page.

## Questions

1. How deep should expansion go: the tagged 1.2 million first, then all 6.2 million?
2. How close counts as "same structure": identical pawns only, or most of them?
3. How many puzzles per lesson and per course before it feels like padding?
