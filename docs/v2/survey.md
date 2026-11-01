# Opening-trainer survey for Knight School v2

Survey date: 1 November 2026. The sources are the sites' own pages, help docs, app-store listings, reviews and forum threads. Chessly's marketing pages render in JavaScript and say little, so its section also draws on the route list and interface text in its public web bundle (chessly.com/_next build manifest and chunks, fetched 1 Nov 2026). Those strings prove a feature exists in the code. They do not prove how prominent it is or that it is switched on for every user. **(unverified)** marks claims I could not confirm from a primary source. Reddit could not be fetched directly, so its views appear only second-hand.

---

## 1. Chessly (chessly.com), Levy Rozman / GothamChess

- **Arrival and onboarding:** The landing page offers "Try for Free". Onboarding asks for a username, then "What is your elo?" (with a "What is an elo?" explainer), then an optional Chess.com account link that earns XP. A "Free Daily Learning" model lets a free user pick one _Daily Free Tile_ ("Choose carefully") and repeat it.
- **Learning flow and vocabulary:** Opening courses are split into Course, Chapter, Study, and then _tiles_, _lines_ and a _path-video_ (routes `/courses/:id/chapters/:ch/studies/:study/tiles/:tile`). The home page is an "Opening Path" (`Home - Opening Path`, "Continue on path", "Show in Path", "Redo tile"). Each chapter opens with a short video in which Levy explains the ideas, and the variations are then played on the board. Non-opening and skill courses use Chapter, then Lesson, then Practice. Opening courses are split into White and Black.
- **Testing:**
  - _Drill_ after each variation, with the messages "Variation Complete!" and "Perfect Drill".
  - _Drill Shuffle_: a set-up screen ("Which courses do you want to drill?") mixes lines across courses and chapters.
  - _Redo drills_ and a _Review_ route, then session results.
  - The site never says whether review uses spaced repetition **(unverified)**.
  - **Levi bot** "is using Maia chess engine to play moves that actual humans might play". It plays lines from the chapters you choose, and you can set "Prevent deviations" or let it deviate. After a deviation it grades you: "Your response to the deviation from Levi kept your advantage / gave advantage", judged 3 moves after the deviation. It plays at three strengths and has its own game review.
- **Feedback:** The board marks moves Correct or Incorrect. Off-course moves get snarky lines ("That maneuver deviates from the prescribed path, bozo..."), and Stockfish runs in the browser for analysis. I could not verify any eval bar or move-classification symbols.
- **Progress and gamification (the heaviest of any site here):**
  - XP and levels, streaks with a streak freeze ("We have frozen your streak!"), achievements and badges.
  - _Today's Tasks_ that pay out _Pawns_, a currency spent in a _Pawn Shop_ on avatars and skins.
  - A daily _reward wheel_, gift boxes ("XP to Next Gift") and a global _Community Challenge_.
  - Weekly league divisions with promotion and demotion zones: Wooden Pawn, Bronze Bishop, Silver Rook, Metal Knight and Golden Queen. Joining is opt-in.
  - An "Opening Rating", completed courses and profiles.
- **Navigation:** Home (path), Courses, Play Levi, Leaderboards, Profile, Analyze, Pawn Shop, Settings.
- **Puzzles:** none tied to openings. **Authoring:** none for users.
- **Complaints:** Trustpilot (3.7, 10 reviews) says it became "just another drill website", the promised progress tracking never came, the weekly report cards are thin, and billing is confusing. Reviewers rate it highly for beginner to intermediate players and say it gets thin above about 1800.
- Sources: https://chessly.com/ · https://chessly.com/roadmap · https://www.trustpilot.com/review/chessly.com · https://www.chess.com/forum/view/chess-equipment/new-chess-equipment-sort-of-chessly-2-0-initial-impressions · https://apps.apple.com/ie/app/chessly/id6755246258

## 2. Chessreps (chessreps.com)

