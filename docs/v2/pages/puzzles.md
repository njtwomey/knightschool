# Puzzles

Tactics from real games that passed through the learner's openings, drawn from all 6.2 million Lichess puzzles matched
to positions at several levels. For practising the tactics their openings actually lead to.

## Address

`/practice/puzzles` (the set-up card); `/practice/puzzles/<opening>[/<variation>|/lines/<line>]` and
`/practice/puzzles/ideas/<idea>` start at once; `/practice/puzzle/<id>` plays one puzzle (Lichess id, from Today or a
card). Hash: `#m=<moves played>` in a puzzle ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

The Puzzles tile on [practice](practice.md); a [puzzle-card](../components/puzzle-card.md) on [Today](today.md),
[opening](opening.md), [variation](variation.md), the Done stage of a [step](step.md), or an [idea](idea.md); the
Puzzles count in [mode-counts](../components/mode-counts.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Puzzles.

1. [practice-bar](../components/practice-bar.md): "Your repertoire, 10 puzzles, 800 to 1300, you solve" with **Change**
   ([practice-setup](../components/practice-setup.md)): source (repertoire, one opening, variation or line, an idea);
   how closely matched (through the position, after the line, the named variation, the opening, the same structure, the
   same idea; [../puzzles.md](../puzzles.md)); rating range; who solves (you, the opponent, both); how many; weighting
   by how often you reach the position.
2. Two columns from lg:
   - [board](../components/board.md) with [board-surface](../components/board-surface.md) and
     [board-controls](../components/board-controls.md) (Hint, Show me).
   - [exercise-panel](../components/exercise-panel.md): "Black to play and win material", where it comes from ("from a
     game that went through the Italian after 4.c3, 12 moves later"), its rating;
     [board-feedback](../components/board-feedback.md); the [tries-table](../components/tries-table.md).
   - Once solved or missed: [move-table](../components/move-table.md) of the solution,
     [board-eval](../components/board-eval.md), the themes as [idea-badge](../components/idea-badge.md)s, and a link to
     the game on Lichess.
3. At the end, [session-summary](../components/session-summary.md) with each puzzle's result, the tries table, and
   [puzzle-card](../components/puzzle-card.md)s of the missed ones to try again.

## Behaviour

- `puzzle` preset: the opponent's move is played first, then the learner solves
  ([../patterns/reveal.md](../patterns/reveal.md)). The exact move is graded, and any mate counts. Two wrong tries
  reveal the move; a miss waits with **Next**.
- After a puzzle the board turns to `analysis`: step through the solution and the game moves before it, see each move's
  verdict ([../hooks/use-judgement.md](../hooks/use-judgement.md)), try other moves.
- "The opponent solves" puzzles are dangers: "this is what happens if you play ...?" and the learner finds the
  opponent's tactic.
- Puzzles are recorded as attempts; as cards (`puzzle:<id>`) only if puzzle cards are agreed
  ([decisions](../decisions.md)).
- When a scope has too few matches, the level falls back one step at a time until enough are found, and the bar says so
  ("matched by structure").
- Offline: shipped selections only; nothing is fetched. The puzzle database is credited on [credits](credits.md).

## Leads to

[board](board.md) (**Open on the board**, with the position); the [step](step.md) whose position the puzzle came
through; [idea](idea.md) from a theme; the game on Lichess; summary → [practice](practice.md) or [Today](today.md).

## From v1

New. No puzzles in v1; the session machinery comes from Quiz (`features/quiz/store.ts`) and the set-up from
`components/practice-setup.tsx`.
