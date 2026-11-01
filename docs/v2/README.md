# Knight School v2

v1 is an opening trainer: a tree of moves, courses that pick lines from it, and ways to replay them. v2 keeps all of
that, calls each course an opening, and widens the aim to **the first fifteen moves and what they lead to**: the moves,
the ideas behind them, the mistakes both sides make, the tactics that come out of the structures, and the plans that
follow. Still for beginners to about 1600, still browser-only with no server, still written rather than filmed.

v2 is built on the `v2` branch, by channelling what exists into a clearer shape, not by starting again. Every section
below says where the existing piece lives.

## The documents

| File                                | What it settles                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [experience.md](experience.md)      | Who comes, how they arrive, learn, test and see progress; the menu and the pages                           |
| [model.md](model.md)                | The things the site is made of (repertoire, opening, variation, line, step, idea, ...) and how they relate |
| [board.md](board.md)                | The one board, its parts, and how they connect                                                             |
| [capabilities.md](capabilities.md)  | The shared engines underneath: judgement, exercises, progress, Lichess, puzzles, authoring                 |
| [courses.md](courses.md)            | How a v2 opening is made: scope, the bar it must meet, the pipeline                                        |
| [roadmap.md](roadmap.md)            | The order to build it in, and what moves where                                                             |
| [features.md](features.md)          | The survey mapped to what we build: adopt, adapt, later, skip                                              |
| [puzzles.md](puzzles.md)            | All Lichess puzzles matched to positions: levels, uses, the jobs                                           |
| [inventory.md](inventory.md)        | v2 walked through, the reusable components, and every part of v1: keep, repurpose, park, delete            |
| [config.md](config.md)              | Config (how the site behaves, for everyone) as distinct from settings (a learner's choices)                |
| [settings.md](settings.md)          | One settings registry: layers, presets, stores, the page, and everything configurable                      |
| [schemas/](schemas/README.md)       | The data: content files, annotations, built data and the knowledge file, the learner database              |
| [components/](components/README.md) | Every reusable piece of the interface, one file each                                                       |
| [pages/](pages/README.md)           | Every page, one file each                                                                                  |
| [navigation/](navigation/README.md) | Menu, addresses, address state, breadcrumbs, shortcuts, cross-links                                        |
| [hooks/](hooks/README.md)           | Shared behaviour: board model, move interaction, previews, settings, sessions, judgement                   |
| [stores/](stores/README.md)         | The app's state: what each store holds and where it persists                                               |
| [patterns/](patterns/README.md)     | Rules everything follows: interactions, colours, states, timing, reveal, wording, layout, accessibility    |
| [survey.md](survey.md)              | What similar sites do, and what to borrow                                                                  |

## Principles

1. **Learn, try, prove.** Every piece of material is first shown, then tried with help, then tested without it, then
   reviewed on a schedule. Progress is earned, never just visited.
2. **Every judgement explains itself.** A move marked good or bad says why, in words and on the board. A wrong move is
   never only "wrong".
3. **What players at your level actually do.** Openings answer the replies people really play (the Lichess explorer at
   the learner's band) and punish the mistakes they really make. Coverage is measured, not guessed.
4. **Few openings, each excellent.** A small catalogue, every opening meeting one written bar (courses.md), checked by
   the engine and by data.
5. **One of each thing.** One board, one way to run an exercise, one move judgement, one progress model, one menu
   entry per job. v1 already works this way for move numbers, walking a course's tree and practice set-up; v2 extends
   it.
6. **No server.** Everything runs and persists in the browser (SQLite over OPFS, as now). Lichess is called from the
   browser with the learner's own token. Export and import carry everything.
7. **Testing never leaks the answer.** What the board shows (marks, arrows, evaluation, explorer) follows one rule set
   by the exercise, not by each page.

## Words used throughout

The hierarchy, from the top: `repertoire`, `opening`, `variation`, `line`, `step`. Beside it: `idea`, `position` (an
EPD), `move`, and `exercise`, `puzzle`, `verdict`. Each is defined in [model.md](model.md). v1's words map onto them:
a course is an opening, a `section` is a variation, a PGN "chapter" file is a line, and a unit is a step.
