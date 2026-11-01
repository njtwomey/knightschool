# Next action

The one button that says what to do now, and takes the learner straight there.

## Shows

- A large primary button with a verb and an object: "Review 14 moves", "Continue step 4: Bishop to c4", "Start the
  Italian Game", "Take the Giuoco Piano checkpoint", "Choose an opening against 1.d4".
- One line under it saying why: "14 moves are due; reviews come first", "You are in the Try stage", "Your White
  repertoire is ready to start".
- In `with-alternatives` form, two or three quieter links beside it for the next most useful things ("or: a puzzle from
  your openings, or your biggest gap"), so the main button is a suggestion, never a cage.

## Configuration

- `scope`: the repertoire (Today), one opening (its page), or one variation.
- `form`: `main` (one button), `with-alternatives`.
- The choice is made by a small registry of pickers, each returning an address and a sentence, or "nothing now": due
  reviews first when more than a few are due; then the step in progress (at its stage); then the next open step; then
  an open checkpoint; then an empty repertoire slot; then a puzzle. Adding a kind of next thing is one picker.
- Reads `review.newPerDay` (no "start a new step" once today's new moves are used; it offers review or a puzzle
  instead), the config keys `schedule.reviewsFirstAt` (how many due reviews put review first; default 5) and
  `teach.gates`, and the setting `learning.gatesRelaxed`.

## Behaviour

- Click: go to the address. A step opens at the stage it was left at; a review starts at once (no set-up card).
- The choice is worked out when the page opens and after each finished session, never while the learner is reading,
  so the button does not change under the pointer.
- Hover the why line: nothing; it is plain text. Hover an alternative: a [hint](hint.md) with what it starts.
- Nothing to do (every step known, nothing due): "All done for today. Next review tomorrow at about 9:00", with the
  alternatives still offered (a puzzle, Speed, the map).
- Before a repertoire exists: "Choose your first opening", leading to [onboarding](../pages/onboarding.md).
- Keyboard: Enter on Today triggers it when nothing else has focus ([use-shortcuts](../hooks/use-shortcuts.md)).

## Composed of

shadcn `Button`, [hint](hint.md).

## Used by

[today](../pages/today.md) (the main action), [opening](../pages/opening.md) (scope one opening),
[variation](../pages/variation.md), [session-summary](session-summary.md) (its "what next"), the header on a phone
(the Today tab's badge).

## From v1

Repurpose. `apps/web/src/features/path/sessions` is already a registry of session types (`types.ts`,
`next-unit.ts`, `next-moves.ts`, `opening-rush.ts`), each picking an address from the path's state or saying why there
is none (`currentUnit`, `nothingLeft`); `apps/web/src/features/path/session-starters.tsx` shows them as cards. v2 adds
pickers for review, checkpoints, empty slots and puzzles, ranks them, and shows the winner as one button.
