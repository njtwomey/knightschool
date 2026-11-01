# catalog

The openings, variations, lines, steps and ideas available, shipped and authored, loaded once and shared.

## Holds

- the **index** of openings (id, name, side, style tags, level, ECO, Lichess link, counts, `authored`), with a status
  and error;
- **tracks**: the curriculum's order and prerequisites;
- each **opening** loaded so far: its introduction, variations in order, lines, the EPD-keyed tree with annotations,
  refutations, and its cut path of steps (by default settings; the learner's cut is the [progress](progress.md)
  store's business);
- the **tree graph** of every line, for the map; the **ideas** with what shows each; the **search index** (position to
  lines);
- the **authored build**: problems for authored items that do not fit, shown in Create.

v1's catalog store also holds the course board's place (`path`, `line`, `shownVariant`, `notice`); in v2 that moves to
the board's model ([use-board-model](../hooks/use-board-model.md)), so this store holds content only.

## Written by

Its own loaders (`loadIndex`, `loadOpening`, `loadTreeGraph`, ideas, tracks), and `reload()` after an authored change
from the [authoring](authoring.md) store.

## Read by

Nearly every page: [openings](../pages/openings.md), [opening](../pages/opening.md),
[variation](../pages/variation.md), [step](../pages/step.md), [line](../pages/line.md), [map](../pages/map.md),
[search](../pages/search.md), [ideas](../pages/ideas.md), [idea](../pages/idea.md); the [session](session.md) (queues),
[judgement](judgement.md) (the author layer), [puzzles](puzzles.md), [use-progress](../hooks/use-progress.md), and the
breadcrumb menus ([trails](../navigation/trails.md)).

## Persists

Never in the database. Shipped content is fetched JSON (`public/content/*.json`), validated at build and trusted at run
time, cached by the service worker for offline use. Authored content is built in the browser from the
[authoring](authoring.md) tables. Not exported (it is the app's, or already in the authored tables).

No stored-format change: new content files (ideas, steps, variations, puzzles) are build output, each with its schema
checked in `scripts/content.test.ts`.

## From v1

- `apps/web/src/data/catalog-store.ts` (`useCatalog`: `index`, `openings`, `prerequisites`, `content`, `reload`,
  `selectCourse`, plus the board's `path` and `line`, which move out).
- `apps/web/src/data/content.ts` (`loadShippedIndex`, `loadIndex`, `loadOpening`, `loadSearchIndex`, `loadOpenings`,
  `loadCurriculum`, `loadTreeGraph`, `loadGlossary`), `data/fetch-content.ts` (`onceRetryable`).
- `apps/web/src/data/authored-content.ts` (`loadAuthoredRows`, `loadAuthoredBuild`, `loadShippedChapters`) and
  `authored-build.ts`.
- `loadOpenings` and `content/openings.yaml` ("play it / against it" groups) are parked; repertoire slots replace them.
