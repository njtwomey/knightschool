# Cross-links

From any move, position, line, variation, opening, idea, step or puzzle to every place it appears, and the hover
preview that shows it before you go.

## The plan

Material keyed by position attaches itself (model.md), so a position can always answer "where else am I?". Every
thing on screen that names one of these is a link with a real address (so middle-click and copy link work), hovers the
same way through [use-move-interaction](../hooks/use-move-interaction.md), and offers the same **Open in** list in its
preview card. Addresses are built with the router's builders (routes.md), never by hand.

### Where each thing can be opened

| From          | Map                                      | Line page               | Board                               | Search                                                  | Step / opening                                              | Also                                                                     |
| ------------- | ---------------------------------------- | ----------------------- | ----------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Move**      | `/explore/map#line=<line>&m=<path>`      | `/lines/<line>#ply=<n>` | `/board#m=<path>`                   | `/explore/search#bm=<path>`                             | the step whose stretch holds it, at that move               | its ideas (`/ideas/<idea>`), its refutation stepped through on the board |
| **Position**  | the first line through it, picked        | every line through it   | `#m=<a path>` or `#fen=`            | `#bm=<path>`: every line through it, transpositions too | every step that reaches it                                  | puzzles matched to it, explorer numbers                                  |
| **Line**      | `/explore/map#line=<line>`               | `/lines/<line>`         | `#m=<its moves>`                    | `#q=<its name>`                                         | `/openings/<o>/lines/<line>` for each opening that lists it | Drill, Review scoped to it                                               |
| **Variation** | `/openings/<o>/map#focus=<branch point>` | its lines, listed       | `#m=<its branch point>`             | `#q=<its name>`                                         | `/openings/<o>/<variation>`                                 | checkpoint, Drill scoped to it                                           |
| **Opening**   | `/openings/<o>/map`                      | its lines, listed       | `#m=<its trigger>`                  | `#q=<its name>`                                         | `/openings/<o>`                                             | Lichess page (ECO link), practice scoped to it                           |
| **Step**      | the map at its stretch                   | the line it teaches     | `#m=<its last position>`            |                                                         | `/openings/<o>/step/<n>`                                    | its ideas and puzzles                                                    |
| **Idea**      | moves tagged with it, ringed             | lines with such moves   |                                     | `#scope=ideas&q=<name>`                                 | steps that show it                                          | `/ideas/<idea>`, its puzzles (`/practice/puzzles/ideas/<idea>`)          |
| **Puzzle**    | the position it was matched at           | the line it follows     | `#fen=<puzzle start>` after solving | `#bm=<matched path>`                                    | the step it is attached after                               | `/practice/puzzle/<id>`, Lichess game                                    |

`<path>` is the UCI moves from the start (`e2e4.e7e5`, url-state.md). A position reached by several paths uses the
path of the context it was clicked in, else the shortest line through it.

### What a click does

1. **Inside a board's panel** (a move in [move-table](../components/move-table.md), a chip in
   [board-notes](../components/board-notes.md) or [line-story](../components/line-story.md) beside its board): the
   board's cursor goes there, no navigation. This is v1's behaviour on the course page and About.
2. **Anywhere else** (a chip in [rich-text](../components/rich-text.md), a [line-row](../components/line-row.md), a
   [position-card](../components/position-card.md), a search result): navigates to the thing's own page, at that move.
3. **Modifier or middle click**: the browser's own, a new tab at the same address.
4. **During a test** (reveal level `test`, [reveal](../patterns/reveal.md)): chips that would show a later position
   are plain text until the exercise is answered, so a link never gives the answer away.

### The hover preview

[position-preview](../components/position-preview.md), opened by
[use-position-preview](../hooks/use-position-preview.md): one card at a time, after a short delay, never while
dragging a piece.

- **Shows:** a [board-thumb](../components/board-thumb.md) of the position after the move, with the move's arrow and
  the author's marks; the deepest Lichess name reached ([opening-name](../components/opening-name.md)); how often it
  is reached at your band; the move's [verdict-badge](../components/verdict-badge.md) when known; your state on it
  ([state-badge](../components/state-badge.md)); how many of your openings and steps reach it.
- **Open in:** a footer row of [icon-action](../components/icon-action.md)s: Map, Line, Board, Search, and the step
  when there is one. Hidden entries are never shown disabled.
- **On the nearest board:** while a chip inside a board's panel is hovered, that board also shows the position (v1's
  `previewable` boards), with the card suppressed so the same position is not drawn twice.
- **Touch:** a long press opens the card pinned, with a close button; a tap is the click above.
- **Keyboard:** focus opens it after the same delay; `Esc` closes it.

### Finding where a position appears

One look-up, `appearances(epd)` (new, in core over shipped indexes), answers every column above: lines through the
position from `search.json` (v1's board search index, already keyed by position so transpositions match), openings
from `tree.json` (which courses list each line), steps from the opening's cut path, puzzles from `content/puzzles/`,
ideas from move tags. Authored openings are added from the authored build, which v1's board search does not do.

## From v1

- `apps/web/src/components/board/preview.ts` (`usePreview`: `show`, `hide`, `toggle` to pin, `clear`) and
  `components/rich-text.tsx`: the only hover preview today, from text to `previewable` boards
  (`features/course/board-panel.tsx`, `features/line/about-tab.tsx`, `features/tree/tree-board.tsx`,
  `features/play/play-page.tsx`, `features/quiz/move-view.tsx`).
- `features/search/board-search.tsx` and `board-query.ts`, `search.json` (position to lines): the position index.
- `content/related.ts` in core (`relatedCourses`, the same ground from the other side) and About's "other courses that
  teach it": cross-links between openings today.
- `components/eco-link.tsx` (`EcoLink` to Lichess) and `features/glossary/motif-chip.tsx`: links out to Lichess and to
  motifs.

## Open questions

1. Is a page of its own for a position (`/positions/<positionId>`, everything above on one page) worth having, or is
   the preview card plus the Board enough? The proposal is no page: the preview and the Board cover it.
2. `search.json` leaves out authored openings and steps; ship a fuller position index, or compute steps in the browser
   when the preview opens?
