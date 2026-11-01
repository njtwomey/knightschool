# useBoard

Reads the nearest board's model from context, so a board's parts stay in step with no wiring.

## Gives

The model made by [use-board-model](use-board-model.md), or one slice of it. A part asks only for what it draws, so the
explorer does not re-render when feedback changes:

- `useBoard()`: the whole model (state and actions);
- `useBoard(select)`: one value picked from it, such as the shown position, the reveal level or the last feedback.

A sketch: `const epd = useBoard((b) => b.position.epd)`.

## Takes

Optionally a selector. Nothing else: it finds the model from the enclosing [board](../components/board.md).

## Behaviour

- Outside a board it throws in development and returns nothing in production, so a part dropped on a page without a
  board fails loudly while being built and quietly for a learner.
- Reveal is applied here, not in each part: a part asking for marks, the eval or explorer moves while the level hides
  them gets nothing, so a part cannot leak an answer by mistake ([reveal](../patterns/reveal.md)).
- A chip outside any board (in [rich-text](../components/rich-text.md) on Today, say) uses
  [use-move-interaction](use-move-interaction.md) instead, which looks for a board and falls back to navigating.

## Used by

The board's parts: [board-surface](../components/board-surface.md), [board-controls](../components/board-controls.md),
[step-buttons](../components/step-buttons.md), [board-eval](../components/board-eval.md),
[board-explorer](../components/board-explorer.md), [board-feedback](../components/board-feedback.md),
[board-notes](../components/board-notes.md), [mark-key](../components/mark-key.md),
[move-table](../components/move-table.md), [tries-table](../components/tries-table.md); and
[exercise-panel](../components/exercise-panel.md), [position-features](../components/position-features.md) when placed
inside a board.

## From v1

New. v1 passes everything down as props: `components/board/study-board.tsx` takes `stepper`, `engine`, `marks`,
`caption`, `controls` and `below`, and each page builds them (`features/play/play-page.tsx`,
`features/course/board-panel.tsx`, `features/tree/tree-board.tsx`, `features/lab/lab-page.tsx`).
