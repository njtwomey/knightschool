# URL state

What each page keeps in the hash, so a refresh or a shared link restores the view exactly.

## The plan

The rules are v1's, kept: the hash is `#key=value&key=value`, percent-encoded, with empty and default values left out
(so a clear view is an empty hash); moves travel as UCI joined by dots (`e2e4.e7e5`); the page writes the hash as its
view changes, replacing the history entry, and reads it **once** on arrival. A bad value is dropped field by field,
never an error. Everything goes through [use-hash-state](../hooks/use-hash-state.md). What is chosen (an opening, a
step, a mode, a scope) is in the path (routes.md); how it is looked at is in the hash.

| Page                                                                                                                       | Keys                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [onboarding](../pages/onboarding.md)                                                                                       | `q` the question showing (`level`, `white`, `black`), `band`, `white`, `e4`, `d4` the answers so far                 |
| [repertoire](../pages/repertoire.md)                                                                                       | `side` the side whose gaps are listed                                                                                |
| [openings](../pages/openings.md)                                                                                           | `side`, `against` (`e4`, `d4`, `c4`, `other`), `style`, `level`, `track`, `q`, `view` (`cards`, `table`)             |
| [opening](../pages/opening.md)                                                                                             | `v` the variation unfolded, `m` the board's moves from the start                                                     |
| [variation](../pages/variation.md)                                                                                         | `m` the board's moves                                                                                                |
| [step](../pages/step.md)                                                                                                   | `stage` (`read`, `watch`, `try`, `mistakes`, `done`), `m` the moves played, `part` in a step with several stretches  |
| [checkpoint](../pages/checkpoint.md)                                                                                       | none: a test starts fresh                                                                                            |
| [line](../pages/line.md)                                                                                                   | `ply` the board's position along the line                                                                            |
| [practice](../pages/practice.md), [review](../pages/review.md), [speed](../pages/speed.md), [name-it](../pages/name-it.md) | none: a session is never rebuilt from the address                                                                    |
| [drill](../pages/drill.md)                                                                                                 | `m` the moves played, so a refresh resumes the branch (v1's play page)                                               |
| [puzzles](../pages/puzzles.md), one puzzle                                                                                 | `m` the moves played                                                                                                 |
| [play-on](../pages/play-on.md)                                                                                             | `m` the moves played, `leave=early` for the leaving-the-book variant                                                 |
| [your-games](../pages/your-games.md)                                                                                       | the list: `who` (`you`, `them`, `all`), `slot` (`white`, `e4`, `d4`); one game: `ply`                                |
| [map](../pages/map.md)                                                                                                     | `line` the picked line, `m` the board's move, `focus` the subtree drawn alone, `layers`, `zoom`                      |
| [search](../pages/search.md)                                                                                               | `q`, `role` (`play`, `against`), `side`, `scope`, `kind`, `bm` the board search's moves, `bk` its filter (v1's keys) |
| [board](../pages/board.md)                                                                                                 | `fen` a set-up start, `m` the moves, `ply` the cursor when not at the end, `side` when Black is below                |
| [ideas](../pages/ideas.md)                                                                                                 | `kind` (`tactic`, `plan`, `structure`, `principle`, `trap`), `q`, `mine=1` (only ideas in your openings)             |
| [idea](../pages/idea.md)                                                                                                   | `m` when the board has been moved off the diagram                                                                    |
| [stats](../pages/stats.md)                                                                                                 | `range` (`7d`, `30d`, `90d`, `all`), `opening`                                                                       |
| [settings](../pages/settings.md)                                                                                           | `q` the settings search, `key` a row to scroll to and highlight, `advanced=1` (the group is in the path)             |
| [create-opening](../pages/create-opening.md)                                                                               | `v` the variation unfolded on Steps (the tab is in the path)                                                         |
| [line-editor](../pages/line-editor.md)                                                                                     | `m` the move looked at, so a refresh returns to it                                                                   |

**Never in the hash:** the Lichess token or a username, anything typed as an answer, a session's queue, and anything
that would let a shared link change someone's data. Opening a link is always safe.

**Old keys still read.** A redirect (routes.md) carries the hash over. Keys whose meaning stays keep their name (`m`,
`q`, `role`, `side`, `scope`, `bm`, `bk`, `fen`). v1's `v` on a course page meant a line; v2's `v` is a variation, so
the old `v` is dropped on the redirect and `m` alone puts the board back. v1's `c` on Lab is read as `ply` once.
v1's `tier` on Search is dropped (tiers are parked); v1's `scope=courses` reads as `openings`. v1's `p` on the play
page is read as `part` on the step page, and `#start=due` on the quiz is ignored, since `/practice/review` starts the
due session at once.

## From v1

- `apps/web/src/router/hash.ts`: `parseHash`, `buildHash`, `encodeMoves`, `decodeMoves`; kept.
- `apps/web/src/router/location.ts`: `setHashState` (replaces, never pushes) and `readHashState`; kept under the hook.
- Pages that use it today: `features/course/course-page.tsx` (`v`, `m`), `features/search/hash-state.ts` (`q`, `role`,
  `side`, `tier`, `scope`, `bm`, `bk`), `features/play/use-play-address.ts` and `resume.ts` (`m`, `p`),
  `features/quiz/quiz-page.tsx` (`start=due`), `features/lab/lab-page.tsx` (`fen`, `m`, `c`, `side`). CLAUDE.md lists
  Lab's keys as `pgn`, `fen`, `ply`, `side`; the code uses `fen`, `m`, `c`, `side`, and the code is what links carry.
- Pages with no hash today that gain one: the tree (`features/tree`), Profile, Create's line editor, Glossary.
