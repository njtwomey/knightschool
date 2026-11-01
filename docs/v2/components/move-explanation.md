# Move explanation

Everything the site knows about one move in one place: what it does, how good it is, how often it is played, and why
not the others.

## Shows

Top to bottom, each part left out when there is nothing to say:

1. **The move**: a [move-chip](move-chip.md), its symbol, its [verdict-badge](verdict-badge.md), and the
   [opening-name](opening-name.md) if it reaches a named position.
2. **What it does**: the author's comment as [rich-text](rich-text.md); when there is none, the sentences the board
   gives (a tactic spotted, a piece developed, castling lost), marked as the site's own words.
3. **Ideas**: the [idea-badge](idea-badge.md)s it shows, and its tags (Tip, Trap, Common blunder).
4. **How often**: its share of games at the learner's band, and how those games went ("played in 64% of games; White
   scores 54%").
5. **Why not the others**: the two or three most played alternatives, each with its badge and a
   [verdict-note](verdict-note.md) ("3...d6 is playable but passive"; "3...Nd4?! leaves e5 for nothing").
   Refutations the author wrote come first.
6. **What it leaves**: [eval-words](eval-words.md) for the position after it, and the
   [position-features](position-features.md) that matter there (a threat to meet, a weak square made).

## Configuration

- `move`: the position before and the move, with the opening for context (book move, the learner's side).
- `form`: `full` (all parts) or `compact` (1 to 3, for a panel beside the board).
- Settings read: `level.band`, `engine.on`, `feedback.evalAfter`, `board.notation`.

## Behaviour

- Every move in it, the alternatives included, is a chip: hover previews on the nearest board, click goes there (an
  alternative is played as an explored move).
- Parts fill in as they are known: the author's words at once, baked numbers at once, the engine's sentences later.
  Nothing jumps; each part keeps its place once shown.
- Never shown for a move not yet answered at the `test` reveal level ([reveal](../patterns/reveal.md)).
- A move nobody comments on and the engine has not seen still shows parts 1 and 4.

## Composed of

[move-chip](move-chip.md), [verdict-badge](verdict-badge.md), [verdict-note](verdict-note.md),
[rich-text](rich-text.md), [idea-badge](idea-badge.md), [opening-name](opening-name.md), [eval-words](eval-words.md),
[position-features](position-features.md).

## Used by

[board-notes](board-notes.md) ("More about this move"), [line-story](line-story.md) (a move opened in place),
[tries-table](tries-table.md) (an expanded row); pages [map](../pages/map.md) (the picked move),
[line](../pages/line.md), [analysis](../pages/analysis.md), [your-games](../pages/your-games.md) (the move you played
and the one the opening plays).

## From v1

New as one component. Its parts are spread over `apps/web/src/features/course/position-details.tsx` (the move, NAG
words, name, popularity, `explainMove` sentences in order of trust), core `explain/` (`Explainer` and its three
providers), `components/move-tags.tsx`, and the explorer panel (`features/explorer/explorer-panel.tsx`).
