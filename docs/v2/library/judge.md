# judge

The one verdict on a move: how good it is in this position, and why, from the author first, then baked analysis, then
the live engine.

## Gives

- **`judgeMove(epd, uci, facts) → Judgement`**, pure and synchronous. A `Judgement` is either
  `{ status: 'known', verdict }` or `{ status: 'needs', epds, partial? }`: the positions whose evaluation would settle
  it, so the caller (the [judgement store](../stores/judgement.md)) asks the engine and calls again. Core never waits.
- **`Verdict`**:
  - `grade`: `book`, `best`, `excellent`, `good`, `inaccuracy`, `mistake`, `blunder`, `miss`;
  - `symbol`: the PGN mark where one exists (`!` NAG 1, `?!` 6, `?` 2, `??` 4); the badge's own icons for Book, Best,
    Good and Miss are [verdict-badge](../components/verdict-badge.md)'s;
  - `cost` against the best and `costVsLine` against the line's move ([eval](eval.md) `Cost`), each when known;
  - `refutation`: the punishing reply and what follows, as UCI from the position after the move;
  - `note`: the author's words, marks and ideas; `offRepertoire` (sound, not the opening's move); `alternative`;
  - `source`: `author`, `baked` or `live`, with the `depth` of the evaluation used;
  - for an opponent's move, `share`: how often players at the band play it here, and `common` (below).
- **`judgeDeviation(atEpd, laterEpd, side) → 'kept' | 'gave away' | 'gained'`**: after a move leaves the book, whether
  the side kept its winning chance `opponent.deviationJudgeAfter` moves later (Play on, your games).

## Takes

[eval](eval.md) for costs, [annotations](annotations.md) for notes and refutations, [chess](chess.md) for replaying.
`facts`: the side that moved; the opening's move or moves here (`expected`, with alternatives); the tree's moves here
(the opponent's book); the move's note; the refutations at `epd`; `evalOf(epd)`, a lookup over baked evaluations and
the `eval_cache`, each with its depth; the band's counts at `epd` (from [lichess-data](lichess-data.md)); and the
verdict on the opponent's previous move, for Miss.

## Rules

- **Layers, first that knows wins.**
  1. **Author.** The opening's own move is **Book** (an alternative is Book with `alternative`); for the opponent, any
     move the opening answers is Book. A move marked in the PGN, or the first move of a refutation, takes the author's
     grade: `!!` Best, `!` Excellent, `!?` Good, `?!` Inaccuracy, `?` Mistake, `??` Blunder. The author's grade wins
     over the engine's; the cost is still filled in when an evaluation exists.
  2. **Baked.** `knowledge.sqlite` `evals` at `engine.bakedDepth` (24): the openings' positions with three lines each,
     and (new, `pnpm analyse --replies`) the positions after the moves players at the band play there, so the common
     wrong moves are known before anyone plays them. A move among the three lines needs no second lookup.
  3. **Live.** Anything else is returned as `needs`; the store searches at `engine.liveDepth` (14) with three lines,
     cached in `eval_cache`, and calls again. Nothing waits for it; the verdict fills in.
- **Grades from the drop** in the mover's winning chance against the best move (`judge.grades`, Lichess's 0.1, 0.2,
  0.3; the lower cut-offs proposed): the engine's first move, or a drop of 0.01 or less, is **Best**; under 0.04
  **Excellent**; under 0.1 **Good**; under 0.2 **Inaccuracy**; under 0.3 **Mistake**; 0.3 or more **Blunder**. A mate
  that changed hands applies eval's mate rule, never grading lower than the drop says.
- **Sound but not the line's move.** When the opening expects another move and the engine grades this one Best,
  Excellent or Good, the verdict keeps that grade and sets `offRepertoire`, with `costVsLine` for "about as good as
  ...". The exact grader answers `another` ([exercise](exercise.md)): no try used, never called a mistake, and the
  learner is asked for the line's move (capabilities.md 2). This replaces v1's "slip" and "better".
- **Miss**: after an opponent's Mistake or Blunder (by this same function), a reply that gives back a drop of 0.1 or
  more is a Miss instead of an Inaccuracy or Mistake; a Blunder stays a Blunder.
- **Opponent mistakes** are `judgeMove` with the side flipped. `share` is the move's games over the position's games at
  `coverage.band`. A move is **common** when graded Mistake or worse, played at least `coverage.punishShare` (10%) of
  the time and losing at least `coverage.punishLoss` (150 cp). The build fails an opening that leaves a common mistake
  unpunished; the map and a step's follow-ups list them.
- **Refutation**: the author's refutation (the move plus its `then`) when written, else the first six plies of the
  engine's line from the position after the move (proposed `judge.refutationPlies`). Only for Inaccuracy and worse.
- **Never stored**: worked out again from cached evaluations; the store keeps the first live verdict for the session,
  so a tries-table row never changes grade under the learner.

## Used by

[explain](explain.md), [exercise](exercise.md), [training](training.md); [use-judgement](../hooks/use-judgement.md),
[judgement store](../stores/judgement.md), [use-exercise-session](../hooks/use-exercise-session.md);
[board-feedback](../components/board-feedback.md), [verdict-badge](../components/verdict-badge.md),
[verdict-note](../components/verdict-note.md), [tries-table](../components/tries-table.md),
[move-explanation](../components/move-explanation.md), [board-explorer](../components/board-explorer.md),
[map-tree](../components/map-tree.md); pages [step](../pages/step.md), [drill](../pages/drill.md),
[review](../pages/review.md), [play-on](../pages/play-on.md), [your-games](../pages/your-games.md),
[line-editor](../pages/line-editor.md); `scripts/course-eval.ts` and the build's punish check.

## From v1

- `packages/core/src/training/regret.ts`: **repurpose**, grading here, scores to [eval](eval.md);
  `explain/explainers.ts`: `authorExplainer`'s NAG check moves here.
- `apps/web/src/data/analysis.ts` (`bakedEvaluation`, `bakedFirstStore`): **repurpose** as the web's
  `data/judgement.ts`, which fills `facts` and runs the live layer. `judgeMove`, `Verdict`, Miss: **new**.

## Tests

Table-driven grades at every drop edge, both sides, with and without mates; layer order (author over engine, Book
over Best, baked over live; `needs` lists exactly the missing positions, none when the move is among the baked lines);
off-repertoire flags and alternatives; Miss only after a Mistake or Blunder; common mistakes at the thresholds' edges;
refutations from the author and from the engine.

## Open questions

1. Settled: the cut-offs and `judge.refutationPlies` are in ../config.md, and Book for the opponent is any move in the
   theory tree.
