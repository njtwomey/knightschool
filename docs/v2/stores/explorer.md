# explorer

Explorer answers from Lichess (what players at a band play from a position), cached for 30 days, one request at a time.

## Holds

- the **baked counts** shipped with the app (positions on the openings' lines and the replies just off them, at 1000
  to 1600), loaded once;
- **live answers** by position and band, as read from the cache or fetched: total games, results, moves with their
  counts, the Lichess opening name, when fetched;
- the **queue**: one request in flight, the rest waiting, deduplicated by position and band;
- the **pause**: until when no calls are made after a 429 (60 seconds);
- whether a **token** is set (the token itself is a secret [setting](settings.md), never held here in plain view of
  anything else).

## Written by

Its own fetcher, asked by [use-explorer](../hooks/use-explorer.md); clearing the cache from the
[data](../pages/data.md) page; saving or removing the token on the [settings](../pages/settings.md) page (which wakes
or stops it).

## Read by

[use-explorer](../hooks/use-explorer.md) and so [board-explorer](../components/board-explorer.md),
[coverage-meter](../components/coverage-meter.md), [gap-link](../components/gap-link.md),
[position-preview](../components/position-preview.md), [map-tree](../components/map-tree.md) (gaps); the
[session](session.md)'s popular responder (Drill, Play on); [onboarding](../pages/onboarding.md) suggestions.

## Persists

- Live answers: the existing `explorer_cache` table (key, epd, db, speeds, ratings, results, moves, opening name,
  fetchedAt), 30-day TTL. v1 exports it; like `eval_cache` it is a cache and could be left out.
- The token: localStorage `knightschool.explorerToken`, this browser only, never in the database or an export.
- Baked counts: shipped JSON from `content/popularity/popularity.json`, cached by the service worker.

No new table. Shipping a slice of popularity to the app is a content change.

## From v1

- `apps/web/src/features/explorer/service.ts` (`createExplorer`: one request in flight, 30-day cache,
  `PAUSE_AFTER_429_MS`, `ExplorerPausedError`, `getToken`, `setToken`), `response.ts`, `explorer-panel.tsx`.
- `packages/storage`: `ExplorerCache` repository and the `explorer_cache` table.
- `apps/web/src/features/profile/settings/explorer-section.tsx` (the token field).
- `scripts/popularity.ts` and `content/popularity/popularity.json` (maintainer side).

## Open questions

1. Other bands than 1000 to 1600 go live only; is that acceptable for a learner at 600 with no token, who would see no
   counts at all? A fallback to the baked band, labelled as such, is proposed.
