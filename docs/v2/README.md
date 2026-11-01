# Knight School v2

v1 is an opening trainer: a tree of moves, courses that pick lines from it, and ways to replay them. v2 keeps all of
that and widens the aim to **the first fifteen moves and what they lead to**: the moves, the ideas behind them, the
mistakes both sides make, the tactics that come out of the structures, and the plans that follow. Still for beginners
to about 1600, still browser-only with no server, still written rather than filmed.

v2 is built on the `v2` branch, by channelling what exists into a clearer shape, not by starting again. Every section
below says where the existing piece lives.

## The documents

| File                               | What it settles                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| [experience.md](experience.md)     | Who comes, how they arrive, learn, test and see progress; the menu and the pages                |
| [model.md](model.md)               | The things the site is made of (course, chapter, lesson, line, idea, ...) and how they relate   |
| [board.md](board.md)               | The one board, its parts, and how they connect                                                  |
| [capabilities.md](capabilities.md) | The shared engines underneath: judgement, exercises, progress, Lichess, puzzles, authoring      |
| [courses.md](courses.md)           | How a v2 course is made: scope, the bar it must meet, the pipeline                              |
| [roadmap.md](roadmap.md)           | The order to build it in, and what moves where                                                  |
| [features.md](features.md)         | The survey mapped to what we build: adopt, adapt, later, skip                                   |
| [puzzles.md](puzzles.md)           | All Lichess puzzles matched to positions: levels, uses, the jobs                                |
| [inventory.md](inventory.md)       | v2 walked through, the reusable components, and every part of v1: keep, repurpose, park, delete |
| [survey.md](survey.md)             | What similar sites do, and what to borrow                                                       |

## Principles

1. **Learn, try, prove.** Every piece of material is first shown, then tried with help, then tested without it, then
   reviewed on a schedule. Progress is earned, never just visited.
2. **Every judgement explains itself.** A move marked good or bad says why, in words and on the board. A wrong move is
   never only "wrong".
3. **What players at your level actually do.** Courses answer the replies people really play (the Lichess explorer at
   the learner's band) and punish the mistakes they really make. Coverage is measured, not guessed.
4. **Few courses, each excellent.** A small catalogue, every course meeting one written bar (courses.md), checked by
   the engine and by data.
5. **One of each thing.** One board, one way to run an exercise, one move judgement, one progress model, one menu
   entry per job. v1 already works this way for move numbers, walking a course and practice set-up; v2 extends it.
6. **No server.** Everything runs and persists in the browser (SQLite over OPFS, as now). Lichess is called from the
   browser with the learner's own token. Export and import carry everything.
7. **Testing never leaks the answer.** What the board shows (marks, arrows, evaluation, explorer) follows one rule set
   by the exercise, not by each page.

## Words used throughout

`position` (an EPD), `move`, `line`, `lesson`, `chapter`, `course`, `repertoire`, `idea`, `exercise`, `puzzle`,
`verdict`. Each is defined in [model.md](model.md).