- **Arrival:** The catalogue opens with "No idea what to pick?", which offers a first White opening, an answer to 1.e4 or a chaotic style, and links a beginner guide. There are 28 house courses (647 lines), split into White and Black, each with a style tag (Classical, Attack, Gambit, Solid, Trap-heavy, Counterattack) and a line count. The first lines of every course are free. Membership is $4.99 a month or $34.99 a year on the web (higher in the app).
- **Learning flow:** A course is one PGN tree with no chapters, flattened into 30 to 50 lines of 12 to 15 moves, and learners never browse the tree. Every learner move carries a short, witty note, and a note is keyed to each position. Each course page also has a written guide: overview, main variations, plans, history and FAQ.
- **Modes, each with its own colour and a per-course counter** ("Learn 0/40, Drill 0/3 lines…"):
  - _Learn_ (violet): play against a bot with hints. It builds a "practice cohort" from your weakest lines and widens it as you improve.
  - _Practice_: recall without hints ("1 line away" from perfect).
  - _Drill_ (red): as many lines in a row as you can, with no hints. The streak goes on the leaderboard.
  - _Time Trials_ (blue): a 60-second clock, with time added for each completed line, scaled by its length, while the clock speeds up.
  - _Puzzles_ (green): tactics from real games that reached the course's positions.
  - _Arena_: surprise bot play, praised in testimonials. I could not verify its exact rules.
  - The site also claims spaced repetition, without describing it.
- **Progress:** per-mode counts, a streak counter, and daily, weekly and all-time leaderboards for Drill and Time Trials.
- **Authoring:** a Course Creator for members. You import a PGN made in ChessBase, a Lichess study or similar, with one learner move per position and notes as `{}` comments on learner moves. Hundreds of community courses exist, and reviews say their quality varies.
- **Complaints (App Store):** learners cannot pick sub-variations freely before finishing a course, it covers little past the opening, there are too few Black courses, and there is no own-game import or deviation check.
- Sources: https://www.chessreps.com/about · https://www.chessreps.com/openings · https://www.chessreps.com/opening/caro-kann · https://www.chessreps.com/course-author-guide · https://www.chessreps.com/leaderboards · https://www.chessreps.com/love · https://apps.apple.com/app/id6744000612

## 3. Chessable (MoveTrainer)

- **Arrival:** a large store of courses (books) by titled authors, in four difficulty bands (Beginner, Casual, Intermediate, Advanced). Chessable content also sells on Chess.com as "Courses".
- **Flow:** Course, then Chapter, then Variation. _Learn_ shows a line, then quizzes it. _Review_ is spaced repetition, and you only see a move again after you miss it. After a wrong move it shows the right one and replays the line, weighting the misses. Optional video, with "video-sync" showing the variation the author is discussing.
- **Settings:** soft fail, time limits, depth (Pro), study from move 1 or from the branch point, and "difficult moves" review (Pro). Chess.com's version can review "key moves only" or full variations.
- **Progress:** streaks, badges and rubies.
- **Community:** public comments on each variation, and anyone can create a course from PGN.
- **Complaints:** expensive (Pro plus courses plus video), little for players under 1000, overlapping difficulty bands, reviews inflated at 4/5 and up, and gamification that feels like dopamine bait.
- Sources: https://chessentials.com/?p=9809 · https://www.chess.com/announcements/view/new-chess-com-courses · https://notes.andymatuschak.org/zDr94hP6bG3jJYrdYy8B5hx

## 4. Chessbook (chessbook.com)

- **Onboarding:** two empty repertoires (White and Black), your rating band, and a _coverage target_ such as "1 in 300 games".
- **Building:**
  - Replies are ranked by how often players at your level choose them, alongside master popularity, engine evaluation and peer results. Some moves are flagged "rare but dangerous".
  - "Go to your biggest gap" jumps to the most common line you have not covered, and the app tells you when a line has reached your coverage target.
  - You can import from PGN or Lichess.
- **Testing:** daily spaced-repetition tasks, with an option to practise only the most common moves. _Model games_ from master play let you guess the next move from your lines.
- **Own games:** link Chess.com or Lichess, and moves where you left your repertoire are flagged and then quizzed. This is a deviation check against a repertoire you built, not a repertoire built from your games.
- **Pricing and limits:** free up to 200 moves (some reviews say 400), Pro $7 a month. You can export PGN.
- **Complaints:** needs a connection, easy to overload yourself, and numbers that are hard to read.
- Sources: https://www.chessbook.com/ · https://64squares.substack.com/p/chessbook-review · https://apps.apple.com/app/id6466343415

## 5. Listudy (listudy.org)

Free and open source. It trains openings by playing against a repertoire taken from any PGN, including Lichess studies. Each line has a "learnt" score, and the lowest-scoring line comes next. Hint arrows and comments disappear once you have played the move right twice, and come back after two mistakes. It also has tactics (blind and pieceless), endgames against Stockfish, achievements and ten languages. Users have asked for statistics and private studies.
Sources: https://listudy.org/en/about · https://lichess.org/forum/general-chess-discussion/beta-release-of-listudy

## 6. Lichess

