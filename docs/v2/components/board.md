# Board

The one chessboard of the site: a shared model and a set of parts that read it, so every board looks, steps, explains
and hides answers the same way, and no page ever builds a second one.

## Shows

A `Board` is a frame that holds a model and the parts a page asks for. Every part is optional except the surface:

- [board-surface](board-surface.md): the squares and pieces with their layers (last move, marks, system arrows,
  feedback, selection);
- [board-controls](board-controls.md): the control row under the board (settings, flip, steps, Hint, Show me, the
  page's actions), with [step-buttons](step-buttons.md) and [board-settings-menu](board-settings-menu.md);
- [board-eval](board-eval.md): the eval bar beside the board, the strip or the engine's lines below it;
- [board-feedback](board-feedback.md): the verdict on the last move, the reason, the refutation to step through;
- [board-notes](board-notes.md): the shown move's comment, ideas and tags, with the [mark-key](mark-key.md);
- [board-explorer](board-explorer.md): what players at the learner's band play from the shown position;
- [move-table](move-table.md): the moves so far, bound to the cursor;
- [tries-table](tries-table.md): every guess of the session with its grade and cost;
- [position-features](position-features.md): threats, weak squares, hanging pieces and pins, lit on the board;
- a caption: one line of context under the controls ("After 3.Bc4", "Step 2 ends here"). Too small for a file of its
  own; the page passes it as text.

A small still picture of a position is not a Board: that is [board-thumb](board-thumb.md), drawn by the same surface
with no model.

## Configuration

- **model**: from [use-board-model](../hooks/use-board-model.md): the moves (a line, a path through the tree, a puzzle,
  a game, free play), the cursor, the orientation and whether it may flip, the mode (view, play one side, play both,
  draw marks, set up), the reveal level, and the feedback for each move played. Parts read it with
  [use-board](../hooks/use-board.md); a page never wires a part to another by hand.
- **preset**: `study`, `learn`, `test`, `puzzle`, `analysis`, `author` or `thumb` (table in ../board.md). The preset
  sets the mode and the reveal level; a page picks a preset, never the individual switches.
- **parts**: which of the parts above, and where they sit. The page lays them out with the board columns
  ([layout](../patterns/layout.md)); on a phone the order is board, controls, feedback, then the rest.
- **primary**: one board per page is primary. It owns the arrow keys ([use-shortcuts](../hooks/use-shortcuts.md)) and
  receives hovers and clicks from move chips anywhere on the page that are not inside another board. Without being told, the
  first board on the page is primary; `keys` makes a board primary and `keys={false}` keeps it out
  ([use-move-interaction](../hooks/use-move-interaction.md), "As built").
- **size**: `main` (capped at 36rem) or `aside` (22rem); never taller than the screen less the header and controls.
- `targetRef`: hands the board's target to a panel beside it that is not in its caption, so moves there preview on this
  board (the board search's results, in `BoardTargetContext`).
- Settings read by the parts, not by the frame: the `board.*` keys (look), `engine.*`, `feedback.*`, `display.*` and
  `level.band` (every key is in ../settings.md, "Keys"). Each part's file names the ones it reads.

## Behaviour

What the user asked for, and the rule that delivers each:

- **Flip only when relevant.** The model says whether the side is fixed. In `test` and `puzzle` the learner's side is
  the bottom and there is no flip button; in `study`, `analysis` and `author` the flip button is there. A page that
  keeps the side in its address (the Board page) is told when it flips.
- **One cursor, so the board and the feedback are visibly one thing.** The move table marks the current move, the
  notes show its comment, the eval shows its position and the feedback shows the verdict on it if it was played in this
  session. Step back three moves and the feedback for that move comes back; it is anchored to the move, not to "now".
- **The same move looks the same everywhere.** A move graded `?` carries the same symbol and colour on its target
  square, beside its SAN in the move table, in the tries table and in the feedback panel
  ([verdict-badge](verdict-badge.md), [colours](../patterns/colours.md)).
- **Hover anywhere lights the board.** Hovering a [move-chip](move-chip.md), a tries-table row, an explorer move, an
  engine line or a position feature lights its squares or shows its position on the surface, and leaving puts the
  board back ([use-move-interaction](../hooks/use-move-interaction.md)). A click moves the cursor there for good.
- **A refutation is a branch, not a new board.** "Show why" in the feedback puts the refutation on the model as a side
  branch: the surface, the move table (folded under the move) and the step buttons follow it, and "Back to the line"
  returns.
- **Arrows, highlights and marks never look alike.** The four mark colours are the author's; system arrows (the move to
  play, a hint, the engine's best move, a threat) have their own style; feedback sits on the target square. Order and
  styles are in [board-surface](board-surface.md).
- **Testing never leaks.** Which layers and parts show is set by the reveal level ([reveal](../patterns/reveal.md)): in
  `test` the marks, eval, explorer, notes, position features and hover previews of later moves are all off, and they
  come on together at `answered`.
- **States.** While the content loads the frame keeps its size with an empty board; a bad position shows a short
  message in the board's place ([states](../patterns/states.md)). In another tab's lock the board is read-only.
- **Touch and keys.** Tap a piece then a square, or drag; arrow keys, Home and End on the primary board only, never
  while typing ([accessibility](../patterns/accessibility.md)).

## Composed of

[board-surface](board-surface.md), [board-controls](board-controls.md), [board-eval](board-eval.md),
[board-feedback](board-feedback.md), [board-notes](board-notes.md), [board-explorer](board-explorer.md),
[move-table](move-table.md), [tries-table](tries-table.md), [position-features](position-features.md).

## Used by

Every page with a board: [opening](../pages/opening.md), [variation](../pages/variation.md), [step](../pages/step.md),
[line](../pages/line.md), [review](../pages/review.md), [drill](../pages/drill.md), [puzzles](../pages/puzzles.md),
[play-on](../pages/play-on.md), [checkpoint](../pages/checkpoint.md), [speed](../pages/speed.md),
[name-it](../pages/name-it.md), [your-games](../pages/your-games.md), [map](../pages/map.md),
[board](../pages/board.md), [idea](../pages/idea.md), [first-visit](../pages/first-visit.md) (the hero, `thumb`
preset), [line-editor](../pages/line-editor.md).

## From v1

Repurpose. `apps/web/src/components/board/study-board.tsx` (`StudyBoard`, the control row and slots) becomes the frame
and its parts; `app-board.tsx` becomes the surface; `line-stepper.ts` (`useLineStepper`) becomes the cursor in the
model. The move list, engine strip and explorer panel are wired by hand on each page today
(`features/course/board-panel.tsx`, `features/play/play-panel.tsx`, `features/tree/tree-board.tsx`,
`features/lab`); in v2 they read the model. v1's `previewable` boards (`board/preview.ts`) are the seed of "hover
anywhere lights the board".

## Open questions

- Is the caption a part (`Board.Caption` in ../board.md) or a prop of the frame? Treated here as a prop.
