# The board

One board component everywhere, configured per page, never a second implementation. v1 is most of the way there:
every board draws through `AppBoard`, and every board you study from is a `StudyBoard`. What v1 lacks is one shared
**model** behind the board, so each page wires its move list, stepper, engine and feedback to it by hand, and each page
decides for itself what to hide while testing.

## What exists

| Part                  | v1                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The surface           | `components/board/app-board.tsx`: theme, pieces, legal-move dots, hover and selection, badge (tick and cross), hint pulse, right-button drawing (`onDrawMark`)                |
| The control row       | `components/board/study-board.tsx`: settings gear, flip, step buttons, Hint and Show me, page actions, eval bar, engine strip or lines, caption, marks and their key, `below` |
| Stepping              | `components/board/line-stepper.ts` (`useLineStepper`, the one binding of the arrow keys), `step-buttons.tsx`                                                                  |
| The move list         | `components/move-list.tsx` (`MoveList`: table, inline, paragraphs)                                                                                                            |
| Evaluation            | `components/engine/` (`eval-bar.tsx`, `engine-strip.tsx`, `engine-lines.tsx`), `data/engine/`, `data/analysis.ts` (baked first, live after)                                   |
| Arrows, rings, badges | `components/board/shapes.ts` (`uciArrow`, `marksOnBoard`, `BoardArrow`, `BoardBadge`), `mark-key.tsx`                                                                         |
| Explorer (Lichess)    | `features/explorer/explorer-panel.tsx`, `service.ts`                                                                                                                          |
| Small boards          | `static-board.tsx` (a FEN, EPD or PGN at a ply), `board-thumb.tsx`                                                                                                            |
| Preferences           | `board/prefs.ts`, `board-settings.tsx`, `themes.ts`, `pieces.tsx`                                                                                                             |
| Size                  | `--board-size` and `.board-columns` in `index.css`                                                                                                                            |

## v2: a model and parts that read it

**The board model** (`useBoardModel`) owns everything the parts share:

- **the moves**: a source (a course line, a path through the tree, a puzzle, a game, free play) as positions with
  their moves and annotations;
- **the cursor**: which position is shown, and any moves played off the source (v1's Learn "explore" and Lab both do
  this separately);
- **the orientation**, and whether the page lets it flip;
- **the mode**: view, play one side, play both sides, draw marks, set up a position;
- **the reveal level** (below);
- **feedback** for the last move: a verdict, a refutation to step through.

v1's `useLineStepper` becomes the cursor part of this; the play store's `explore` and Lab's hash state move onto it.

**Parts**, each optional, each reading the model from context so they stay in step with no wiring:

| Part             | Shows                                                                                                                                                                                                                      | From v1                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `Board.Surface`  | the board and its layers                                                                                                                                                                                                   | `AppBoard`                                                                       |
| `Board.Controls` | settings, flip (when allowed), steps, Hint and Show me, the page's actions                                                                                                                                                 | `StudyBoard`'s control row                                                       |
| `Board.Moves`    | the moves so far as a table or text; click one to go there; the current one marked; refutations and side lines folded in                                                                                                   | `MoveList`                                                                       |
| `Board.Notes`    | the shown move's comment, tags and the key to its marks                                                                                                                                                                    | panels in About, Learn, tree                                                     |
| `Board.Eval`     | the bar, and the strip or the engine's lines                                                                                                                                                                               | `components/engine/`                                                             |
| `Board.Explorer` | what players at the learner's band play here, with each move's share and verdict                                                                                                                                           | `ExplorerPanel`                                                                  |
| `Board.Feedback` | the verdict on the last move, "why", the refutation to step through, tick or cross                                                                                                                                         | badge in `AppBoard`; new note                                                    |
| `Board.Caption`  | a line of context: "After 3.Bc4", "Unit 2 ends here"                                                                                                                                                                       | `caption`                                                                        |
| `Board.Tries`    | every guess so far, one row each: the move, what you played, its grade and symbol, what it cost in centipawns against the line's move, the time, hint or show used; click a row to see it on the board with the refutation | the quiz's miss list (`features/quiz/miss-list.tsx`), live instead of at the end |

A page composes the parts it needs and lays them out with the existing `.board-columns` rule:

```tsx
<Board model={model} preset="learn">
  <Board.Surface />
  <Board.Controls actions={<RestartButton />} />
  <aside>
    <Board.Feedback />
    <Board.Notes />
    <Board.Moves layout="table" />
    <Board.Tries />
    <Board.Eval view="lines" />
  </aside>
</Board>
```

## Layers on the surface

Drawn in this order, each turned on by the reveal level:

1. the last move (highlighted squares);
2. **marks**: the author's arrows and rings, four colours with one meaning each (Idea, Threat, Target, Support;
   `MARK_MEANINGS` in core);
3. **system arrows**: the move to play (Learn), a hint, the engine's best move, the opponent's threat. These use
   colours and a style outside the four mark colours, so a green Idea mark and "play this" never look alike (in v1
   the Learn arrow is green, like an Idea);
4. **feedback**: the verdict symbol on the target square (`!`, `?!`, `?`, `??`, in the usual colours), the refutation as
   a Threat arrow, the tick or cross;
5. selection, legal-move dots, the hint pulse.

## Reveal levels: testing never leaks

One rule instead of a condition on every page (v1 passes `marks` only on study pages, and hides the eval bar in Drill,
by hand on each):

| Level      | Marks | System arrows    | Evaluation | Explorer | Comments               |
| ---------- | ----- | ---------------- | ---------- | -------- | ---------------------- |
| `study`    | yes   | yes              | yes        | yes      | yes                    |
| `learn`    | yes   | the move to play | yes        | no       | yes, ahead of the move |
| `test`     | no    | hint only        | no         | no       | no                     |
| `answered` | yes   | the right move   | yes        | yes      | yes                    |

An exercise moves the board from `test` to `answered` when the learner has answered (right, or shown). Pages choose a
preset, never the individual switches.

## Presets

| Preset     | Used by                                         | Mode              | Reveal              |
| ---------- | ----------------------------------------------- | ----------------- | ------------------- |
| `study`    | course page, line About, tree, path, idea pages | view              | study               |
| `learn`    | a lesson's Learn step                           | play both sides   | learn               |
| `test`     | Try, review, checkpoints, Speed, Name it        | play one side     | test, then answered |
| `puzzle`   | puzzles                                         | play one side     | test, then answered |
| `analysis` | Lab, explorer, after a game or a puzzle         | play both sides   | study               |
| `author`   | Create                                          | play, or draw     | study               |
| `thumb`    | cards, search results, the Home hero            | view, no controls | marks only          |

## Size and layout

Unchanged from v1: one rule (`--board-size`), a page's main board capped at 36rem and an aside board at 22rem, never
taller than the screen; stacked on a phone, side by side from lg. On a phone the order is board, controls, feedback,
then the rest, so the answer to what just happened is always next to the board.
