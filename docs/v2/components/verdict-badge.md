# Verdict badge

How good a move was, as a symbol and a colour, the same everywhere a grade appears.

## Shows

A small badge with a symbol and, in the wide form, a word:

| Grade      | Symbol | Meaning, for the learner                                              |
| ---------- | ------ | --------------------------------------------------------------------- |
| Book       | a book | the opening's own move; for the opponent, any move in the theory tree |
| Best       | ★      | the engine's first choice, not in the book                            |
| Excellent  | !      | almost as good as the best                                            |
| Good       | ✓      | a sound move that gives a little away                                 |
| Inaccuracy | ?!     | gives away part of an advantage                                       |
| Mistake    | ?      | gives away a clear advantage, or a piece in a quiet way               |
| Blunder    | ??     | loses the game or a lot of material                                   |
| Miss       | ✗      | a punishment that was there and was not found                         |

A move that is not the line's move but is as good keeps its own grade (Good or Excellent) and carries a second, quiet
mark: **not your repertoire move** (a small branch icon with those words in the wide form). The learner is then asked
for the line's move ([capabilities](../capabilities.md) section 2, [wording](../patterns/wording.md)).

Colours come from the one table in [colours](../patterns/colours.md), readable in light and dark and never only colour
(the symbol is always there). The same symbol is drawn on the board's target square by
[board-surface](board-surface.md).

## Configuration

- `verdict`: the grade, its source (author, baked, live) and cost, from [use-judgement](../hooks/use-judgement.md).
- `form`: `symbol` (in a move chip or on a square), `word` ("Mistake ?"), `full` (word and cost: "Mistake ?, -1.4").
- Config read: `judge.grades` (the winning-chance cut-offs for each grade, [config](../config.md)). Settings read:
  none of its own; how much is said around it is [verdict-note](verdict-note.md)'s job.

## Behaviour

- Hover, focus or long-press: a [hint](hint.md) with the meaning and the source: "Mistake: gives away a clear
  advantage. Judged by the engine at depth 14." An author's grade says "Marked by the author".
- **Pending**: while the judgement is still working, a quiet "…" of the same size, so nothing moves when it arrives.
- **Unknown**: no badge at all (the engine is off and nothing is baked); never a guess.
- The grade of a move is not the same as right or wrong: in a test a Good move that is not the book move is still not
  the answer. It gets no cross; it gets the "not your repertoire move" mark and a request for the line's move. The
  badge says how good it was.

## Composed of

shadcn `Badge`, [hint](hint.md).

## Used by

[move-chip](move-chip.md), [board-feedback](board-feedback.md), [verdict-note](verdict-note.md),
[tries-table](tries-table.md), [board-explorer](board-explorer.md), [board-eval](board-eval.md),
[move-explanation](move-explanation.md), [map-tree](map-tree.md) (the opponent's common mistakes).

## From v1

New. Grows from core `training/regret.ts` (`RegretVerdict`: better, slip, inaccuracy, mistake, with `SLIP_CP` 30 and
`MISTAKE_CP` 100) and the badges in `apps/web/src/features/quiz/miss-list.tsx`; NAG words in
`features/course/position-details.tsx`. v2 grades by the drop in winning chances (../capabilities.md section 2).
