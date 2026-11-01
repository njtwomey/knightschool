# useBoardModel

Creates one board's model: its moves, cursor, orientation, mode, reveal level and feedback, shared by every part of
that board through context.

## Gives

A model object to hand to [board](../components/board.md), holding:

- **positions**: the source as a list of positions, each with the move into it and its annotation (comment, marks,
  symbol, tags, refutation);
- **cursor**: the index shown, and any **off-source moves** played from it (a branch the learner tried, kept until
  they step back onto the source);
- **orientation** and whether it may flip; **mode** (view, play one side, play both, draw marks, set up);
- **reveal** (`study`, `learn`, `test`, `answered`; [reveal](../patterns/reveal.md)) and **feedback** for the last move
  (verdict, refutation, tick or cross);
- actions: go to an index, step (first, back, forward, last), play a move (on the source or off it), return to the
  source, flip, set reveal, set feedback, clear feedback.

A sketch: `const model = useBoardModel({ source, preset: 'learn', start: 4 })`.

## Takes

- **source**: a line of an opening, a path through the tree, a puzzle (start and solution), a game, or free play from
  a FEN; changing it resets the cursor unless the new source begins with the old path.
- **preset** (`study`, `learn`, `test`, `puzzle`, `analysis`, `author`, `thumb`; board.md), which sets mode and the
  starting reveal; pages choose a preset, never single switches.
- optional: start index, the first index that can be stepped to (a step that starts part-way along a line, v1's
  `firstIndex`), orientation, `keys` (this board owns the arrow keys), `hash` (bind `m` and `c` to the address).

## Behaviour

- One owner of "where the board is": the move table, step buttons, notes, eval and explorer read the cursor and never
  keep their own.
- Playing a move that matches the source's next move advances the cursor; any other legal move goes off-source,
  except in `test`, where the exercise session decides (it calls feedback and snaps back).
- With `keys`, registers `←` `→` `Home` `End` and `f` through [use-shortcuts](use-shortcuts.md).
- With `hash`, reads the moves once through [use-hash-state](use-hash-state.md) and writes them as the cursor moves.
- Moving to `answered` is the exercise's call; the model never reveals by itself.

## Used by

[board](../components/board.md) (provides it), and every page with a board: [opening](../pages/opening.md),
[step](../pages/step.md), [line](../pages/line.md), [map](../pages/map.md), [analysis](../pages/analysis.md),
[review](../pages/review.md), [drill](../pages/drill.md), [puzzles](../pages/puzzles.md),
[play-on](../pages/play-on.md), [speed](../pages/speed.md), [name-it](../pages/name-it.md),
[line-editor](../pages/line-editor.md). [use-exercise-session](use-exercise-session.md) drives one.

## From v1

- `apps/web/src/components/board/line-stepper.ts` (`useLineStepper`: positions, index, `min`, overrides, `keys`):
  becomes the cursor part.
- The play store's explore moves (`features/play/store.ts`), Lab's moves and cursor (`features/lab/lab-page.tsx`), the
  course board's `path` and `line` in `data/catalog-store.ts`, and `features/tree/tree-board.tsx`: four hand-made
  versions of the same thing, moved onto the model.
- `components/board/study-board.tsx` props (`controls`, `stepper`, `engine`, `marks`, `caption`): become parts that
  read the model.

## Open questions

1. Should the model live in a small store per board (selectors, fewer renders) or in React state with context? Parts
   such as the eval bar re-render on every cursor move either way.
