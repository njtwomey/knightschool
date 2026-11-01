# Shortcuts

Keys that work everywhere and keys per page: one owner per key, never while typing, never with a modifier.

## The plan

Every key is registered through [use-shortcuts](../hooks/use-shortcuts.md) with a label, so `?` can list what works on
the page in a dialog. v1's rules are kept for every key: nothing fires while typing in a field, nothing fires with Ctrl,
Alt or Meta held (browser shortcuts still work), and a key something else already handled (an open menu, a radio
group) is left alone. Letters are lower case; Shift is used only where it says so.

### Everywhere

| Key                                   | Does                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `?`                                   | Lists the keys of this page                                              |
| `/`                                   | Opens search (`/explore/search` with the box focused)                    |
| `Esc`                                 | Closes the preview card, menu or dialog on top; never leaves a session   |
| `g` then `t`, `l`, `p`, `e`, `i`, `c` | Go to Today, Learn, Practice, Explore, Ideas, Create (within one second) |

### Any board

The board's keys belong to the one board on the page that has them (v1: one stepper per page has `keys`).

| Key            | Does                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------- |
| `←` `→`        | Back and forward one move                                                                    |
| `Home` `End`   | To the start and the end of what can be stepped through                                      |
| `f`            | Flip, where the page allows it                                                               |
| `h`            | Hint (the piece), then Show me (the move) on a second press: one step each, counted as in v1 |
| `Enter` or `n` | Next, when a miss is up with its explanation (the only button that waits)                    |
| `r`            | Step through the refutation shown by [board-feedback](../components/board-feedback.md)       |

### Per page

| Page                                                                       | Key                                           | Does                                            |
| -------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| [step](../pages/step.md)                                                   | `[` `]`                                       | Previous and next stage, when reached           |
| [map](../pages/map.md)                                                     | `↑` `↓`                                       | The lane above or below (the next line)         |
| [map](../pages/map.md)                                                     | `+` `-` `0`                                   | Zoom in, out, fit                               |
| [map](../pages/map.md)                                                     | `Enter` or `Space`                            | Pick the focused pill (as v1)                   |
| [board](../pages/board.md)                                                 | `e`                                           | Engine on or off                                |
| [search](../pages/search.md)                                               | `b`                                           | Opens board search                              |
| [name-it](../pages/name-it.md), [review](../pages/review.md) typed answers | none while the box has focus; `Enter` answers |
| [line-editor](../pages/line-editor.md)                                     | `Delete`                                      | Takes back the last move of the line, with Undo |

Playing moves by keyboard (typing `e4` or `Nf3` into the board) is an accessibility setting
([accessibility](../patterns/accessibility.md)); when on, letter shortcuts on that board need Shift.

## From v1

- `apps/web/src/components/board/line-stepper.ts`: `isTyping`, `stepKey` (no modifiers, not handled, not typing),
  `stepTarget`, and `keys` on one stepper per page. The rules are generalised into the hook.
- `apps/web/src/features/tree/lane-tree.tsx` (Enter and Space pick a pill) and
  `apps/web/src/features/search/course-card.tsx` (Enter and Space open a card): the only other keys in v1.
- Everything else in the tables above is new.

## Open questions

1. `g` sequences are common on sites like GitHub but invisible to beginners; keep them, or only `?` and `/`?
2. Should `h` be one key with two presses, or `h` for Hint and `s` for Show me as two separate keys?
