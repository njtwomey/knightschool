# Analysis

A free board: play moves, set up a position, paste a PGN or FEN, and see the engine, the explorer and the verdict on
every move. For the curious, and for anyone leaving a puzzle, a game or a line to look further.

## Address

`/explore/analysis`. Hash: `#pgn=<moves>&fen=<start>&ply=<n>&side=white|black`, the whole board in the address so a
link shares exactly this position ([../navigation/url-state.md](../navigation/url-state.md)). v1's `/lab` and its hash
land here.

## Reached from

**Explore** › Analysis in the menu; **Analyse** on [line](line.md), [puzzles](puzzles.md), [play-on](play-on.md),
[your games](your-games.md); a [position-card](../components/position-card.md) in [search](search.md); any move's
"Open in analysis" in its [position-preview](../components/position-preview.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Explore › Analysis.

Two columns from lg (`.board-columns`):

1. Board side: a [board](../components/board.md) in the `analysis` preset:
   [board-surface](../components/board-surface.md), [board-eval](../components/board-eval.md) (the bar),
   [board-controls](../components/board-controls.md) with flip, [step-buttons](../components/step-buttons.md) and the
   page's actions (**Set up**, **Load**, **Copy**, **Clear**).
2. Panel side:
   - [move-table](../components/move-table.md) of the moves, side lines folded in, each move with its
     [verdict-badge](../components/verdict-badge.md);
   - [board-feedback](../components/board-feedback.md) for the shown move: the
     [verdict-note](../components/verdict-note.md) and the better move;
   - [board-eval](../components/board-eval.md) as the engine's lines;
   - [board-explorer](../components/board-explorer.md): what players at the band play here, with share and verdict;
   - [position-features](../components/position-features.md): threats, hanging pieces, pins, lit on the board on hover;
   - **In your openings**: [position-card](../components/position-card.md)s for every line through this position.

**Set up** swaps the panel for piece trays and side to move; **Load** takes a PGN or FEN pasted or typed.

## Behaviour

- Board `analysis` preset, `study` reveal: everything shown ([../patterns/reveal.md](../patterns/reveal.md)). Playing a
  move off the moves so far starts a side line and never loses the main one
  ([../hooks/use-board-model.md](../hooks/use-board-model.md)).
- Verdicts come from the author, then baked analysis, then the browser engine, arriving when known
  ([../hooks/use-judgement.md](../hooks/use-judgement.md)); the explorer from baked data, then live with the learner's
  token ([../hooks/use-explorer.md](../hooks/use-explorer.md)).
- A PGN that does not parse says where ("move 12: Nf3 is not legal here") and keeps the moves before it.
- Engine off (a setting): eval, verdict costs and lines are hidden, with a
  [setting-inline](../components/setting-inline.md) to turn it on.
- Arrow keys step ([../navigation/shortcuts.md](../navigation/shortcuts.md)); right-drag draws marks for this view
  only, never saved.
- Nothing here is graded or recorded: there is no tries table, because nothing is being guessed.

## Leads to

A position card → [line](line.md) or [map](map.md); **Search this position** → [search](search.md); **Write a line from
here** → [create](create.md) (a new opening starting here).

## From v1

`features/lab` (`lab-page.tsx`, `setup-card.tsx`, `load-card.tsx`, `copy-card.tsx`, `setup-tool.ts`) and
`features/explorer/explorer-panel.tsx`. Verdict: **repurpose** onto the board model; verdicts and position features
are new.
