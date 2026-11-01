# useExplorer

What players play at a position: baked counts first, then the live Lichess explorer with the learner's own token.

## Gives

- **moves**: each move played here with its games, share, results (White, draws, Black), and whether the opening
  covers it;
- **total** games reaching the position and its Lichess opening name;
- **source**: baked (the build's popularity data at 1000 to 1600), cache (an earlier live answer, under 30 days old) or
  live;
- **status**: ready, loading, no token (baked only, with a link to Settings), paused (after a 429, with the time left),
  offline, or nothing known.

A sketch: `const { moves, total, source, status } = useExplorer(epd)`.

## Takes

- the position (EPD);
- optional band; by default the learner's band setting. The baked data covers only 1000 to 1600, so any other band
  goes live.

## Behaviour

- Returns baked counts at once when the position is in them; asks the [explorer store](../stores/explorer.md) for a
  live answer only when the band differs, the position is not baked, or the panel asks for more.
- One request in flight across the app, every answer cached for 30 days, no calls for 60 seconds after a 429, none at
  all without a token: all in the store, so many hooks never mean many requests.
- Hidden by reveal level `test` (board.md): the hook still loads, the component does not draw.
- Used by coverage and the drill responder too, which read the same counts without a component.

## Used by

[board-explorer](../components/board-explorer.md), [coverage-meter](../components/coverage-meter.md),
[gap-link](../components/gap-link.md), [position-preview](../components/position-preview.md) (how often reached),
[map-tree](../components/map-tree.md) (gaps); pages [board](../pages/board.md), [opening](../pages/opening.md),
[repertoire](../pages/repertoire.md), [map](../pages/map.md); and [use-exercise-session](use-exercise-session.md)'s
popular responder.

## From v1

- `apps/web/src/features/explorer/service.ts` (`createExplorer`, `getToken`, `PAUSE_AFTER_429_MS`,
  `ExplorerPausedError`) and `explorer-panel.tsx`, `response.ts`.
- `packages/storage`'s `ExplorerCache` and the `explorer_cache` table.
- `content/popularity/popularity.json` (counts per position and move), today baked only into course nodes as
  `node.popularity`; v2 ships the counts the app needs for coverage and the responder.

## Open questions

1. How much popularity data to ship: only positions on openings' lines and one ply beyond (gaps), or more?