- **Learn:** short stages per piece and concept, scored with up to three stars per level (from memory, **unverified**: the page renders client-side).
- **Practice:** five sections (Checkmates, Fundamental tactics, Advanced tactics, Pawn endgames, Rook endgames) with 32 lessons and an overall progress percentage.
- **Studies:** chapters with an _Interactive lesson_ mode (you must find the moves, with hints and right or wrong feedback) and _Hide next moves_ for guess-the-move.
- **Puzzles:** themes, plus **puzzles by opening** (lichess.org/training/openings), listed by family and variation with counts.
- **Explorer:** Masters, Lichess games (filtered by rating and time control) and Player tabs.
- **Analysis:** inaccuracy ?!, mistake ? and blunder ??, with an accuracy figure and "Learn from your mistakes". The colours (yellow, orange, red) are from memory **(unverified)**.
- **Missing:** built-in spaced repetition, which users keep asking for.
- Sources: https://lichess.org/practice · https://lichess.org/training/openings · https://lichess.org/blog/WtDErSQAADJfhJJs/interactive-lessons · https://lichess.org/forum/general-chess-discussion/do-you-use-anything-to-memorize-openings

## 7. Chess.com

- **Lessons:** a _Learn Path_ in four colour-coded levels (New to Chess, Beginner, Intermediate, Advanced), each made of courses, lessons and challenges. Tiles show locked, available or completed, and a graduation cap marks the end of a course. The first lesson of each course is always open, and skipping ahead asks you to confirm. A coach voice explains along the way. Basic members get one lesson a day.
- **Courses:** Chessable's MoveTrainer, reviewing either key moves or full variations.
- **Practice (formerly Drills):** themed positions played against the engine, with a strength setting.
- **Game Review** grades moves by expected points lost:
  - Best (0), Excellent (up to 0.02), Good (up to 0.05), Inaccuracy (up to 0.10), Mistake (up to 0.20), Blunder (0.20 or more, which must also lose material or allow mate).
  - Miss: a tactic or a punishment you failed to find.
  - Great: the only good move, or one that turns a game around.
  - Brilliant: a sound sacrifice.
  - Book: a known opening move.
  - The icon colours (teal !!, blue !, green star, yellow ?!, orange ?, red ??) are from memory **(unverified)**.
  - The coach draws arrows when you hover a phrase in its explanation, and the review ends with grades for opening, middlegame and endgame.
- **Complaints:** classifications are noisy, and practising an opening against the bots is clumsy.
- Sources: https://support.chess.com/en/articles/8609703-how-do-lessons-work · https://support.chess.com/en/articles/8572705-how-does-game-review-work · https://www.chess.com/news/view/chesscom-launches-game-review-v2 · https://support.chess.com/en/articles/8724749-what-is-practice-on-chess-com

## 8. Chesstempo (opening trainer)

Free. You build several White and Black repertoires by entering moves or importing PGN, then train them with spaced repetition. Training can be narrowed to one branch, a depth, or "the moves most resistant to learning". Graphs show learning status and history over time. You can comment on moves and read other users' public notes. After an online game it shows where you left your repertoire, or adds the opponent's line to it. The explorer stops at 10 moves for free users.
Source: https://el.chesstempo.com/opening-training/

## 9. ChessAtlas (chessatlas.net), new

Free core features. You can build a repertoire from PGN, from your Lichess or Chess.com games, by hand, or from its library, where each opening includes traps. It trains with **FSRS**. A _Deviation Finder_ flags the exact move where a real game left your prep. Native apps sync with the web. I confirmed this on its home page. The premium price is **unverified**.
Sources: https://chessatlas.net/ · https://chessatlas.net/features/vs-chessreps

## 10. ChessFlare (chessflare.com), new

A study workspace: a PGN editor with a move tree (variations, comments, arrows, priorities), engine analysis, an "AI coach", game summaries, blunder review and weak-spot puzzles. Its opening-trainer flow is Build, Separate and learn (split into small lessons), Spaced review, then Fix. Its own comparison page says the review uses SM-2, but the home page only says "adaptive intervals" (**unverified** SM-2). Pricing is free, $6.49 a month, or $110 lifetime.
Sources: https://chessflare.com/ · https://chessflare.com/resources/chessflare-vs-chessreps

## 11. Chessdriller (chessdriller.org)

A free, open-source beta. You sign in with Lichess, your repertoire lives in your Lichess studies, and the app drills it with spaced repetition. The menu is Study, Repertoire, PGNs and FAQ. I could not verify the details of how a drill runs.
Source: https://chessdriller.org/

