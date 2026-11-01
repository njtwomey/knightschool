# Verdict note

The one-line reason for a verdict: "A mistake: after ...Nxg5 the knight is lost", with the refutation to see on the
board.

## Shows

- the [verdict-badge](verdict-badge.md) in word form, then one sentence of why, chosen in order of trust: the author's
  note on that move or refutation, then a tactic spotted on the board, then the engine's sentence ("The engine thinks
  this gives up about 1.4 pawns. It prefers 5.d4.");
- the refutation as a [move-run](move-run.md) of two to four moves, each a chip;
- the [idea-badge](idea-badge.md) of what the punishment is, when known ("fork");
- for a move as good as the book move: "As good as 4.c3, which is what this opening plays", with no refutation;
- for the opponent's mistake: how often it is played at the learner's band ("about a quarter of games").

## Configuration

- `verdict`: from [use-judgement](../hooks/use-judgement.md), with its explanations and refutation.
- `side`: whose move it was (the learner's, or the opponent's mistake to punish), which changes the wording.
- Settings read: `feedback.explain` (symbol only, a sentence, or a sentence with the refutation on the board),
  `level.band` (for "at your level").

## Behaviour

- Hovering a move in the refutation previews it on the board; clicking steps the board's side branch to it. **Show
  why** at the end walks the whole refutation ([board-feedback](board-feedback.md)).
- While only the badge is known, the sentence reads "Checking why…" and fills in when the engine answers; with the
  engine off and nothing baked, the author's note or the tactic is all, and nothing is invented.
- Sentences follow [wording](../patterns/wording.md): plain, no exclamation marks, move numbers by the one rule.
- Never shown before the move is answered.

## Composed of

[verdict-badge](verdict-badge.md), [move-run](move-run.md), [idea-badge](idea-badge.md), [rich-text](rich-text.md) (the
author's note).

## Used by

[board-feedback](board-feedback.md), [tries-table](tries-table.md) (expanded row),
[move-explanation](move-explanation.md) ("why not the others"), [session-summary](session-summary.md).

## From v1

New. The sentences exist in core `explain/explainers.ts` (`authorExplainer`, `motifExplainer`, `engineExplainer`, which
already plays the refutation through the motif detector) and `explain/motif.ts`; v1 shows the engine's sentence only in
the engine strip (`apps/web/src/components/engine/engine-strip.tsx`) and the regret words (`REGRET_WORDS` in core
`training/regret.ts`) in the quiz's miss list.
