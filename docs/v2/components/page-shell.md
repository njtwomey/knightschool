# Page shell

A page's frame: the site header and menu above, the page's width and gutters, the trail, the page itself, and what
shows while it loads, if it fails, and when another tab has the data. Every page sits in one.

## Shows

- **The header** ([navigation/menu.md](../navigation/menu.md)): Today, Learn, Practice, Explore, Ideas, Create;
  coverage and streak, settings and theme on the right. On a phone, the bottom bar instead.
- **Banners** above the page, full width: the paused banner when another tab has the database, the offline line, a
  new version ready ([notice](notice.md)).
- **The column**: one width for every page (`max-w-6xl`, a 16px gutter on a phone), so moving between pages never
  changes how wide the content is. A page's own grid goes inside it ([layout](../patterns/layout.md)).
- **The trail**: [breadcrumbs](breadcrumbs.md), then the page's title when it has one beyond the last crumb.
- **Notices** for this page, under the trail ([notice](notice.md)).
- **The footer**: credits and licence links, small.

## Configuration

- `trail`: the breadcrumbs, or none (Today, first visit).
- `width`: `page` (the default) or `wide` for the map, which uses the full screen in three columns.
- `gate`: what the page needs before it can show (`database`, `content`, `authored`); until then the skeleton, and if
  it cannot, why ([states](../patterns/states.md)).

## Behaviour

- **Loading**: a skeleton in the page's shape (a board square and a panel for a board page, rows for a list), shown
  only after about 300 ms so a fast load never flickers. The same skeleton covers a page whose code is still arriving.
- **Error**: a page that fails to draw is replaced by "This page could not be shown" with Reload and the error in a
  fold; the header and menu stay, and moving to another page clears it.
- **Another tab**: the page stays readable, anything that would save is disabled with "Paused while Knight School is
  open in another tab", and the banner offers "Use it in this tab".
- Scroll goes to the top on a new page, and back to where it was on Back.
- The document title is the page's name and the site's: "Giuoco Piano · Knight School".

## Composed of

[breadcrumbs](breadcrumbs.md), [notice](notice.md), [empty-state](empty-state.md) (for a gate that cannot open).

## Used by

Every page in [pages](../pages/README.md).

## From v1

Keep. `components/page.tsx` (`Page`: one width and padding, `minmax(0,1fr)`), `components/page-fallback.tsx`
(`PageFallback`, `PageSuspense`), `components/error-boundary.tsx` (reset by address), `app/header.tsx` (`SiteHeader`,
`PausedBanner`), `components/site-footer.tsx`, `features/create/shell.tsx` (`AuthorGate`, the gate on authored work).
