# engine

The `packages/engine` package: Stockfish spoken to over UCI, one search at a time, multi-line, a continuous analysis
for the raw board, scores in White's view, and a cache so a position is searched once.

## Gives

- **`createEngine(transport) → Engine`** over a `UciTransport` (`send`, `onLine`, `terminate`): a Worker in the browser,
  a child process in scripts, `FakeStockfish` in tests.
- **`evaluate(epd, { depth, multipv, movetimeMs }, signal) → Evaluation`**: one finished search.
  `Evaluation = { epd, depth, lines: [{ cp | mate, pv }], engine, partial? }`, best line first.
- **`measureLine(epds, opts, signal)`**: evaluates each position of a line in turn, yielding each (course-eval, Create
  checking a line as it is written).
- **`analyse(epd, { multipv, maxDepth }, signal) → AsyncIterable<Evaluation>`** (new): the continuous analysis. Sends
  `go infinite` (or `go depth maxDepth`) and yields an `Evaluation` each time every requested line has reached a new
  depth, so the bar and lines deepen as results come in. Ends when the position changes, the signal aborts, `stop()` is
  called, or `maxDepth` is reached.
- **`stop()`, `dispose()`**, and **`ready()`** (downloads and starts the engine the first time).
- **Cache**: `EvalStore` (get and put by EPD), `evaluateCached` and `measureLineCached` (read the store first, search
  only when missing or shallower than asked), `toRows` and `fromRows` for the `eval_cache` table.
- UCI parsing (`parseInfo`, `parseBestMove`, `sideToMove`) stays here. Formatting and the bar's share move to
  [eval](eval.md).

## Takes

Core **types only** (`import type`) and core's schemas via `@knightschool/core/schema`, as in v1; never storage or
React. A transport from the caller: `apps/web/src/data/engine/worker-transport.ts` in the browser, a spawn of the
native binary in `scripts/`.

## Rules

- **One search at a time.** Requests queue; a request for a different position stops the running one (`stop`), which
  resolves with the depth it reached, flagged `partial`; waiting searches for other positions resolve partial and
  empty. A request for the same position joins the queue behind it.
- **Partial results are never stored.** Only finished searches go into the cache; a deeper finished search replaces a
  shallower one.
- **Continuous analysis and the one-search rule.** `analyse` is a search like any other: a different position ends
  it. A fixed-depth request (a live verdict for the [judgement store](../stores/judgement.md)) pre-empts it; the
  board's analysis starts again afterwards, from the cache when the position was already searched. When the analysis
  ends, its deepest depth that every line completed is stored as a finished search at that depth.
- **Scores leave the package from White's point of view**: UCI scores are relative to the side to move, so Black-to-move
  scores are negated in `parseInfo`. Every caller can rely on this.
- **Multi-line**: `setoption name MultiPV` before each search. Judgements and the strip use three lines at
  `engine.liveDepth` (14: far stronger than any beginner, about a second in the browser); the raw board shows one to
  five (the `engine.lines` setting) and deepens up to the `engine.depth` cap.
- **The browser build** is Stockfish 19 lite, single-threaded (`sf19-lite-single`), copied from `node_modules/stockfish`
  into `apps/web/public/engine` by `pnpm engine:copy` and loaded as a Worker from our own origin. Multi-threaded
  Stockfish needs cross-origin isolation headers GitHub Pages cannot send (README, "Looked at and not used").
- **GPL kept separate**: Stockfish is never imported or bundled; only UCI text crosses `postMessage`.
- **Native for scripts**: `pnpm analyse` and `pnpm course:eval` run the native binary (env `STOCKFISH`, else `stockfish`
  on the PATH) through the same `Engine` over a child-process transport, at `engine.bakedDepth` (24) and three lines,
  refusing a wasm or lite build. One Stockfish at a time on the maintainer's machine; `--threads` as asked.
- `analyse` gains `--replies`: also the positions after the band's popular moves at each position (from popularity),
  so [judge](judge.md)'s baked layer covers the common wrong moves.

## Used by

[judge](judge.md) (through the store's live layer); [engine store](../stores/engine.md),
[judgement store](../stores/judgement.md), [use-judgement](../hooks/use-judgement.md);
[board-eval](../components/board-eval.md) (bar, strip, lines), [eval-words](../components/eval-words.md); pages
[board](../pages/board.md) (continuous analysis), [play-on](../pages/play-on.md) (the engine responder),
[line-editor](../pages/line-editor.md) (checking a line); scripts `analyse.ts`, `course-eval.ts`.

## From v1

- `packages/engine/src/engine.ts` (`createEngine`, the queue and the stop rule, `ENGINE_ID`): **keep**, add `analyse`.
- `packages/engine/src/uci.ts` (`parseInfo`, `parseBestMove`, `sideToMove`): **keep**; `formatScore` and `whiteShare`
  move to [eval](eval.md).
- `packages/engine/src/cache.ts` (`EvalStore`, `evaluateCached`, `measureLineCached`, `toRows`, `fromRows`): **keep**.
- `packages/engine/src/types.ts`, `testing/fake-stockfish.ts`: **keep**, the fake gains `go infinite`.
- `apps/web/src/data/engine/store.ts`, `worker-transport.ts`, `prefs.ts`: **keep** in the web app (the engine store).
- `scripts/analyse.ts`, `scripts/course-eval.ts`, `scripts/copy-engine.ts`: **keep**; analyse gains `--replies`.

## Tests

- With `FakeStockfish`: the stop rule (a new position resolves the old as partial), the queue, same-position joins,
  abort signals, scores negated for Black to move, multipv ordering.
- `analyse` yields only when every line reaches a new depth, ends on position change and on `maxDepth`, is pre-empted
  by `evaluate` and stores only completed depths.
- Cache: hits skip the engine; shallower entries are searched again; partial results are never put.

## Open questions

1. Should the board's continuous analysis resume by itself after a pre-empting judgement, or wait for the board to ask
   again? Proposed: the engine store restarts it, since it knows the board's position.
