# eval

Scores in one form, turned into winning chances, costs and words, so every verdict, bar and sentence reads a score the
same way.

## Gives

- **`Score`**: `{ cp } | { mate }`, always from White's point of view (v1 `EngineScore`, `EngineLine`). A mate of 0 is
  never stored: a position already mate is given as mate in 1 for the winner, as v1 does.
- **`forSide(score, side) → Score`**: the same score from one side's view (flips the sign), for wording and costs.
- **`winningChance(score) → number`** from -1 (Black wins) to 1 (White wins), Lichess's formula:
  `2 / (1 + exp(-0.00368208 × cp)) - 1`, with cp capped at ±1000 first; a mate counts as ±1. The same curve in
  percent (`50 + 50 × chance`) is what the eval bar draws and the tries table can show.
- **`moveCost(reference, played, side) → Cost`**: what the move played cost the mover against a reference move. Both
  scores are of the positions after each move. `Cost` is `{ cp, gainCp, chanceDrop, mate }`: centipawns lost (0 to the
  cap), centipawns gained when the played move is better, the drop in the mover's winning chance (0 to 2), and
  `'allowed' | 'missed' | null` when a forced mate changed hands (v1 `moveRegret`, extended with the drop).
- Two references, one function: **against the best** (the engine's first line in the position before) and **against the
  line's move** (the opening's own move). A verdict carries both when both are known.
- **`scoreWords(score, perspective) → Words`**: `{ band, text }`, the band one of `equal`, `slightlyBetter`,
  `clearlyBetter`, `winning`, `mate`, and the sentence: "About equal", "White is a little better", "Black is clearly
  better", "White is winning", "White mates in 4"; with `perspective: 'learner'`, "You are a little better".
- **`changeWords(before, after, perspective)`**: "Black is a little better now; it was equal" (eval-words' `before`).
- **`formatScore(score)`**: "+0.62", "-M3"; moves here from `packages/engine` so core can format without the engine.

## Takes

Scores only: no chess.js, no engine. The side to move comes from the caller. Config for the thresholds below.

## Rules

- **One cap.** cp is capped at ±1000 before anything else (v1 `REGRET_CAP`, and Lichess's own ceiling), so a forced mate
  or a won rook never swamps an average or a cost.
- **The curve.** Some values: 30 cp 0.055, 100 cp 0.18, 200 cp 0.35, 300 cp 0.50, 500 cp 0.73, 1000 cp 0.95. The
  same pawn costs more at equality than when far ahead: a drop of 0.1 is about 54 cp from equal, about 70 cp from +3,
  and over 150 cp from +5. This is why grades use the drop, not centipawns.
- **Words** use bands on the winning chance (proposed key `judge.evalWords`, defaults 0.05, 0.18, 0.43): under 0.05
  (about ±0.3 pawns) equal; under 0.18 (about 1 pawn) a little better; under 0.43 (about 2.5 pawns) clearly better;
  beyond that winning; any mate is "mates in n". These are eval-words' pawn bands restated on the curve.
- **Mate costs.** Allowing a mate where there was none is at least a Blunder; missing a forced mate is graded by the
  position left: still above +700 cp an Inaccuracy, above +300 a Mistake, else a Blunder (Lichess's rule for a lost
  mate). judge reads `Cost.mate` for this.
- **v1's regret maps across** (`training/regret.ts`): `moverValue` becomes `forSide` plus the cap; `moveRegret` becomes
  `moveCost`; `REGRET_CAP` 1000 stays as the cap. The verdicts give way to grades from the drop (judge): **better**
  (the played move gains 30 cp or more) becomes Best or Excellent with "the engine prefers yours"; **slip** (under
  `SLIP_CP` 30) becomes Best, Excellent or Good, flagged "not your repertoire move"; **inaccuracy** (30 to 99,
  `MISTAKE_CP` 100) is usually Good or Inaccuracy; **mistake** (100 and more) is Inaccuracy, Mistake or Blunder by
  the drop. `regretSummary` survives as a summary of costs by grade, with the mean centipawn cost the tries table shows.
- The eval bar's share is the winning chance in percent, replacing v1's `whiteShare` (a logistic over cp / 400), so
  the bar and the grades agree.

## Used by

[judge](judge.md), [explain](explain.md); [eval-words](../components/eval-words.md),
[board-eval](../components/board-eval.md), [verdict-badge](../components/verdict-badge.md) (cost in the wide form),
[tries-table](../components/tries-table.md), [session-summary](../components/session-summary.md),
[position-card](../components/position-card.md); [use-judgement](../hooks/use-judgement.md),
[judgement store](../stores/judgement.md); the [board](../pages/board.md) page; `scripts/course-eval.ts` (swings) and
the build's punish check (`coverage.punishLoss`).

## From v1

- `packages/core/src/training/regret.ts`: **repurpose**; scores and costs move here, grades to judge.
- `packages/engine/src/uci.ts` (`formatScore`, `whiteShare`): **repurpose**; formatting moves here, the bar's share
  becomes `winningChance`. UCI parsing stays in the engine.
- `packages/core/src/explain/explainers.ts` (`scoreOf`, `swingFor`, `BIG_SWING_CP`): **repurpose**; the engine
  explainer reads `moveCost` instead of its own swing.
- `apps/web/src/features/quiz/regret.ts`: its use of `moveRegret` moves to `moveCost`.

## Tests

- `winningChance` at fixed points (0, ±30, ±100, ±300, ±1000, beyond the cap, mates both ways), symmetric in sign.
- `moveCost`: both sides, gains, capped losses, mate allowed and missed, references equal to played (zero cost).
- `scoreWords` table-driven across every band edge, both perspectives, mate in 1 and in n.
- The regret mapping: every v1 `regret.test.ts` case gives the same centipawns through `moveCost`.

## Open questions

1. The Lichess curve is a function of cp alone, so "+2.0 in a quiet position and in a sharp one" still read the same
   (eval-words asks for the opposite). Only Stockfish's own win/draw/loss output (`UCI_ShowWDL`) depends on the
   position. Worth storing WDL in `evals` for words, keeping the Lichess curve for grades?
