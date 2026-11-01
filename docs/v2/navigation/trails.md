# Trails

The breadcrumb trail at the top of every page: a root, crumbs that are menus of their siblings, then the page's tabs and
anything trailing, in one shape everywhere.

## The plan

One component, [breadcrumbs](../components/breadcrumbs.md), v1's `TrailCrumbs` shape kept: the **root** is the menu item
the page belongs to; each **crumb** links back to its page and, where it has siblings, opens a menu of them with the
current one ticked (move sideways without going back); **tabs** sit at the end as a joined button group; **trailing**
holds previous and next or one action. Crumbs marked ▾ below are menus.

| Page                                                                                   | Trail                                                                            | Tabs or trailing                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [today](../pages/today.md), [first-visit](../pages/first-visit.md)                     | none                                                                             |                                                             |
| [onboarding](../pages/onboarding.md)                                                   | none; its own "question 2 of 3"                                                  |                                                             |
| [repertoire](../pages/repertoire.md)                                                   | Learn › Repertoire, with **All openings** beside it                              |                                                             |
| [openings](../pages/openings.md)                                                       | Learn ▾ (Your repertoire, All openings, Tracks)                                  |                                                             |
| [opening](../pages/opening.md)                                                         | Learn › Opening ▾ (your repertoire first, then all, grouped by side)             | tabs Overview, Lines, Map                                   |
| [variation](../pages/variation.md)                                                     | Learn › Opening ▾ › Variation ▾                                                  | trailing: previous, next variation                          |
| [step](../pages/step.md)                                                               | Learn › Opening ▾ › Variation ▾ › Step n ▾ (steps of the variation)              | tabs: the five stages; trailing: previous, next step        |
| [checkpoint](../pages/checkpoint.md)                                                   | Learn › Opening ▾ › Variation ▾ › Checkpoint                                     |                                                             |
| final test                                                                             | Learn › Opening ▾ › Final test                                                   |                                                             |
| [line](../pages/line.md) inside an opening (`/openings/<o>/lines/<l>`)                 | Learn › Opening ▾ › Line ▾ (lines of the opening)                                | trailing: Learn it, Drill this line                         |
| [line](../pages/line.md) on its own (`/lines/<l>`)                                     | Explore › Line ▾ (the lines it branches from and that grow from it)              | trailing: the openings that teach it ▾                      |
| [map](../pages/map.md) of one opening (`/openings/<o>/map`)                            | Learn › Opening ▾                                                                | tabs Overview, Lines, Map                                   |
| [practice](../pages/practice.md)                                                       | Practice                                                                         | the modes as tabs                                           |
| a mode                                                                                 | Practice › Mode ▾ (every mode) › scope crumbs: Opening ▾ › Variation ▾ or Line ▾ | trailing: Change (the set-up card)                          |
| one puzzle                                                                             | Practice › Puzzles › the puzzle's id and rating                                  | trailing: Lichess link                                      |
| one of your games                                                                      | Practice › Your games › the game (date, opponent)                                | trailing: the game on its site                              |
| [map](../pages/map.md), [search](../pages/search.md), [board](../pages/board.md)       | Explore                                                                          | tabs Map, Search, Board                                     |
| [ideas](../pages/ideas.md)                                                             | Ideas                                                                            |                                                             |
| [idea](../pages/idea.md)                                                               | Ideas › Idea ▾ (ideas of the same kind)                                          |                                                             |
| [stats](../pages/stats.md), [settings](../pages/settings.md), [data](../pages/data.md) | You                                                                              | tabs Stats, Settings, Data (replace history, as v1 Profile) |
| [create](../pages/create.md)                                                           | Create                                                                           |                                                             |
| [create-opening](../pages/create-opening.md)                                           | Create › Opening ▾ (your openings)                                               | tabs Details, Lines, Steps, Puzzles, Publish                |
| [line-editor](../pages/line-editor.md)                                                 | Create › Opening ▾ › Line ▾                                                      | trailing: previous, next line                               |
| [credits](../pages/credits.md), [not-found](../pages/not-found.md)                     | none                                                                             |                                                             |

**Rules.** A crumb menu with one item is a plain link. A crumb's label is the short name (an opening's name without "as
White"; "Step 3" with the step's title in the menu). States show in menus: a step or variation menu carries each item's
[state-badge](../components/state-badge.md), and locked items are listed but say what opens them. On a phone the trail
keeps the last crumb and the tabs; earlier crumbs fold into one "..." menu. Tabs that change only the view (You, an
opening's Overview, Lines and Map) replace the history entry; tabs that are a different task (stages, Create) push.

## From v1

- `apps/web/src/components/breadcrumbs/trail-crumbs.tsx`: `TrailCrumbs`, `Crumb` (`label`, `href`, `menu`), `CrumbTabs`
  (`replace` for Profile). Kept.
- `apps/web/src/components/breadcrumbs/crumb-menu.tsx` (`CrumbMenu`, ticked, opens scrolled to the current item) and
  `tab-group.tsx` (`TabGroup`). Kept.
- `apps/web/src/components/breadcrumbs/course-breadcrumbs.tsx` and `use-course-items.ts`: the course and line menus;
  become the opening, variation, step and line menus.
- v1's `PlayBreadcrumbs` (named in CLAUDE.md) and Create's `features/create/crumbs.tsx` are built on the same shape.
- Tab lists in `apps/web/src/router/hrefs.ts` (`COURSE_TABS`, `LINE_TABS`, `CREATE_TABS`, `PROFILE_TABS`): v1's line
  tabs (About, Learn, Drill, Quiz, Tree) go: About is the line page, Learn it and Drill are its trailing actions, Quiz
  is a scoped review, Tree is the opening's Map tab.

## Open questions

1. Should the step's stages be tabs at all, given Try is gated on Watch? The proposal: tabs, with later stages disabled
   until reached, so a learner returning to a step can jump back to Read.
