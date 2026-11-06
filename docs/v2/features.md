# Features: from the survey to what we build

Every pattern and complaint in [survey.md](survey.md), what we do about it, and where it lands. The rest of the plan
(experience, inventory, roadmap) builds only what this page adopts. Codes in the first column are referred to from the
other documents.

**Decisions:** _adopt_ (build it as seen), _adapt_ (build our version), _later_, _skip_ (with the reason).

## Learning

| #   | Seen on                       | Feature                                                                | Decision | Our version                                                                                         | Where                      |
| --- | ----------------------------- | ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- | -------------------------- |
| L1  | Chessly, Chess.com, Chessable | Course → chapter → lesson structure                                    | adopt    | Opening → variation → step; steps cut automatically by default, named and written by the author     | model.md                   |
| L2  | Chessreps, Chessly            | A short note with a voice on every learner move                        | adopt    | One comment per move, plain and friendly; the bar requires it on every learner move                 | making-openings.md (bar 6) |
| L3  | Chessreps                     | A written guide per course (overview, variations, plans, history, FAQ) | adapt    | Opening introduction (exists) plus variation introductions and step text                            | experience.md              |
| L4  | Chessly, Chessable            | Video per chapter                                                      | skip     | No video; written steps with boards inline instead                                                  | experience.md              |
| L5  | Listudy                       | Hints that fade after two right answers, return after two misses       | adopt    | The arrow in Learn                                                                                  | experience.md, step        |
| L6  | Lichess Studies               | Interactive lesson: find the moves, with hints                         | adopt    | The step's Try stage (v1 Drill for a unit)                                                          | experience.md              |
| L7  | Chessreps                     | Learn focuses on your weakest lines first                              | adapt    | Review and Drill weight misses (FSRS does this for review; Drill picks the least-known branch next) | capabilities.md 3          |
| L8  | Chessable                     | Study from move 1 or from the branch point                             | adopt    | v1 already starts a unit part-way along (`firstIndex`); a setting for "from the start"              | exists                     |

## Testing

| #   | Seen on                          | Feature                                                                                  | Decision | Our version                                                                                        | Where                            |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | -------------------------------- |
| T1  | Chessable, Chessbook, ChessAtlas | Spaced repetition (FSRS)                                                                 | adopt    | Exists (ts-fsrs)                                                                                   | exists                           |
| T2  | Chessly (Drill Shuffle)          | Drill mixed across courses and chapters                                                  | adopt    | The practice set-up's source (exists: learning, everything, one course in v1); add "one variation" | exists, extend                   |
| T3  | Chessreps (Time Trials)          | Lines against the clock                                                                  | adopt    | Exists (Speed)                                                                                     | exists                           |
| T4  | Chessly (Levi bot)               | The opponent leaves the book; graded "kept or gave away the advantage" three moves later | adapt    | Play on, with a deviation variant: popular uncovered reply, then judged by the engine              | experience.md, capabilities.md 3 |
| T5  | OpeningTrainer, Chessbook        | Replies weighted by how often players choose them                                        | adopt    | Exists (Every branch weights by popularity); say so on screen                                      | exists, label                    |
| T6  | Chessly, Chess.com               | Path gates; first lesson always open; skipping asks                                      | adopt    | Steps and checkpoints gated; first step open; starting a later one asks once; test out             | experience.md                    |
| T7  | Chessreps (complaint)            | Being held to the course's order                                                         | avoid    | Any line can be opened freely from the opening page or the map                                     | experience.md                    |
| T8  | Chesstempo                       | Train one branch, to a depth, or the hardest moves                                       | adopt    | Exists in parts (unit scope, Speed depth); add "hardest moves" as a source                         | extend                           |
| T9  | Chessreps (Arena), Chessly       | Free play against a bot from the opening                                                 | later    | After Play on; same responder, no grading                                                          | roadmap                          |

## Feedback

| #   | Seen on                        | Feature                                            | Decision | Our version                                                                                      | Where                   |
| --- | ------------------------------ | -------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| F1  | Chess.com Game Review, Lichess | Move grades and symbols                            | adopt    | Book, Best, Excellent, Good, Inaccuracy ?!, Mistake ?, Blunder ??, Miss; no Brilliant            | capabilities.md 2       |
| F2  | Chessly review (complaint)     | Wrong moves only marked wrong                      | avoid    | Every wrong move says why, with the refutation on the board                                      | experience.md           |
| F3  | Chessly review (complaint)     | The note of a right move vanishes in half a second | avoid    | The note stays until your next move                                                              | experience.md           |
| F4  | Chessly review (complaint)     | No evaluation in drills                            | adapt    | No bar while answering; where you stand shown after, and at every line's end                     | board.md (reveal)       |
| F5  | Chess.com coach                | Arrows drawn when a phrase is hovered              | adapt    | Board marks exist; step text can name squares and moves that light up on the board               | experience.md           |
| F6  | Chessly review                 | The opponent's common mistakes are missing         | adopt    | The bar requires them; a stage of each step to punish them; the finder (`make punish`)           | making-openings.md      |
| F7  | ours (from the quiz miss list) | Every guess collected in a table with its cost     | adopt    | `Board.Tries`: live during Learn, Try, Drill, Review and Play on; the session summary at the end | board.md, experience.md |