## 12. OpeningTree (openingtree.com) and "OpeningTrainer" (openingtrainer.com)

- **OpeningTree:** free and open source (GPL). It loads your Chess.com or Lichess games (or GM games, or a PGN), applies filters, and builds a tree on a board with win, draw and loss figures for each move. It is a mirror of how you really play, not a trainer. The exact filters are **unverified**.
- **OpeningTrainer:** a separate site that does exist, so this is not a mix-up with OpeningTree. It needs no signup. The opponent picks replies in proportion to Lichess frequencies (a 68% move is played 68% of the time), and you get a rating for each opening with progress charts.
- Sources: https://github.com/openingtree/openingtree · https://openingtrainer.com/

## 13. Shorter entries

- **Aimchess:** analyses your linked games across six skill areas, one of them opening performance. Its _Opening Improver_ replays positions where you went wrong in the opening and teaches the better move. https://www.aimchess.com/
- **Chessmood:** GM video courses with puzzles after each lesson, a weekly _Track_ of Study, Practice and Fix goals with progress rings, and game sync with an AI study plan. I found no spaced repetition. https://chessmood.com/
- **Noctie:** a human-like AI opponent that answers with common human replies to your chosen opening. Third-party listings say it also offers repertoire import, colour-coded feedback and a deck of puzzles from your own mistakes **(unverified)**. About $15 a month. https://chessiverse.com/compare/chess-opening-practice-tools-compared
- **Dr. Wolf (Chess.com):** a coach that talks during a game, praising and criticising moves (yours and his) with reasons, with lessons on openings and other topics. Three free games, then $5.99 a month. https://apps.apple.com/app/id1353041020
- **Other newer tools:**
  - Chessboard Magic _Repertoire Builder_: practise against Stockfish, the Lichess database or your own games, and play against Maia. https://wiki.chessboardmagic.com/Releases
  - Maia: opening drills.
  - Chessiverse: more than 1,000 Maia-based bots, each with its own opening preferences.
  - Pawn Dojo, Chessmate, Lotus Chess: smaller opening-drill apps.

---

## Feature matrix

Y = has it, ~ = partial or unverified, - = no.

| Feature                                | Chessly              | Chessreps          | Chessable | Chessbook            | Listudy | Lichess                  | Chess.com      | Chesstempo | ChessAtlas | ChessFlare | OpeningTrainer     |
| -------------------------------------- | -------------------- | ------------------ | --------- | -------------------- | ------- | ------------------------ | -------------- | ---------- | ---------- | ---------- | ------------------ |
| Rating or level question at start      | Y (Elo)              | ~ ("what to pick") | ~ (bands) | Y (rating, coverage) | -       | -                        | Y (path level) | -          | -          | -          | -                  |
| Curated courses                        | Y                    | Y                  | Y         | ~                    | -       | ~ (studies)              | Y              | -          | Y          | Y          | -                  |
| Video                                  | Y                    | -                  | Y         | -                    | -       | -                        | Y              | -          | -          | -          | -                  |
| Note on every learner move             | Y                    | Y                  | Y         | ~                    | ~       | ~                        | Y              | ~          | ~          | Y          | -                  |
| Learn, then drill                      | Y                    | Y                  | Y         | ~                    | Y       | ~                        | Y              | ~          | Y          | Y          | -                  |
| Spaced repetition                      | ~                    | Y (claimed)        | Y         | Y                    | Y       | -                        | Y              | Y          | Y (FSRS)   | Y          | -                  |
| Path or unlock gates                   | Y                    | ~                  | -         | -                    | -       | Y (Learn)                | Y              | -          | -          | ~          | -                  |
| Timed mode                             | -                    | Y                  | ~         | -                    | -       | -                        | -              | -          | -          | -          | -                  |
| Bot plays on from the line             | Y (Maia, deviations) | Y (Arena)          | -         | -                    | -       | Y (practice vs computer) | Y              | -          | -          | -          | Y (frequency)      |
| Opponent replies weighted by frequency | ~                    | Y                  | -         | Y                    | -       | -                        | -              | -          | -          | -          | Y                  |
| Puzzles from the course's openings     | -                    | Y                  | -         | -                    | -       | Y (by opening)           | -              | -          | ~ (traps)  | ~          | -                  |
| Move classification symbols            | -                    | -                  | -         | -                    | -       | Y                        | Y              | -          | ~          | ~          | -                  |
| Coverage or gap finder                 | -                    | -                  | -         | Y                    | -       | -                        | -              | -          | -          | -          | -                  |
| Own-game deviation check               | ~ (planned)          | -                  | -         | Y                    | -       | -                        | -              | Y          | Y          | ~          | -                  |
| Streaks / XP / leagues                 | Y/Y/Y                | Y/-/boards         | Y/~/-     | -                    | ~       | -                        | Y/~/-          | -          | -          | -          | per-opening rating |
| User authoring or PGN import           | -                    | Y                  | Y         | Y                    | Y       | Y                        | -              | Y          | Y          | Y          | -                  |
| Lichess study import                   | -                    | Y (PGN)            | ~         | Y                    | Y       | n/a                      | -              | ~          | Y          | Y          | -                  |
| Free core                              | ~ (daily tile)       | first lines        | ~         | 200 moves            | Y       | Y                        | ~              | Y          | Y          | ~          | Y                  |

