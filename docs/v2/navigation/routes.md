# Routes

Every address in v2, the page it opens, and where each v1 address now leads.

## The plan

Real paths as in v1 (History API, `startRouter` catches plain `<a href>` links, hosts serve `index.html` for any path).
Paths name **what** is shown; the hash holds **how** it is shown (url-state.md). No query strings. Ids are the v1 ids:
an opening's id is its v1 course id, a line's id is its v1 PGN file name (model.md, "What stays fixed"). A variation's
id is a new slug of its name, unique within its opening. Step numbers count along the opening's path, from 1.

### Arriving and Learn

| Address                                      | Page                                                                                                  | Menu                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `/`                                          | [today](../pages/today.md), or [first-visit](../pages/first-visit.md) when there is no repertoire yet | Today                                |
| `/today`                                     | the same as `/` (kept because v1 already parses it)                                                   | Today                                |
| `/start`                                     | [onboarding](../pages/onboarding.md): three questions to a first repertoire                           | Today                                |
| `/repertoire`                                | [repertoire](../pages/repertoire.md): slots, coverage, biggest gaps                                   | Learn                                |
| `/openings`                                  | [openings](../pages/openings.md): every opening, filtered                                             | Learn                                |
| `/openings/<opening>`                        | [opening](../pages/opening.md): introduction, path, lines, board                                      | Learn                                |
| `/openings/<opening>/<variation>`            | [variation](../pages/variation.md): its steps, lines, ideas, checkpoint                               | Learn                                |
| `/openings/<opening>/<variation>/checkpoint` | [checkpoint](../pages/checkpoint.md): the variation's mixed test                                      | Learn                                |
| `/openings/<opening>/step/<n>`               | [step](../pages/step.md): Read, Watch, Try, Their mistakes, Done                                      | Learn                                |
| `/openings/<opening>/lines/<line>`           | [step](../pages/step.md) run over one whole line (Watch and Try), outside the path                    | Learn                                |
| `/openings/<opening>/test`                   | [checkpoint](../pages/checkpoint.md) as the opening's final test                                      | Learn                                |
| `/lines/<line>`                              | [line](../pages/line.md): the line in words; shared, so no opening in the path                        | Learn or Explore (url-state.md, `o`) |

`step`, `lines` and `test` are reserved and can never be a variation's id, as `details`, `lines`, `path` and `publish`
are reserved among line ids in v1's Create (`isCreateTab` in `router/hrefs.ts`).

### Practice

Every mode takes the same optional **scope** after it, which picks the source of the set-up card for this session
(practice-setup.md) without changing the saved choice: nothing (the saved source), `<opening>`,
`<opening>/<variation>`, or `<opening>/lines/<line>`.

| Address                        | Page                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `/practice`                    | [practice](../pages/practice.md): every mode, what is due                      |
| `/practice/review[/<scope>]`   | [review](../pages/review.md); without a scope it is the schedule ("due")       |
| `/practice/drill[/<scope>]`    | [drill](../pages/drill.md): every branch, replies as players at your band play |
| `/practice/puzzles[/<scope>]`  | [puzzles](../pages/puzzles.md)                                                 |
| `/practice/puzzles/p/<puzzle>` | one puzzle by its Lichess id, for links from an idea or a step                 |
| `/practice/play-on[/<scope>]`  | [play-on](../pages/play-on.md)                                                 |
| `/practice/speed[/<scope>]`    | [speed](../pages/speed.md)                                                     |
| `/practice/name-it[/<scope>]`  | [name-it](../pages/name-it.md)                                                 |
| `/practice/games`              | [your-games](../pages/your-games.md)                                           |

A scoped review is free practice and never touches the schedule, as v1's line Quiz tab and every non-due source are.

### Explore, Ideas, You, Create, other

