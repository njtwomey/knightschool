# judgement

Verdicts and evaluations known so far, from the author, baked analysis and the browser engine.

## Holds

- the **baked analysis** file, loaded once: evaluations for the openings' positions, and (new) for the positions after
  the moves players at the band commonly play there;
- **verdicts by position and move**: grade, symbol, cost, winning-chance drop, refutation, the layer it came from and
  the depth;
- **pending** searches, so several components asking about the same move share one;
- the **why** sentences built for a verdict (author note, motif and engine explainers), kept with it.

The author layer is not held here: it is read from the [catalog](catalog.md) (the opening's own move is Book, a move
marked `?` or a refutation's first move carries the author's words).

## Written by

Its own look-up, called by [use-judgement](../hooks/use-judgement.md): author, then baked, then a live search queued on
the [engine](engine.md) store, whose result is turned into a verdict and kept.

## Read by

[use-judgement](../hooks/use-judgement.md) and so [board-feedback](../components/board-feedback.md),
[verdict-badge](../components/verdict-badge.md), [verdict-note](../components/verdict-note.md),
[tries-table](../components/tries-table.md), [eval-words](../components/eval-words.md),
[board-eval](../components/board-eval.md) (baked first, as the strip does now),
[move-explanation](../components/move-explanation.md); the [session](session.md) (wrong moves, opponent mistakes),
the [map](../pages/map.md) (the opponent's mistakes marked).

## Persists

- Verdicts: **never** stored; they are worked out again from evaluations, which are cheap once cached.
- Live evaluations: the existing `eval_cache` table, through the [engine](engine.md) store (only finished searches).
  v1 exports it with everything else; it is a cache, so it could be left out of exports to keep them small.
- Baked analysis: shipped JSON (`public/content/analysis.json`), service-worker cached, never exported.

No new table. Shipping replies in the baked file is a content change (`pnpm analyse --replies`), not a
stored-format one.

## From v1

- `apps/web/src/data/analysis.ts` (`BAKED_PREFIX`, `isBaked`, `bakedEvaluation`, `bakedFirstStore`, `loadAnalysis`):
  renamed `data/judgement.ts` with the three layers (capabilities.md 2).
- `apps/web/src/data/engine/store.ts` (`evaluateLive`).
- core `training/regret.ts` (cost bands), `explain/` (the `Explainer` providers).
- `features/quiz/miss-list.tsx` and the quiz summary, which today judge misses only after the session.

## Open questions

1. Leave `eval_cache` out of exports? It is the largest table and can always be rebuilt; the proposal is an export
   switch, off by default. That changes what an export holds, so it is the user's call.
