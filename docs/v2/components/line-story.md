# Line story

A line told in words: its introduction, its moves with their comments, where it branches off, and what grows out of
it. It is the Learn stage of every step, follow-up and line ([../pages/step.md](../pages/step.md#the-learn-flow)).

## Shows

- **The introduction** (`intro`), first: a step's text, a follow-up's reasons it is worth knowing with its evaluations,
  a line's place in the opening, and **Test me instead** where a step allows it. It scrolls away with the story.
- **Where it starts**: "Branches off the Two Knights Defense after 4.Ng5", the parent line as a link, and the shared
  moves before it as a greyed [move-run](move-run.md).
- **The line move by move**, in paragraphs: a run of moves, then the comment on the last of them, then the next run.
  Every move is a [move-chip](move-chip.md); a commented move carries its [idea-badge](idea-badge.md)s and tags after
  the comment. Moves with no comment run on inline.
- A move's symbol and any refutation: "4...Nxd5? (5.Nxf7, the Fried Liver)" folded under the move, opened on click.
- **Where it ends**: [eval-words](eval-words.md) for the last position ("White is a little better, +0.6") and the plan
  from there in a sentence, when written.
- **What grows from it**: the lines that branch off this one, each as a small [line-row](line-row.md) with the move
  they branch at.
- **Other openings that teach it**: [opening-name](opening-name.md)s, since lines are shared.

## Configuration

- `line`, and the `opening` it is seen in (for links and for which side is "yours").
- `board`: the page's board model. The story is bound to its cursor: the move shown is marked in the text.
- `parts`: which of intro, start, moves, end, grows, others to show.
- `follow`: the story is its own scroll area beside the board (the Learn stage, in a `BoardColumns` with `fit`).
- Reads `feedback.evalAfter` (off, words, words and numbers) for the end, and `board.notation`.

## Behaviour

- Click a move: the board goes to it ([use-move-interaction](../hooks/use-move-interaction.md)); the board's step
  buttons and arrow keys move the mark through the text. The entry holding the move shown is tinted, with an edge.
- **Following the board** (`follow`, from lg): the story is a scroll area as tall as the board. When the cursor moves
  (keys, buttons, a click on a move) it scrolls so the current entry's top sits about 38% of the way down, level with
  ranks 5 and 6 and never below rank 3; room after the last entry lets it get there too. Smooth, unless the learner
  prefers reduced motion. Nothing moves on the first render at the start; back at the start it returns to the top. A
  hand scroll is left alone until the cursor next moves. On a phone the story is in the page's flow and the current
  move is only scrolled into view when it is off screen.
- Hover a move: highlight its squares on the board.
- Click a refutation: it unfolds, and its moves become chips that step the board through it, off the line. A
  refutation is a wrong move written where the next move is played, so it folds under the move before it ("Why it
  fails: 4.Ng5").
- A line with no comments still reads: the moves run in one paragraph with the end position's words below.
- Loading: a skeleton of three paragraphs.

## Composed of

[move-chip](move-chip.md), [move-run](move-run.md), [idea-badge](idea-badge.md), [kind-badge](kind-badge.md),
[eval-words](eval-words.md), [line-row](line-row.md), [opening-name](opening-name.md), [rich-text](rich-text.md),
[verdict-badge](verdict-badge.md) (move symbols).

## Used by

The Learn stage of [step](../pages/step.md), [follow-up](../pages/follow-up.md) and [line](../pages/line.md);
[map](../pages/map.md) (the side panel for the picked line).

## From v1

Keep. `apps/web/src/features/line/about-tab.tsx` (`LineAbout`) already tells a line with its comments, where it grows
from, what grows from it and other courses that teach it, using `MoveList`'s paragraphs layout
(`apps/web/src/components/move-list.tsx`, `apps/web/src/lib/move-paragraphs.ts`). v2 adds refutations, idea badges,
and the end position in words.