| Address                                    | Page                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `/explore`                                 | redirects to `/explore/map`                                                            |
| `/explore/map`                             | [map](../pages/map.md): every line as one tree                                         |
| `/explore/map/<opening>`                   | [map](../pages/map.md) drawing only that opening's lines                               |
| `/explore/search`                          | [search](../pages/search.md), with board search                                        |
| `/explore/analysis`                        | [analysis](../pages/analysis.md): a free board, engine and explorer                    |
| `/ideas`                                   | [ideas](../pages/ideas.md)                                                             |
| `/ideas/<idea>`                            | [idea](../pages/idea.md)                                                               |
| `/you`                                     | redirects to `/you/stats`                                                              |
| `/you/stats`, `/you/settings`, `/you/data` | [stats](../pages/stats.md), [settings](../pages/settings.md), [data](../pages/data.md) |
| `/create`                                  | [create](../pages/create.md): your openings                                            |
| `/create/<opening>`                        | [create-opening](../pages/create-opening.md), Details tab                              |
| `/create/<opening>/<tab>`                  | the same, tab `variations`, `lines`, `steps`, `puzzles` or `publish`                   |
| `/create/<opening>/<line>`                 | [line-editor](../pages/line-editor.md)                                                 |
| `/credits`                                 | [credits](../pages/credits.md)                                                         |
| anything else                              | [not-found](../pages/not-found.md) (v1 shows Home instead)                             |

## Where v1 addresses lead

A redirect replaces the history entry (`navigate(target, { replace: true })`), keeps the hash unless the row says
otherwise, and happens before the page loads. v1's `#/route` upgrade and `RENAMED_LINES` stay.

| v1 address                                                         | v2 address                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `/`, `/overview`, `/today`, `/profile`                             | `/` (Profile's Overview folds into Today)                                   |
| `/courses`                                                         | `/openings`                                                                 |
| `/search`, `/browse`                                               | `/explore/search` (hash kept; `role` and `tier` dropped)                    |
| `/openings` (a v1 alias of Search)                                 | `/openings`, the catalogue; a v1 hash on it is ignored                      |
| `/course/<c>` (hash `v`, `m`)                                      | `/openings/<c>`, hash `v` read as `l`                                       |
| `/course/<c>/path`                                                 | `/openings/<c>` (the path is on the opening page)                           |
| `/course/<c>/tree`                                                 | `/explore/map/<c>`                                                          |
| `/play/<c>/<line>` and `/play/<c>/<line>/about`                    | `/lines/<line>#o=<c>`                                                       |
| `/play/<c>/<line>/learn`                                           | `/openings/<c>/lines/<line>` (hash `m` kept)                                |
| `/play/<c>/<line>/learn/<n>[/<a>-<b>]`                             | `/openings/<c>/step/<k>`, where `<k>` is the step holding unit `<line>:<n>` |
| `/play/<c>/<line>/drill` and `/practice`                           | `/practice/drill/<c>/lines/<line>`                                          |
| `/play/<c>/<line>/drill/<n>[/<a>-<b>]`                             | `/openings/<c>/step/<k>#s=try`                                              |
| `/play/<c>/<line>/quiz`                                            | `/practice/review/<c>/lines/<line>`                                         |
| `/play/<c>/<line>/tree`                                            | `/explore/map/<c>#l=<line>`                                                 |
| `/play/<c>/all/branches`                                           | `/practice/drill/<c>`                                                       |
| `/quiz`, `/review` (and `#start=due`)                              | `/practice/review` (hash kept)                                              |
| `/name`, `/name-it`, `/guess`                                      | `/practice/name-it`                                                         |
| `/speed`                                                           | `/practice/speed`                                                           |
| `/profile/stats`, `/stats`                                         | `/you/stats`                                                                |
| `/profile/settings`, `/settings`                                   | `/you/settings`                                                             |
| `/profile/author`                                                  | `/create`                                                                   |
| `/create/<c>/path`                                                 | `/create/<c>/steps`                                                         |
| `/create/<c>`, `/create/<c>/{lines,publish}`, `/create/<c>/<line>` | unchanged                                                                   |
| `/glossary`                                                        | `/ideas`                                                                    |
| `/tree`                                                            | `/explore/map`                                                              |
| `/lab` (hash `fen`, `m`, `c`, `side`)                              | `/explore/analysis`, hash unchanged                                         |
| `/credits`                                                         | unchanged                                                                   |

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
2. Should `/lines/<line>` live under Explore or Learn? The proposal: the page belongs to whichever its `o` hash says.
3. Is `/openings/<opening>/lines/<line>` (learning a line outside the path) wanted, or does "learn this line" always
   lead to the first step that teaches it?
