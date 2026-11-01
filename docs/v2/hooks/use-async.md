# useAsync

Loads anything for a component, again when its inputs change, with loading and error states: v1's hook, kept.

## Gives

- **data**: what the latest finished load gave; after the inputs change it stays until the new load is in, so a page
  does not flash empty between two openings;
- **error**: why the latest finished load failed, in words (`errorText`);
- **loading**: a load for the current inputs is still running.

A sketch: `const { data, error, loading } = useAsync(() => loadOpening(id), [id])`.

## Takes

- a load function returning a promise, or null when there is nothing to load yet (the database not open, say): then
  nothing runs and what was there stays;
- the inputs that decide when to load again, like an effect's dependencies.

## Behaviour

- An answer for earlier inputs never lands after a later one.
- The first render with new inputs already counts as loading.
- Never a hand-written cancelled flag in a component: every effect that loads uses this.
- For something loaded once for the whole app (the catalogue index, analysis, an opening), the loader itself is
  wrapped in `onceRetryable` so many components share one load that tries again after a failure; `useAsync` then reads
  it per component.
- Loading and error look the same everywhere: [page-shell](../components/page-shell.md)'s skeleton and
  [notice](../components/notice.md), as [states](../patterns/states.md) says.

## Used by

Any component or page loading data not held in a store: [opening-card](../components/opening-card.md) thumbs,
[puzzle-card](../components/puzzle-card.md), [line-story](../components/line-story.md), pages
[line](../pages/line.md), [idea](../pages/idea.md), [stats](../pages/stats.md), [credits](../pages/credits.md),
[your-games](../pages/your-games.md); and inside other hooks ([use-progress](use-progress.md),
[use-explorer](use-explorer.md)).

## From v1

- `apps/web/src/hooks/use-async.ts` (`useAsync`, `AsyncState`): kept as it is.
- `apps/web/src/data/fetch-content.ts` (`onceRetryable`, `fetchContent`) and `lib/errors.ts` (`errorText`).
