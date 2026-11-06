# Routes

Every address in v2, the page it opens, and where each v1 address now leads. This file is the authority: a page's
"Address" section repeats its own rows from here.

## The plan

Real paths as in v1 (History API, `startRouter` catches plain `<a href>` links, hosts serve `index.html` for any path).
Paths name **what** is shown; the hash holds **how** it is shown (url-state.md). No query strings. Ids are the v1 ids:
an opening's id is its v1 course id, a line's id is its v1 PGN file name (model.md, "What stays fixed"). A variation's
id is a new slug of its name, unique within its opening. Step numbers count along the opening's path, from 1.

### Arriving and Learn

| Address                                      | Page                                                                                                  | Menu    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| `/`                                          | [today](../pages/today.md), or [first-visit](../pages/first-visit.md) when there is no repertoire yet | Today   |
| `/today`                                     | [today](../pages/today.md) always (kept because v1 already parses it)                                 | Today   |
| `/welcome`                                   | [first-visit](../pages/first-visit.md) always (for a link in the README or a shared post)             | Today   |
| `/start`                                     | [onboarding](../pages/onboarding.md): three questions to a first repertoire                           | Today   |
| `/learn`                                     | redirects to `/repertoire` when there is a repertoire, else to `/openings`                            | Learn   |
| `/repertoire`                                | [repertoire](../pages/repertoire.md): what is ticked, slots, coverage, biggest gaps                   | Learn   |
| `/openings`                                  | [openings](../pages/openings.md): every opening, filtered                                             | Learn   |
| `/openings/<opening>`                        | [opening](../pages/opening.md), Overview tab: introduction, path, board                               | Learn   |
| `/openings/<opening>/lines`                  | [opening](../pages/opening.md), Lines tab: every line, openable freely                                | Learn   |
| `/openings/<opening>/map`                    | [map](../pages/map.md) drawing only that opening's lines (the opening's Map tab)                      | Learn   |
| `/openings/<opening>/lines/<line>`           | [line](../pages/line.md) inside the opening: its side, its trail, the steps that teach it             | Learn   |
| `/openings/<opening>/<variation>`            | [variation](../pages/variation.md): its steps, lines, ideas, checkpoint                               | Learn   |
| `/openings/<opening>/<variation>/checkpoint` | [checkpoint](../pages/checkpoint.md): the variation's mixed test                                      | Learn   |
| `/openings/<opening>/step/<n>`               | [step](../pages/step.md): Learn, Try, Done                                                            | Learn   |
| `/openings/<opening>/step/<n>/<a>-<b>`       | [step](../pages/step.md), only moves a to b of it (v1's "Next 3 moves")                               | Learn   |
| `/openings/<opening>/step/<n>/follow-up/<k>` | [follow-up](../pages/follow-up.md): step n's follow-up k, Show, Try, Done                             | Learn   |
| `/openings/<opening>/test`                   | [checkpoint](../pages/checkpoint.md) as the opening's final test                                      | Learn   |
| `/lines/<line>`                              | [line](../pages/line.md) on its own (lines are shared), from the map and search                       | Explore |

`step`, `lines`, `map` and `test` are reserved and can never be a variation's id, as `details`, `lines`, `path` and
`publish` are reserved among line ids in v1's Create (`isCreateTab` in `router/hrefs.ts`). There is no separate "learn
this line" page: **Learn it** on a line page leads to the step that teaches its first unknown move.

### Practice

Every mode takes the same optional **scope** after it, which starts a session at once with that source, without
changing the saved choice (practice-setup.md): nothing (the set-up card, with the saved source), `<opening>`,
`<opening>/<variation>`, or `<opening>/lines/<line>`.

| Address                           | Page                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `/practice`                       | [practice](../pages/practice.md): every mode, what is due                                 |
| `/practice/review[/<scope>]`      | [review](../pages/review.md); without a scope it is the schedule ("due"), started at once |
| `/practice/drill[/<scope>]`       | [drill](../pages/drill.md): every branch, replies as players at your band play            |
| `/practice/puzzles[/<scope>]`     | [puzzles](../pages/puzzles.md)                                                            |
| `/practice/puzzles/ideas/<idea>`  | [puzzles](../pages/puzzles.md) showing one idea, started at once                          |
| `/practice/puzzle/<puzzle>`       | one puzzle by its Lichess id, for links from Today, an idea or a step                     |
| `/practice/play-on[/<scope>]`     | [play-on](../pages/play-on.md)                                                            |
| `/practice/speed[/<scope>]`       | [speed](../pages/speed.md)                                                                |
| `/practice/speed/<opening>/rush`  | [speed](../pages/speed.md): the opening rush, each known step from the start to its end   |
| `/practice/name-it[/<scope>]`     | [name-it](../pages/name-it.md)                                                            |
| `/practice/games`                 | [your-games](../pages/your-games.md): the list                                            |
| `/practice/games/<source>/<game>` | [your-games](../pages/your-games.md): one game; `<source>` is `lichess` or `chessdotcom`  |

`ideas` is reserved after `/practice/puzzles/` and `rush` after `/practice/speed/<opening>/`, so neither can be an
opening's or a variation's id. A scoped review is free practice and never touches the schedule, as v1's line Quiz tab
and every non-due source are.

### Explore, Ideas, You, Create, other

| Address                                    | Page                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `/explore`                                 | redirects to `/explore/map`                                                             |
| `/explore/map`                             | [map](../pages/map.md): every line as one tree                                          |
| `/explore/search`                          | [search](../pages/search.md), with board search                                         |
| `/board`                                   | [board](../pages/board.md): a free board with the engine (menu: Explore › Board)        |
| `/ideas`                                   | [ideas](../pages/ideas.md)                                                              |
| `/ideas/<idea>`                            | [idea](../pages/idea.md)                                                                |
| `/you`                                     | redirects to `/you/stats`                                                               |
| `/you/stats`, `/you/settings`, `/you/data` | [stats](../pages/stats.md), [settings](../pages/settings.md), [data](../pages/data.md)  |
| `/you/settings/<group>`                    | [settings](../pages/settings.md), one group (`level`, `review`, ... ; settings.md)      |
| `/create`                                  | [create](../pages/create.md): your openings                                             |
| `/create/<opening>`                        | [create-opening](../pages/create-opening.md), Details tab                               |
| `/create/<opening>/<tab>`                  | the same, tab `lines`, `steps`, `puzzles` or `publish` (variations are edited in Steps) |
| `/create/<opening>/<line>`                 | [line-editor](../pages/line-editor.md)                                                  |
| `/contribute`                              | [contribute](../pages/contribute.md)                                                    |
| `/credits`                                 | [credits](../pages/credits.md)                                                          |
| anything else                              | [not-found](../pages/not-found.md) (v1 shows Home instead)                              |

## Where v1 addresses lead

A redirect replaces the history entry (`navigate(target, { replace: true })`), keeps the hash unless the row says
otherwise, and happens before the page loads. v1's `#/route` upgrade and `RENAMED_LINES` stay.

| v1 address                                                         | v2 address                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `/`, `/overview`, `/today`, `/profile`                             | `/` (Profile's Overview folds into Today)                                             |
| `/courses`                                                         | `/openings`                                                                           |
| `/search`, `/browse`                                               | `/explore/search` (hash kept; only `tier` dropped)                                    |
| `/openings` (a v1 alias of Search)                                 | `/openings`, the catalogue; its side filter carried over                              |
| `/course/<c>` (hash `v`, `m`)                                      | `/openings/<c>`, `m` kept (`v`, a line in v1, is dropped: v2's `v` is a variation)    |
| `/course/<c>/path`                                                 | `/openings/<c>` (the path is on the opening page)                                     |
| `/course/<c>/tree`                                                 | `/openings/<c>/map`                                                                   |
| `/play/<c>/<line>` and `/play/<c>/<line>/about`                    | `/openings/<c>/lines/<line>`                                                          |
| `/play/<c>/<line>/learn`                                           | `/openings/<c>/lines/<line>`                                                          |
| `/play/<c>/<line>/learn/<n>[/<a>-<b>]`                             | `/openings/<c>/step/<k>[/<a>-<b>]`, where `<k>` is the step holding unit `<line>:<n>` |
| `/play/<c>/<line>/drill` and `/play/<c>/<line>/practice`           | `/practice/drill/<c>/lines/<line>`                                                    |
| `/play/<c>/<line>/drill/<n>[/<a>-<b>]`                             | `/openings/<c>/step/<k>#stage=try`                                                    |
| `/play/<c>/<line>/quiz`                                            | `/practice/review/<c>/lines/<line>`                                                   |
| `/play/<c>/<line>/tree`                                            | `/openings/<c>/map#line=<line>`                                                       |
| `/play/<c>/all/branches`                                           | `/practice/drill/<c>`                                                                 |
| `/quiz`, `/review` (and `#start=due`)                              | `/practice/review` (the due session; `start` is no longer needed)                     |
| `/name`, `/name-it`, `/guess`                                      | `/practice/name-it`                                                                   |
| `/speed`                                                           | `/practice/speed`                                                                     |
| `/profile/stats`, `/stats`                                         | `/you/stats`                                                                          |
| `/profile/settings`, `/settings`                                   | `/you/settings`                                                                       |
| `/profile/author`                                                  | `/create`                                                                             |
| `/create/<c>/path`                                                 | `/create/<c>/steps`                                                                   |
| `/create/<c>`, `/create/<c>/{lines,publish}`, `/create/<c>/<line>` | unchanged                                                                             |
| `/glossary`                                                        | `/ideas`                                                                              |
| `/tree`                                                            | `/explore/map`                                                                        |
| `/lab` (hash `fen`, `m`, `c`, `side`)                              | `/board` (`fen`, `m`, `side` kept; `c` read as `ply`)                                 |
| `/credits`                                                         | unchanged                                                                             |

The two redirects from v1 units need the opening's path, so they resolve after the opening loads; until then the
step page shows its skeleton. A v1 unit the v2 path no longer cuts leads to the opening page.

v1's courses are parked (inventory.md), so an opening id from a v1 link may no longer exist in v2. Such a link shows
[not-found](../pages/not-found.md) with a search for the id's words, never an error.

## From v1

- `apps/web/src/router/route.ts`: `parseRoute`, the `Route` union, `RENAMED_LINES`; the redirect table above is a
  second function beside it, tried first.
- `apps/web/src/router/hrefs.ts`: tab lists and address builders (`courseHref`, `lineHref`, `branchesHref`,
  `createHref`, `lineEditHref`, `profileHref`, `dueQuizHref`, `parseUnitRef`); v2 keeps the rule "build every link with
  these" and renames them (`openingHref`, `stepHref`, `practiceHref(mode, scope)`, ...).
- `apps/web/src/router/location.ts`: `navigate`, `to`, `startRouter`, `usePathname`; kept as they are.
- `apps/web/src/app/routes.tsx`: the page per route and the `lazyNamed` splits; Today, Learn's pages and a line's
  page come with the app, the rest stay lazy.
- `apps/web/public/_redirects` and the `404.html` copy at build: unchanged.

## Open questions

1. Step numbers shift when an author inserts a step. Address steps by number (short, readable) or by a stable id
   such as v1's `<line>:<n>` (survives edits)? The proposal is numbers, with the redirect table catching old ones.
