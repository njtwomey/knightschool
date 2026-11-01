# explain

The sentences: why a move is good or bad, what a position is about, where it stands, each with the squares and
arrows that show it on the board.

## Gives

- **`Explanation`**: `{ kind, text, ideas, confidence, source, shapes }`, `kind` one of `why-good`, `why-bad`,
  `what-it-does`, `position`; `source` one of `author`, `motif`, `features`, `engine`; `shapes` in PGN mark form
  (`Rd1h5`, `Ye4`) so the board draws them like an author's marks.
- **`Explainer`**: one interface, several providers: `explain(beforeEpd, uci, context) → Explanation[]`.
- Providers, in order of trust:
  - **author**: the move's note ([annotations](annotations.md)), confidence 1;
  - **motif**: per-move tactics from comparing [features](features.md) before and after the move: a piece left loose,
    a fork made or allowed, a pin, a skewer, a mate threat, castling given up;
  - **engine**: from a [judge](judge.md) verdict: "This gives up about 1.4 pawns. The engine prefers 7.d4. After
    7...Nxe4, the knight on e4 forks the queen and rook." It plays the first two moves of the refutation through the
    motif provider to name the punishment.
- **`explainMove(epd, uci, context) → Explanation[]`**: all providers, filtered so that when the author wrote a note
  only confident generated sentences stay (v1 `MIN_CONFIDENCE_WITH_AUTHOR`, 0.7).
- **`explainVerdict(verdict, context) → string`**: the one line for [verdict-note](../components/verdict-note.md):
  grade word, symbol, then the best sentence ("A mistake: after ...Nxg5 the knight is lost"), and "Good, but not your
  repertoire move: the opening plays 5.d4" for an off-repertoire move.
- **`explainPosition(epd, side) → Explanation[]`** (new): the [position-features](../components/position-features.md)
  list as sentences ("The knight on f6 is pinned to the queen by the bishop on g5"; "d5 is a hole for Black").
- **`explainScore(score, before?)`**: [eval](eval.md)'s words, for line ends and "where you stand".

## Takes

[features](features.md), [eval](eval.md), [judge](judge.md)'s verdict, [annotations](annotations.md), [chess](chess.md)
for SAN and move numbers. No engine call: evaluations come in through the verdict or the context.

## Rules

- **Every judgement explains itself** (README principle 2): a wrong move always gets at least the grade word and, when
  an evaluation exists, the engine's sentence. Never only "wrong".
- **Trust order**: author, then features and motifs (they are certain about the board), then engine (confidence 0.75,
  as v1). The author's wording wins where it says the same thing.
- **Wording** (patterns/wording): plain English, British spelling, no exclamation marks, SAN with move numbers from
  the notation helpers, pieces named in full ("the knight on f6"), sides named or "you" in the learner's own opening.
- **Costs in words**: "about 1.4 pawns"; past the cap, "a won game"; a mate within eight moves is said ("It leads to
  mate in 3"), as v1.
- **No language model** (CLAUDE.md: "No LLM calls"); the `llm` source in v1's type is dropped.
- Sentences are built from verdicts and features each time, never stored; this module hides nothing, the components
  show them only once an exercise is answered (patterns/reveal).

## Used by

[judgement store](../stores/judgement.md) (keeps the why with each verdict), [use-judgement](../hooks/use-judgement.md);
[verdict-note](../components/verdict-note.md), [board-feedback](../components/board-feedback.md),
[move-explanation](../components/move-explanation.md), [position-features](../components/position-features.md),
[board-eval](../components/board-eval.md) (the strip's sentence), [eval-words](../components/eval-words.md),
[session-summary](../components/session-summary.md); pages [step](../pages/step.md), [puzzles](../pages/puzzles.md),
[play-on](../pages/play-on.md), [board](../pages/board.md).

## From v1

- `packages/core/src/explain/types.ts` (`Explanation`, `Explainer`, `ExplainContext`): **keep**, `motifs` renamed
  `ideas`, kind `position` added.
- `packages/core/src/explain/explainers.ts` (`authorExplainer`, `motifExplainer`, `engineExplainer`, `explainMove`):
  **repurpose**; the engine explainer reads judge's verdict instead of its own `swingFor`. Its sentences exist in v1 but
  are never shown (CLAUDE.md, "Still open"): v2 shows them.
- `packages/core/src/explain/motif.ts` (`explainMotifs`): **repurpose** over [features](features.md).
  `explainVerdict`, `explainPosition`: **new**.

## Tests

The existing `explainers` and `motif` tests stay, table-driven per motif. New: each grade's line from
`explainVerdict`, an off-repertoire sentence, author-first filtering, `explainPosition` for one FEN per feature kind,
and a wording check (no exclamation marks, move numbers through the helpers).
