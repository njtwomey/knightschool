# engine

The browser engine (Stockfish in a Worker): whether it is on, the search running now, and its cache.

## Holds

- **status**: off, starting, ready, searching, failed (with why);
- the **current search**: the position, the depth asked, partial lines as they come, and who asked;
- the **latest result** per position shown (lines with scores from White's point of view, depth, best move);
- a handle on the **cache** (the database when open, nothing otherwise: the engine still works without it).

Preferences (on or off, depth, number of lines) are [settings](settings.md) on the device store.

## Written by

[board-eval](../components/board-eval.md) when its board's position changes and the engine is on; the
[judgement](judgement.md) store for live verdicts; the [analysis](../pages/analysis.md) page; the engine toggle in
[board-settings-menu](../components/board-settings-menu.md) and the `e` key ([shortcuts](../navigation/shortcuts.md)).

## Read by

[board-eval](../components/board-eval.md) (bar, strip, lines), [eval-words](../components/eval-words.md),
[judgement](judgement.md); the Play on responder when it falls back to the engine
([play-on](../pages/play-on.md)); [line-editor](../pages/line-editor.md) checking a line as it is written.

## Persists

- Evaluations: the `eval_cache` table (epd, depth, multipv, engine, cp, mate, pv, at), finished searches only,
  exported in v1 (see the open question in [judgement](judgement.md)).
- Preferences: localStorage `knightschool.engine`, per device, not exported.
- The engine itself is a GPL asset copied into `public/engine` and fetched into a Worker; only UCI text crosses
  `postMessage`.

No change to the stored format.

## Behaviour worth keeping

One search at a time; a different position stops the running one (resolved as partial, never stored); a position is
searched once (`evaluateCached` reads the store first); depth 14 with three lines for live analysis, deep enough to be
far stronger than any beginner and quick enough to answer in about a second.

## From v1

- `apps/web/src/data/engine/store.ts` (`useEngine`, `evaluateLive`, depth 14, multipv 3, the database as cache),
  `data/engine/worker-transport.ts`, `data/engine/prefs.ts` (`useEnginePrefs`, on by default).
- `packages/engine` (`UciTransport`, `evaluateCached`, `measureLineCached`, `toRows`, `fromRows`).
- `apps/web/src/components/engine/` (`eval-bar.tsx`, `engine-strip.tsx`, `engine-lines.tsx`).
