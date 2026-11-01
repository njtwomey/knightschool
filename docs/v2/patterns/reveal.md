# Reveal

What the board and everything round it show while studying, learning, testing and after answering, set by one level
per board so testing never leaks the answer.

## The rule

A page picks a board preset ([board](../components/board.md)); the preset sets the reveal level; every part reads the
level from the board model. No page turns individual parts on or off.

| Level      | Marks | System arrows    | Evaluation | Explorer | Comments               | Move table          | Names in the trail      |
| ---------- | ----- | ---------------- | ---------- | -------- | ---------------------- | ------------------- | ----------------------- |
| `study`    | yes   | yes              | yes        | yes      | yes                    | the whole line      | yes                     |
| `learn`    | yes   | the move to play | yes        | no       | yes, ahead of the move | up to the move now  | yes                     |
| `test`     | no    | hint only        | no         | no       | no                     | moves played so far | not the one being asked |
| `answered` | yes   | the right move   | yes        | yes      | yes                    | moves played so far | yes                     |

- **`test` becomes `answered`** when the learner has answered: right, or shown after two wrong tries, or Show me.
  The next exercise returns to `test`.
- **Hint and Show me are deliberate reveals**, counted in the [tries-table](../components/tries-table.md): Hint shows
  the piece (a ring and pulse), Show me the move (the play arrow). Neither changes the level for the rest of the board.
- **Nothing ahead is drawn in a test**: no [move-chip](../components/move-chip.md) for a move not yet played, no
  preview of it on hover ([interactions](interactions.md)), no line name that gives it away (Name it hides the
  opening's name everywhere, the trail included, until answered).
- **The verdict of a wrong move is not a leak**: in `test` a wrong move still gets its verdict and why, but the
  refutation arrow shows the punishment, never the right move.
- **Where you stand**: no eval bar while answering; once answered, and at the end of every line and puzzle, the
  position in words and numbers ([eval-words](../components/eval-words.md)).
- The `thumb` preset shows marks only; `analysis` and `author` are `study`.
- One learner setting reaches in: `board.marksWhileStudying` (on by default) can hide marks in `study` and `learn` for
  someone who wants a clean board. No setting can show more in `test`.

| Preset     | Level               | Used by                                                                    |
| ---------- | ------------------- | -------------------------------------------------------------------------- |
| `study`    | study               | opening page, line, map, idea pages, a step's Read                         |
| `learn`    | learn               | a step's Watch                                                             |
| `test`     | test, then answered | a step's Try and Their mistakes, Review, Drill, Checkpoint, Speed, Name it |
| `puzzle`   | test, then answered | puzzles                                                                    |
| `analysis` | study               | the Board page (`/board`), after a puzzle, Play on's review                |
| `author`   | study               | Create                                                                     |
| `thumb`    | marks only          | cards, search results, the Today hero                                      |

## Where it applies

Every board and every board part: [board-surface](../components/board-surface.md),
[board-notes](../components/board-notes.md), [board-eval](../components/board-eval.md),
[board-explorer](../components/board-explorer.md), [move-table](../components/move-table.md),
[tries-table](../components/tries-table.md), [mark-key](../components/mark-key.md); and
[breadcrumbs](../components/breadcrumbs.md) for names. The model holds the level
([use-board-model](../hooks/use-board-model.md)).

## From v1

Each page decides by hand today:

- `apps/web/src/features/play/play-page.tsx`: marks only while learning and not exploring; `evalBar: learning`.
- `features/quiz/move-view.tsx`: marks only once the card is done.
- `features/line/about-tab.tsx`: marks always (study).
- `components/board/study-board.tsx` takes `marks`, `controls.evalBar`, `engine` and `controls.hint` / `show` as props
  per page; `components/board/mark-key.tsx` follows whatever marks it is given.
- `CLAUDE.md` states the rule in words ("never on a board that tests"); v2 makes it the model's job.
