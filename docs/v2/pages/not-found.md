# Not found

What an address that leads nowhere shows: what was looked for, the nearest things that do exist, and a way on. For
anyone following an old, mistyped or out-of-date link.

## Address

Any path that matches no route, and any well-formed address whose id is unknown (`/openings/no-such-opening`,
`/ideas/forkk`, `/openings/italian-game/step/40`). The address is kept as typed so it can be corrected; no hash
([../navigation/routes.md](../navigation/routes.md)). Old v1 addresses (`/course/...`, `/play/...`, `/quiz`, `/tree`,
`/glossary`, `/lab`, `/profile/...`) never reach here: they are redirected.

## Reached from

A stale bookmark, a shared link to an authored opening that was deleted or renamed, a typo. Hosts serve the app for
unknown paths (`_redirects`, `404.html`), so this page is drawn by the app, offline too.

## Layout

[page-shell](../components/page-shell.md) with the full menu, then an [empty-state](../components/empty-state.md):

1. A plain heading saying what was missing: "There is no page at /opennings", "There is no opening called
   no-such-opening", "The Italian Game has 24 steps; there is no step 40".
2. **Did you mean**: up to three nearest matches by name, from the same forgiving matching as
   [search](search.md) ("Italian Game", "/openings"), each a link. For a step number out of range, the opening's last
   step and its page.
3. A [search-box](../components/search-box.md) filled with the address's words.
4. Links: **Today**, **All openings**, **The map**.

## Behaviour

- Nothing is stored or changed. The page title says "Not found" so the browser history reads right.
- For an authored opening that existed on this device but was deleted, the page says so and offers **Undo** on
  [create](create.md) when the delete can still be undone.
- No breadcrumbs beyond the root: there is nothing to place it under.

## Leads to

[search](search.md) with the query; [Today](today.md), [openings](openings.md), [map](map.md); the nearest match.

## From v1

None: v1's `parseRoute` (`apps/web/src/router/route.ts`) shows the home page for any unknown path, which hides broken
links. Verdict: **new**.
