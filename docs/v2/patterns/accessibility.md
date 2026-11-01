# Accessibility

Everything can be done with a keyboard, heard with a screen reader, used without motion, read in both themes and tapped
on a phone, from the first move to the last setting.

## The rule

- **Keyboard play.** Moves can be made without a mouse: focus the board and type the move (`Nf3`, `e4`, `O-O`) in its
  move box, with suggestions of legal moves; or move a square cursor with the arrow keys and pick with Enter
  (`access.squareCursor`, only while the board itself has focus, since the arrow keys otherwise step through moves). Tab
  order: board, controls, panel.
- **Keys never clash.** One owner per key on a page ([use-shortcuts](../hooks/use-shortcuts.md)); never while typing,
  never with a modifier, never a key a menu or radio group already handled. The arrows, Home and End step; Enter is
  Next; Escape closes.
- **Screen readers.** The board announces each move in words ("Black played knight to f6") in a polite live region; a
  verdict is announced with its sentence ("A mistake: after knight takes g5 the knight is lost"); the tick and cross
  have names ("Right", "Wrong"). Squares are labelled; the position can be read out on request (a key in the controls).
- **Colour is never alone** ([colours](colours.md)): symbols, icons, words and line styles carry every meaning.
- **Contrast**: AA in both themes for text and controls; a high-contrast board setting for squares, marks and arrows.
- **Reduced motion** (the system setting, or `access.reducedMotion`): no piece slide, no hint pulse (a steady ring
  instead), highlights and previews appear without fading, the Today hero holds still. Timings do not change.
- **More time.** `feedback.speed` slow gives half as much again to every delay ([feedback-timing](feedback-timing.md));
  nothing that tests is timed except Speed, which says so before it starts.
- **Touch.** Targets at least 40 by 40 pixels; long-press does what hover does ([interactions](interactions.md)), so a
  [hint](../components/hint.md) is never out of reach; dragging is never the only way (tap a piece, then a square).
- **Focus is visible** on everything, and goes somewhere sensible after an action: after Next, to the board; after a
  dialog closes, back to what opened it.
- **Toggles** report their state from `aria-checked` or `aria-pressed`, which a wrapped hint cannot overwrite.
- **Text**: the page works at 200% zoom without horizontal scrolling outside tables and the map.

| Setting (accessibility group) | Store  | What it does                                              |
| ----------------------------- | ------ | --------------------------------------------------------- |
| `access.reducedMotion`        | device | as above; follows the system by default                   |
| `access.highContrast`         | device | stronger board, mark and arrow colours                    |
| `access.largerPieces`         | device | pieces drawn larger in their squares                      |
| `access.typedMoves`           | device | the move box shown and focused on every board you play on |
| `access.squareCursor`         | device | arrow keys move a square cursor while the board has focus |
| `access.readMoves`            | device | moves read aloud through the browser's speech             |

## Where it applies

Every component and page; the board ([board-surface](../components/board-surface.md),
[board-controls](../components/board-controls.md), [board-feedback](../components/board-feedback.md)) most of all.

## From v1

- `apps/web/src/features/home/home-page.tsx`: the hero checks `prefers-reduced-motion`.
- `components/icon-action.tsx`: `aria-label` on every icon button, `pointer-coarse:size-10` touch targets.
- `components/ui/toggle.tsx`: chosen items from `aria-checked` and `aria-pressed`.
- `components/board/line-stepper.ts`: keys never while typing, with a modifier, or already handled.
- `components/board/app-board.tsx`: the badge labelled "Correct" or "Wrong".
- `app/header.tsx` (`PausedBanner`, `role="status"`), `features/quiz/move-view.tsx` and `miss-list.tsx` (`aria-live`).
- v1 has no keyboard move entry, no move announcements and no accessibility settings.
