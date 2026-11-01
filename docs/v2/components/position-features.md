# Position features

What is going on in a position, in plain words: threats, pieces that can be taken, pins, weak squares and pawns, the
kings' safety. Hovering an item lights it on the board.

## Shows

A short list, most urgent first, at most five with "More" for the rest. Each item is a sentence with a small coloured
dot in its mark colour ([colours](../patterns/colours.md)):

- **Threats** (Threat, red): what the side not to move would do if it were their turn. "Black threatens ...Qh4+".
- **Pieces that can be taken** (Threat): attacked and undefended, or attacked by something cheaper. "The bishop on c4
  is attacked by the pawn on d5."
- **Pins and skewers** (Threat or Idea, by whose favour): "The knight on f6 is pinned to the queen by the bishop on
  g5."
- **Weak squares** (Target, yellow): squares in a side's half no pawn of theirs can ever guard. "d5 is a hole for
  Black."
- **Weak pawns** (Target): isolated, doubled, backward, hanging. "White's d4 pawn is isolated."
- **King safety** (Threat or Support): uncastled with the centre open, castling lost, open lines at the king.
- **Open files and diagonals** (Support, blue): "The e-file is open; a rook belongs there."

Each item names the side it favours, so the list reads as "good for you" and "watch out" in a learner's opening.

## Configuration

- `position`: an EPD, with the side the learner plays (for wording).
- `kinds`: which of the above to look for (a step can ask for threats only).
- `limit`: how many items before "More".
- Settings read: `display.positionFeatures` (off, on request behind a button, always shown while studying).

## Behaviour

- **Hover, focus or long-press** an item: its squares and arrows are drawn on the nearest board's highlight layer
  ([board-surface](board-surface.md)) in its colour; leaving clears them. **Click** pins it, so it stays while the
  learner steps; click again to unpin.
- Follows the board's cursor, updating as it steps.
- **Never at the `test` reveal level**: a list of threats is the answer to a puzzle or a Their mistakes exercise. It
  comes on at `answered` ([reveal](../patterns/reveal.md)).
- Everything here is found by looking at the board, not by the engine, so it is instant and works offline; when the
  author's marks already say the same thing, the author's wording is used.
- Nothing found: "Nothing urgent here: both kings are safe and nothing is attacked."

## Composed of

[hint](hint.md), [idea-badge](idea-badge.md) (a pin or a hole links to its idea page).

## Used by

[board](board.md) as a part; [move-explanation](move-explanation.md) ("what it leaves"); pages
[board](../pages/board.md), [step](../pages/step.md) (Read and Done), [puzzles](../pages/puzzles.md) (after
solving), [idea](../pages/idea.md) (the position that shows a structure).

## From v1

New as a component, over detectors that exist per move in core `explain/motif.ts` (hanging pieces, attacks on
undefended pieces, forks, pins and skewers, mate threats, castling lost), each already returning the shapes to draw.
They look at a move, not a position: a position-wide pass (threats by a null move, holes, pawn weaknesses, open files)
is new core work.

## Open questions

- How many items before it overwhelms a beginner? Five is a guess; the Getting started preset might show threats only.
