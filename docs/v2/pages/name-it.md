# Name it

"Name That Opening": a position from the openings, and the learner types what it is. For connecting positions to the
names the rest of the chess world uses.

## Address

`/practice/name-it` (the set-up card); `/practice/name-it/<opening>` starts at once with positions from that opening.
No hash ([../navigation/url-state.md](../navigation/url-state.md)). v1's `/name`, `/name-it` and `/guess` land here.

## Reached from

The Name it tile on [practice](practice.md); an opening's [mode-counts](../components/mode-counts.md) when it has
named variations; Name it results on [stats](stats.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Name it.

1. [practice-bar](../components/practice-bar.md): "Your repertoire, 10 positions" with **Change**
   ([practice-setup](../components/practice-setup.md)): source, weighting (favour popular positions), how many (5, 10,
   20).
2. Two columns from lg:
   - [board](../components/board.md) with [board-surface](../components/board-surface.md) and
     [board-controls](../components/board-controls.md) (flip only; no steps, which would give the moves away).
   - [exercise-panel](../components/exercise-panel.md): "Which opening is this? White to play", 3 of 10;
     [answer-input](../components/answer-input.md) with suggestions from every opening and variation name once three
     letters are typed.
   - Once answered: the full name as [opening-name](../components/opening-name.md) with ECO, the moves that reach it as
     a [move-run](../components/move-run.md), and other names that reach it by transposition.
3. At the end, [session-summary](../components/session-summary.md): each position, what was typed, full or half credit.

## Behaviour

- Board `test` while asking (no marks, no names, no moves list), `answered` after
  ([../patterns/reveal.md](../patterns/reveal.md)).
- Full credit for the variation, half for the opening alone; every opening and variation whose lines reach the position
  counts, transpositions included. A miss or a half answer waits with **Next** so the name can be read.
- Answers are saved as guess attempts; no effect on the review schedule.
- The learner guesses names here, not moves, so the session's table lists each guess with its credit instead of a
  centipawn cost.

## Leads to

An answer's name → [opening](opening.md) or [variation](variation.md); the moves → [line](line.md); summary →
[practice](practice.md), [stats](stats.md).

## From v1

`features/name-it` (`name-it-page.tsx`, `store.ts`; `guessTargets` and `gradeGuess` in core's `modes/guess.ts`).
Verdict: **keep**, moved onto the exercise session later.

## Open questions

- Whether the [tries-table](../components/tries-table.md) gains a "names" form for this page, or the summary keeps its
  own list.