## Progress

| #   | Seen on                       | Feature                                                 | Decision | Our version                                                              | Where                |
| --- | ----------------------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | -------------------- |
| P1  | Chessreps                     | Counts per mode on each course, each mode with a colour | adopt    | "Learn 12/40, Review 6 due, Puzzles 3/15" on opening cards and pages     | experience.md        |
| P2  | Chessbook                     | Coverage target and "go to your biggest gap"            | adopt    | Repertoire coverage at the learner's band, and a link to the biggest gap | experience.md        |
| P3  | Chessly, Chessreps, Chessable | Streaks                                                 | adopt    | A streak and a calendar, from the logs                                   | experience.md        |
| P4  | Chessly                       | XP, currency, shop, wheel, leagues                      | skip     | Reviewers say it crowds out teaching; leagues need a server              | features (this page) |
| P5  | Chesstempo                    | Graphs of learning status over time                     | adopt    | Stats (exists) gains it                                                  | extend               |
| P6  | OpeningTrainer                | A rating per opening                                    | later    | Possible from answer logs; not needed first                              | roadmap              |

## Puzzles and your games

| #   | Seen on                           | Feature                                    | Decision | Our version                                                                                                                                            | Where         |
| --- | --------------------------------- | ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Z1  | Chessreps, Lichess (by opening)   | Puzzles from the openings you study        | adopt    | All 6.2 million Lichess puzzles, matched to positions at several levels                                                                                | puzzles.md    |
| Z2  | Chessbook, Chesstempo, ChessAtlas | Your games checked against your repertoire | adopt    | A Lichess or Chess.com username (both public APIs work from the browser, no token); the first move outside your repertoire in each game becomes a card | experience.md |
| Z3  | OpeningTree                       | A tree of your own games with results      | later    | The map can show your games' moves beside the opening's                                                                                                | roadmap       |
| Z4  | Aimchess, ChessFlare              | Puzzles from your own mistakes             | later    | From Z2: positions where you went wrong, as exercises                                                                                                  | roadmap       |

## Arriving and finding

| #   | Seen on            | Feature                                               | Decision | Our version                                                                                | Where         |
| --- | ------------------ | ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ | ------------- |
| A1  | Chessly, Chessbook | Level question at the start                           | adopt    | First onboarding question; sets the explorer band                                          | experience.md |
| A2  | Chessreps          | "No idea what to pick?" helper; style tags on courses | adopt    | Onboarding suggestions; style tags (solid, attacking, gambit, trap-heavy) on opening cards | experience.md |
| A3  | Chessly            | "Continue on path" from the home page                 | adopt    | Today's main button                                                                        | experience.md |

## Authoring and community

| #   | Seen on                       | Feature                                  | Decision | Our version                                                                  | Where             |
| --- | ----------------------------- | ---------------------------------------- | -------- | ---------------------------------------------------------------------------- | ----------------- |
| C1  | Chessreps, Chessable, Listudy | Make courses from PGN or a Lichess study | adapt    | Create exists (in the browser); add PGN and Lichess-study import             | capabilities.md 7 |
| C2  | Chessreps (complaint)         | Community courses of uneven quality      | avoid    | Publish goes through review (a GitHub contribution, exists); the bar applies | exists            |
| C3  | Chessable                     | Public comments on each variation        | skip     | Needs a server                                                               | —                 |

## Complaints we answer by design

| Complaint                                    | Our answer                                             |
| -------------------------------------------- | ------------------------------------------------------ |
| Paywalls and stacked prices                  | Free, open source                                      |
| Needs a connection                           | Offline after one visit (PWA, exists)                  |
| Too little for under-1000 players, for Black | The first catalogue covers both sides for beginners    |
| Overloading                                  | New moves per day limited (exists); the limit is shown |
| Promised features never shipped              | The roadmap says only what is planned, in order        |

## Ours, not seen elsewhere

- **One map of everything**, coloured by what you know, with gaps and the opponent's common mistakes on it.
- **Transpositions count everywhere** (positions keyed by EPD), in progress, search, puzzles and coverage.
- **Every board you test on hides what would give the answer away**, by one rule.
- **Puzzles matched by the exact position a game passed through**, not only by the opening's name (puzzles.md).
