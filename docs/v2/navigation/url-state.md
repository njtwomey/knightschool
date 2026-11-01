# URL state

What each page keeps in the hash, so a refresh or a shared link restores the view exactly.

## The plan

The rules are v1's, kept: the hash is `#key=value&key=value`, percent-encoded, with empty and default values left out
(so a clear view is an empty hash); moves travel as UCI joined by dots (`e2e4.e7e5`); the page writes the hash as its
view changes, replacing the history entry, and reads it **once** on arrival. A bad value is dropped field by field,
never an error. Everything goes through [use-hash-state](../hooks/use-hash-state.md). What is chosen (an opening, a
step, a mode, a scope) is in the path (routes.md); how it is looked at is in the hash.

| Page                                         | Keys                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [opening](../pages/opening.md)               | `l` the line on the board, `m` the moves from the start to the shown position                                                   |
| [variation](../pages/variation.md)           | `l`, `m` as on the opening page                                                                                                 |
| [step](../pages/step.md)                     | `s` the stage (`read`, `watch`, `try`, `mistakes`, `done`), `m` the moves played, `p` the part of a step with several stretches |
| [checkpoint](../pages/checkpoint.md)         | none: a test starts fresh                                                                                                       |
| [line](../pages/line.md)                     | `o` the opening it was reached from (side, trail, menu item), `m` the moves to the shown position                               |
| [openings](../pages/openings.md)             | `q` the search, `side`, `style`, `level`, `sort`                                                                                |
| [repertoire](../pages/repertoire.md)         | `side` the coverage shown, `d` the depth (5, 10, 15)                                                                            |
| [practice](../pages/practice.md) modes       | `start=due` on Review starts the schedule at once (v1's `dueQuizHref`); a running session is never in the hash                  |
| [drill](../pages/drill.md) of one line       | `m` the moves played, so a refresh carries on from the same move (v1's play page)                                               |
| [puzzles](../pages/puzzles.md), one puzzle   | `m` the moves played after it is solved, while stepping through                                                                 |
| [map](../pages/map.md)                       | `l` the picked line, `m` the picked move's path, `f` the line whose subtree alone is drawn, `z` zoom                            |
| [search](../pages/search.md)                 | `q`, `side`, `kind` (opening, variation, line, idea), `bm` the board search moves, `bk` its kind                                |
| [analysis](../pages/analysis.md)             | `fen` a set-up start, `m` the moves, `c` the cursor when not at the end, `side` when Black is below                             |
| [ideas](../pages/ideas.md)                   | `q`, `kind` (tactic, plan, structure, principle, trap)                                                                          |
| [idea](../pages/idea.md)                     | `tab` (steps, moves, puzzles)                                                                                                   |
| [stats](../pages/stats.md)                   | `tab`, `range` (week, month, all)                                                                                               |
| [settings](../pages/settings.md)             | `q` the settings search, `g` the group, `adv` when Advanced is shown                                                            |
| [create-opening](../pages/create-opening.md) | none beyond its tab, which is in the path                                                                                       |
| [line-editor](../pages/line-editor.md)       | `m` the move looked at, so a refresh returns to it                                                                              |

**Never in the hash:** the Lichess token or a username, anything typed as an answer, a session's queue, and anything
that would let a shared link change someone's data. Opening a link is always safe.

**Old keys still read.** A redirect (routes.md) carries the hash over. Keys whose meaning stays keep their name (`m`,
`q`, `side`, `bm`, `bk`, `fen`, `c`). v1's `v` on a course page meant a line, which v2 calls `l`; it is read as `l`
once. v1's `role` and `tier` on Search are dropped (openings.yaml and tiers are parked). v1's `p` on the play page keeps
its meaning on the step page.

## From v1

- `apps/web/src/router/hash.ts`: `parseHash`, `buildHash`, `encodeMoves`, `decodeMoves`; kept.
- `apps/web/src/router/location.ts`: `setHashState` (replaces, never pushes) and `readHashState`; kept under the hook.
- Pages that use it today: `features/course/course-page.tsx` (`v`, `m`), `features/search/hash-state.ts` (`q`, `role`,
  `side`, `tier`, `scope`, `bm`, `bk`), `features/play/use-play-address.ts` and `resume.ts` (`m`, `p`),
  `features/quiz/quiz-page.tsx` (`start=due`), `features/lab/lab-page.tsx` (`fen`, `m`, `c`, `side`). CLAUDE.md lists
  Lab's keys as `pgn`, `fen`, `ply`, `side`; the code uses `fen`, `m`, `c`, `side`, and the code is what links carry.
- Pages with no hash today that gain one: the tree (`features/tree`), Profile, Create's line editor, Glossary.

## Open questions

1. Should the step's stage be in the path (`/step/3/try`) rather than the hash? The hash keeps the step one address
   while the stages run on one page, which is what experience.md describes.