---

## Patterns worth borrowing

1. **Named modes with their own colours and a counter on each course** (Chessreps: Learn 0/40, Drill 0/3, Time, Puzzles). One glance at a course says what to do next. Knight School already has Learn, Drill, Quiz and Speed, and could show this kind of counter on the course and Path pages.
2. **Explanatory notes with a voice.** Chessreps' witty notes and Chessly's snark are the most praised feature in both sets of testimonials. Plain English can still be friendly.
3. **The opponent leaves the book, and the app grades your recovery** (Chessly's Levi). The Maia bot follows chosen chapters, optionally deviates, and then judges "kept / gave away your advantage" three moves later. This fits Knight School's in-browser Stockfish: play on from the end of a line, or after a weighted deviation, and grade the evaluation change.
4. **Replies weighted by frequency** (OpeningTrainer, Chessbook, Chessreps). Knight School already weights the computer's replies by popularity, so it can say so in the interface ("plays what 1000 to 1600 players play").
5. **Coverage target and "biggest gap"** (Chessbook). A per-course figure such as "covers 92% of games you will meet at 1000 to 1600", built from the Lichess popularity data the build already ships, plus a link to the most common uncovered reply (`make gaps` already computes these).
6. **Puzzles tied to the opening** (Chessreps; Lichess by-opening index). Lichess's public-domain puzzle database is tagged by opening, so the build could ship a few puzzles per course offline.
7. **Repertoire from your own games and deviation tracking** (Chessbook, Chesstempo, ChessAtlas; OpeningTree for the raw tree; Aimchess for opening mistakes). Paste a Lichess username, fetch recent games from the browser (Lichess's games API allows CORS), and show the first move in each game that left your courses, as a deviation card queued for review. This needs no backend. The research holds up: three trainers offer it and their users value it.
8. **Path with a daily task** (Chessly: Opening Path, tiles, Today's Tasks; Chess.com: locked, available and completed tiles; first lesson always open; skipping asks to confirm). Knight School's Path tab and its "Next unit" session are the same idea. Borrow the plain tile states and the "continue on path" entry point on Home.
9. **"What to pick" helpers at arrival** (Chessreps: a first White opening, an answer to 1.e4, a chaotic style; Chessly: the Elo question). A three-question start that leads to one recommended course per side.
10. **Hints that fade** (Listudy hides arrows after two correct plays and brings them back after two mistakes). This is cheap and fits the learn-then-drill gap.
11. **Game Review's vocabulary** (Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Miss) is what beginners already know. Map Knight School's regret bands onto these familiar words and symbols, and keep Brilliant out.

## Pitfalls users complain about

- **Paywalls and price stacking** (Chessable Pro plus courses plus video; Chessly's billing confusion). Knight School being free and offline is a real advantage, so say so.
- **Gamification that crowds out teaching.** Chessly's Pawns, wheel, gifts and leagues sit beside "just another drill website" reviews, and the Chessable reviewer called streaks and rubies dopamine bait. Keep streaks light, and leave out currencies and leagues.
- **Being locked into a course's order.** Chessreps users want to pick any sub-variation before finishing the course. Allow free choice alongside the path.
- **Overloading.** Chessbook users add too many moves, and Chessable's deep lines bury beginners. Card limits and popularity thresholds help, so make them visible.
- **Thin explanations or none.** Pure drill sites are criticised for teaching moves without reasons, which is why notes on every move matter.
- **Promised features that never ship** (Chessly's roadmap: progress matrix, repertoire). Users remember.
- **Quality of community courses varies** (Chessreps). If Publish feeds a shared catalogue, it needs a review step.
- **Too little for under-1000 players** (Chessable) and **too little for Black** (Chessreps).
- **Online-only apps** (Chessbook). Knight School's offline PWA answers this.
