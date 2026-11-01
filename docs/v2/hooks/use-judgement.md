# useJudgement

The verdict on a move: from the author first, then baked analysis, then the browser engine, arriving when known.

## Gives

- **verdict**: the grade (Book, Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Miss), its symbol, the cost in
  centipawns against the line's move and the drop in winning chances;
- **why**: the author's note when there is one, else sentences from the explainers (motif, engine);
- **refutation**: the punishing line as moves, to step through on the board;
- **layer**: author, baked or live, and the depth, so a row can say "depth 14, live";
- **status**: known, pending (live search running), unknown (engine off, nothing baked).

A sketch: `const { verdict, why, refutation, status } = useJudgement({ epd, uci, expected })`.

## Takes

- the position (EPD), the move played (UCI), the move the line expects (when there is one), and the side to judge for;
- optional `live: false` to stay with author and baked layers (lists of many moves, the map).

## Behaviour

- Answers synchronously when the author or baked layer knows, so the verdict appears with the cross, not after it.
- Otherwise asks the [judgement store](../stores/judgement.md), which queues a search on the
  [engine store](../stores/engine.md) at the strip's depth; the verdict fills in when it lands. Nothing waits for it.
- Grades by winning chance, as Lichess and Chess.com do; v1's regret thresholds (under 30, 30 to 99, 100 and more) are
  kept as the fallback when only centipawns are known.
- Reveal: the hook does not hide anything itself; components show the verdict only once the exercise is answered.
- Several hooks for the same move share one search.

## Used by

[board-feedback](../components/board-feedback.md), [verdict-badge](../components/verdict-badge.md),
[verdict-note](../components/verdict-note.md), [tries-table](../components/tries-table.md),
[move-explanation](../components/move-explanation.md), [board-explorer](../components/board-explorer.md) (a verdict
per move), [position-preview](../components/position-preview.md); and
[use-exercise-session](use-exercise-session.md) on every wrong move.

## From v1

- `apps/web/src/data/analysis.ts` (`bakedEvaluation`, `bakedFirstStore`, `loadAnalysis`): baked first, live after.
- `apps/web/src/data/engine/store.ts` (`evaluateLive`, depth 14, three lines): the live layer.
- core `training/regret.ts` (cost bands after a quiz) and `explain/` (`Explainer`; the engine explainer's sentences
  are written and never shown in v1).

## Open questions

1. Should a live verdict be replaced if a deeper search later disagrees, or is the first answer final for the session?
   The proposal: final for the session, so a row in the tries table never changes grade under the learner.
