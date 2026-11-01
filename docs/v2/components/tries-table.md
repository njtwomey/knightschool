# Tries table

Every move guessed in a session in one table, filling in as the learner plays, each row able to take the board back to
it. It is for moves only: [Name it](../pages/name-it.md) guesses names, and its summary keeps its own list of names
guessed with their credit.

## Shows

One row per move asked, newest at the bottom:

| Column     | What it holds                                                                           |
| ---------- | --------------------------------------------------------------------------------------- |
| Move       | where it was asked, as a [move-chip](move-chip.md) of the move before ("after 3...Nf6") |
| Your tries | every move tried, in order, each a chip with its [verdict-badge](verdict-badge.md)      |
| Answer     | the opening's move (blank until answered)                                               |
| Cost       | centipawns lost against the opening's move, and the drop in winning chances             |
| Time       | seconds to the first try                                                                |
| Help       | hint or shown, as small icons                                                           |

Above it, one summary line: "12 moves, 9 first time, 2 as good but not your repertoire move, 1 mistake, average cost
18".

## Configuration

- From the session ([use-exercise-session](../hooks/use-exercise-session.md)): every try, its grade, time and help.
- From the judgement ([use-judgement](../hooks/use-judgement.md)): the cost, which may arrive later.
- `phase`: `live` (beside the board) or `summary` (at the end, in [session-summary](session-summary.md)).
- Settings read: `feedback.triesTable` (live, only at the end, or off), `feedback.triesColumns` (which of cost, winning
  chance, time, help), `feedback.triesRightMoves` (list right moves too, or only the wrong ones).

## Behaviour

- **Click a row**: the board's cursor goes to that position and shows the learner's move as a played arrow with the
  refutation ready to step through; the [board-feedback](board-feedback.md) panel shows that row's verdict. During a
  live exercise this is looking back: the exercise waits and "Back to the line" returns.
- **Hover a row**: the board lights the tried move's squares; hover a tried move chip for its position preview.
- The row for the move being asked shows only "…" until it is answered; nothing in the table leaks the answer.
- A cost fills in when known ("…" until then); baked analysis makes most immediate, the rest come from the browser
  engine one at a time after the session if the engine is on.
- Sortable by any column in the summary phase ([sortable-table](sortable-table.md)); live it keeps play order.
- Empty: "Your moves will appear here."

## Composed of

[sortable-table](sortable-table.md), [move-chip](move-chip.md), [verdict-badge](verdict-badge.md),
[icon-action](icon-action.md).

## Used by

[board](board.md) (`Board.Tries`), [session-summary](session-summary.md); pages [step](../pages/step.md) (Try),
[review](../pages/review.md), [drill](../pages/drill.md), [play-on](../pages/play-on.md),
[checkpoint](../pages/checkpoint.md), [stats](../pages/stats.md) (most missed moves).

## From v1

Repurpose `apps/web/src/features/quiz/miss-list.tsx` (wrong moves with their cost, checked after the quiz) and
`features/quiz/regret.ts` (baked first, then the engine), over core `training/regret.ts` (`moveRegret`,
`regretSummary`). New: live during the session, every try rather than only the last (needs the attempts log agreed in
../capabilities.md section 4), time and help columns, rows that move the board.
