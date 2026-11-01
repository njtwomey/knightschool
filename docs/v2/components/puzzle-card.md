# Puzzle card

A puzzle in a list or on Today: a small board of where it starts, how hard it is, what it is about, and where it comes
from in the learner's openings.

## Shows

- A [board-thumb](board-thumb.md) of the puzzle's starting position, after the opponent's move that sets it up, with
  that move highlighted and oriented for the side that solves.
- Who solves and the prompt: "White to play" or, for the opponent's side, "What Black threatens".
- Its rating, as a number and a word ("1240, about your level").
- Its themes as [idea-badge](idea-badge.md)s where they map to our ideas (fork, pin, back rank), plain tags otherwise.
- **Where it comes from**, by match level ([puzzles](../puzzles.md)): "From a game that passed through step 4 of your
  Italian Game", "After the Fried Liver line", "From the Two Knights Defence", "Same pawns as the end of the Giuoco
  Piano", "Practises the fork".
- Once tried: solved, solved with a hint, or missed, and its next review when it is a card.
- A small credit: "Lichess puzzle" with its id.

## Configuration

- `puzzle`, and the `context` it is shown in (an opening, a step, an idea), which picks the "where it comes from" line.
- `size`: `card` (Today, Puzzles hub, idea pages) or `row` (a step's extras, the variation list: thumb, rating, one
  line).
- `hideThemes`: on for a puzzle about to be solved, since a theme can give the answer away (`puzzles.showThemes`
  decides; default off before solving).
- Reads `puzzles.rating` (the "about your level" word) and `puzzles.solver`.

## Behaviour

- The card is a link: it opens the puzzle as an exercise in the `puzzle` board preset.
- Hover the "where it comes from" line: the matching position as a [position-preview](position-preview.md).
- Hover the rating: "Lichess rating; your puzzles go well around 1100 to 1300" ([hint](hint.md)).
- Click the Lichess id: the puzzle on Lichess, in a new tab.
- No puzzles matched (a new or rare line): the place where a card would be shows "No puzzles from this line yet" only
  where the learner would expect one; elsewhere nothing.

## Composed of

[board-thumb](board-thumb.md), [idea-badge](idea-badge.md), [state-badge](state-badge.md) (solved state, dot form),
[position-preview](position-preview.md), [hint](hint.md).

## Used by

[today](../pages/today.md) (one puzzle from your openings), [puzzles](../pages/puzzles.md), [step-row](step-row.md)
and [variation-list](variation-list.md) (extras), [idea](../pages/idea.md), [opening](../pages/opening.md) ("puzzles
from this opening"), [puzzle-picker](puzzle-picker.md) (Create).

## From v1

New. v1 has no puzzles. The thumb and card shape follow `apps/web/src/features/search/variation-card.tsx`.

## Open questions

- `puzzles.showThemes` is a proposed key: whether themes show before solving. Lichess shows them; they can spoil a
  puzzle for a beginner.
