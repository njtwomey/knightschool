# Interactions

Hover, focus, click, long-press, drag and right-click do the same thing on every move chip, table row, map pill and
link, so a learner who learns one surface has learned them all.

## The rule

**Anything that stands for a move or a position** (a [move-chip](../components/move-chip.md), a move in the
[move-table](../components/move-table.md), a pill on the [map-tree](../components/map-tree.md), a position written in
[rich-text](../components/rich-text.md), a row of the [tries-table](../components/tries-table.md), a
[position-card](../components/position-card.md)) behaves as follows, through one hook,
[use-move-interaction](../hooks/use-move-interaction.md):

| Gesture                        | What happens                                                                                                                                                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hover** (mouse)              | After 100 ms the move is **highlighted on the nearest board**: its two squares tinted and a faint preview arrow (a system arrow, [colours](colours.md)). The item itself is tinted.                                                                                                 |
| Hover, held                    | After 400 ms, if the setting `display.previews` is on, a [position-preview](../components/position-preview.md) card opens beside the item: a small board of the position after the move, its name, how often it is reached.                                                         |
| Hover ends                     | Highlight and preview go after 150 ms of grace, so the pointer can cross a gap to the next item without flicker.                                                                                                                                                                    |
| **Focus** (keyboard)           | Exactly as hover, at once, with the visible focus ring.                                                                                                                                                                                                                             |
| **Click / tap / Enter**        | **Goes there.** If the nearest board can show the position (it is on the board's moves, or the board is free to roam: study, analysis, author), the board's cursor moves to it. Otherwise it navigates to the page that owns it: the line at that move (`#m=`), the step, the idea. |
| **Long-press** (touch, 500 ms) | What hover does: highlight on the board and the preview card, which stays until the next tap anywhere. A long-press never also clicks.                                                                                                                                              |
| Middle-click, Ctrl/Cmd-click   | A new tab, because anything that navigates is a real link.                                                                                                                                                                                                                          |
| Right-click                    | The browser's menu (so "copy link" works), except on a board in draw mode, where it draws a mark.                                                                                                                                                                                   |
| Escape                         | Closes the preview, a menu or a pinned highlight; on a board in analysis, returns the cursor to the source line.                                                                                                                                                                    |

"The nearest board" is the board model in the item's context ([use-board](../hooks/use-board.md)): the board of the
panel the item sits in, else the page's main board. With no board on the page (a search result, a table), hover still
opens the preview card and click navigates.

**Rows and cards** that stand for a thing (an opening, a variation, a step, a line, a puzzle, a mode, what is due, a
checkpoint, a preset, a setting group). **No dead cards**: every card or row has a default action when clicked anywhere
on it, and it is the obvious one: a mode's tile opens the mode, the due card starts the review, a step row shows the
step on the page's board (or opens it where the page has no board), a puzzle opens the puzzle, a preset is chosen. One
module does it, `components/shared/card-link.tsx`: `LINKED_CARD` on the card, a `CardLink` (opens a page) or
`CardAction` (acts on this page) inside, and `ABOVE_ROW_LINK` on controls that keep their own click. A card's own
button for that same action is dropped, as redundant, unless its label carries information ("Review 20 of 45").

| Gesture             | What happens                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Hover               | The row tints; if the row has a position (a step's key position, a line's end), it is highlighted on the nearest board as above.     |
| Click anywhere      | Its default action: a `CardLink` stretched over it (a page), or a `CardAction` (this page). Never an `onClick` on the row's element. |
| Controls in the row | Keep their own click and never open the row ([icon-action](../components/icon-action.md)).                                           |
| Locked row          | Hover or long-press shows what opens it; click opens the row with the locked state explained, never nothing.                         |

**The board itself** ([board-surface](../components/board-surface.md)):

| Gesture                      | What happens                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Hover a square               | Tints it only if the device setting `board.hoverSquare` is on (off by default, as in v1).                                               |
| Click a piece, then a square | Plays the move; dots show legal squares (`board.legalMoves`).                                                                           |
| Drag a piece                 | Plays the move; dropped off the board or on an illegal square, it goes back with no penalty.                                            |
| Right-drag, right-click      | Draws a mark in draw mode (author, analysis), with Shift, Alt and both for the colours ([marks-editor](../components/marks-editor.md)). |
| Arrow keys, Home, End        | Step through the moves; one owner per page, never while typing or with a modifier ([use-shortcuts](../hooks/use-shortcuts.md)).         |

**Never**: double-click for anything; hover as the only way to reach something; a change of state from hover alone
(only a click changes what is selected, as on v1's tree); a preview of a move the learner is being asked
([reveal](reveal.md)): during a test, chips for moves not yet played are not drawn at all.

## Delays

| What                          | Delay                                             |
| ----------------------------- | ------------------------------------------------- |
| Highlight on hover            | 100 ms                                            |
| Preview card on hover         | 400 ms (once one is open, the next opens at once) |
| Grace before closing          | 150 ms                                            |
| Long-press                    | 500 ms                                            |
| [Hint](../components/hint.md) | 500 ms; 900 ms on icon buttons                    |

These sit beside `FEEDBACK_DELAYS` in one table ([feedback-timing](feedback-timing.md)), not in each component.

## Where it applies

Every component that shows a move, a position or a linked thing; the board's parts; every page. The settings that
change it: `display.previews` (off, small board, on), `board.hoverSquare`, `board.legalMoves`, and reduced motion
([accessibility](accessibility.md)), which drops the fade of highlights and previews but not the highlights.

## From v1

- `apps/web/src/components/board/preview.ts` (`usePreview`: `show`, `hide`, `toggle` to pin, `clear`) and
  `components/rich-text.tsx` (hover, focus and click on a position in text) are the start of the hover-to-board rule,
  used only by rich text.
- `components/move-list.tsx` (`onSelect` on a move), `features/tree/lane-tree.tsx` (`onPick`),
  `features/tree/tree-explorer.tsx` ("only a click changes anything"): click behaviour, each wired by hand.
- `components/sortable-table.tsx` (`RowLink`, `ABOVE_ROW_LINK`): the row rule, kept, now one module for rows and cards
  (`components/shared/card-link.tsx`); `RowLink` is a `CardLink` with the row's focus ring.
- `components/board/line-stepper.ts`: the arrow keys, never while typing or with a modifier, kept.
- `components/board/prefs.ts` (`hover`, `legalMoves`), `features/create/mark-colour.ts` (right-drag colours).
- v1 has no hover highlight from a move list to the board, no preview card, and no long-press anywhere.

## Open questions

- Should hover on a move chip far from any board (search results) open the preview without the setting, since there
  is no board to highlight?
