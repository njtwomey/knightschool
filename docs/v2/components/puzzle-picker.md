# Puzzle picker

Choosing the puzzles a step (or a checkpoint) shows, from the Lichess puzzles matched to its positions. The author sees
the strongest matches first and picks one to three.

## Shows

- **Filters** across the top: match level (Through the position, After the line, Named variation, Opening family, Same
  structure, Same idea; puzzles.md), who solves (you, them, either), how soon (within 10 plies, later), rating range,
  and themes.
- **The matches**, best first: each a [puzzle-card](puzzle-card.md) with its thumb, rating, themes, how it matched
  ("game passed through after 5.d4, 14 plies later") and a Lichess link.
- **Chosen**: the picked puzzles in order at the top, with up and down arrows and remove.
- **Try it**: opens the puzzle on a small board in the puzzle preset, to solve before choosing.

## Configuration

- `target`: a step (its last position by default), a refutation's position, or a variation's checkpoint.
- `max`: how many may be chosen (three for a step, ten for a checkpoint).
- `defaults`: the filters for the moment, from the table in puzzles.md ("A danger step: through the position, opponent
  solves").

## Behaviour

- Matches come from the shipped selection (`content/puzzles/`); with nothing at the strongest level, the list falls
  down the levels and says so: "No puzzle passed through this exact position. Showing named variation matches."
- A puzzle already used by another step of the opening is marked "Used in step 2" and can still be picked.
- Choosing saves at once as one undoable action ("choose puzzle 0Xa3b for step 4").
- Empty after filtering: an [empty-state](empty-state.md) with "Widen the rating range" and "Any level" as actions.
- Keyboard: the list is a list of checkboxes; Enter on a card opens Try it.

## Composed of

[puzzle-card](puzzle-card.md), [filter-toggle](filter-toggle.md), [board-thumb](board-thumb.md), [board](board.md)
(puzzle preset), [empty-state](empty-state.md), [undo-button](undo-button.md), shadcn `Checkbox` (to add from shadcn,
[inventory](../inventory.md)).

## Used by

[step-editor](step-editor.md); page [create-opening](../pages/create-opening.md) (checkpoints).

## From v1

New. Nothing in v1 handles puzzles; the matching jobs are planned in `docs/v2/puzzles.md`.

## Open questions

- An opening written in Create has lines the maintainer's selection never saw. Does the browser ship enough of the
  position index to match them, or does Publish ask the maintainer to run the selection?
