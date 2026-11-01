# Eval words

Where a position stands, in words a beginner understands and, if wanted, the number: "White is a little better
(+0.6)".

## Shows

One short phrase from the engine score, with the number after it in brackets. The words follow winning chance, as
the verdicts and the eval bar do, with the bands from config `judge.evalWords` ([config](../config.md)):

| White's winning chance, -1 to 1 (about, in pawns) | Words                               |
| ------------------------------------------------- | ----------------------------------- |
| within 0.05 either way (about -0.3 to +0.3)       | About equal                         |
| 0.05 to 0.18 (about 0.3 to 1.0)                   | White (or Black) is a little better |
| 0.18 to 0.43 (about 1.0 to 2.5)                   | White is clearly better             |
| 0.43 and more                                     | White is winning                    |
| a forced mate                                     | White mates in 4                    |

When the opening is the learner's, "you" can replace the side: "You are a little better (+0.6)". After a move it can
say the change: "Black is a little better now; it was equal".

## Configuration

- `score`: an engine score (centipawns or mate) from White's point of view, with its depth and source.
- `before`: an earlier score, to say what changed.
- `perspective`: `sides` (White, Black) or `learner` (you, your opponent).
- `form`: `words`, `words and number`, or `number`.
- Settings read: `feedback.evalAfter` (off, words, words and numbers), which a page's own `form` never overrides.

## Behaviour

- Hover or long-press: a [hint](hint.md) with what the number means ("+0.6 is worth a little over half a pawn") and
  where it came from ("depth 26, baked").
- Pending: "…" until a score exists; unknown (engine off, nothing baked): nothing at all.
- Never shown at the `test` reveal level ([reveal](../patterns/reveal.md)); at the end of every line, step and puzzle
  it is the "where you stand" sentence.

## Composed of

[hint](hint.md).

## Used by

[board-eval](board-eval.md) (the strip), [position-preview](position-preview.md), [position-card](position-card.md),
[verdict-note](verdict-note.md), [session-summary](session-summary.md); pages [step](../pages/step.md) (Done),
[puzzles](../pages/puzzles.md), [play-on](../pages/play-on.md), [line](../pages/line.md) (where it leaves you).

## From v1

New. Scores are formatted today by `formatScore` in `packages/engine` and shown as numbers in
`apps/web/src/components/engine/eval-bar.tsx` and `engine-strip.tsx`, over `data/analysis.ts` (baked, then live).
