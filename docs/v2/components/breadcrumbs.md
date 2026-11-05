# Breadcrumbs

The trail at the top of a page: a root, the crumbs down to this page (each a menu of its siblings), the page's tabs, and
anything that belongs at the end, such as previous and next. One shape on every page; the trails of each page are listed
in [navigation/trails.md](../navigation/trails.md).

## Shows

- **Root**: the menu item the page belongs to (Learn, Practice, Explore, Ideas, Create, or You), as a link.
- **Crumbs**, for example on a step: Openings › Italian Game (White) › Giuoco Piano › When Black pins with ...Bg4, and on a
  follow-up … › When Black pins with ...Bg4 › If 7...h5 is played. A crumb with siblings is a menu: "Giuoco Piano" opens every variation of the opening, the current one ticked, each with its
  [state-badge](state-badge.md). A crumb without siblings is a plain link.
- **The current page** last, not a link.
- **Tabs** at the end, as a joined button group: an opening's Overview, Steps, Lines, Map; a line's About, Learn, Drill,
  Map. The chosen tab is marked from `aria-checked`, not `data-state` (see [hint](hint.md)).
- **Trailing**: previous and next (step, line), each an [icon-action](icon-action.md) with the neighbour's name as its
  label.

## Configuration

- `root`, `crumbs` (each: name, address, optional siblings), `tabs` (the choices, the chosen one, the address of each),
  `trailing`.
- Built from the address helpers ([navigation/routes.md](../navigation/routes.md)); never a hand-written link.

## Behaviour

- The trail floats: it sits in a bar under the header that stays on top as the page scrolls, so the tabs and menus are
  always in reach (`TrailSlot`). The map's full-page template keeps it in the page instead.

- Clicking anywhere on a crumb that has a menu opens the menu (its own page is the ticked item there); a crumb with no
  menu is a plain link. Crumbs and menu items are named by title alone ("The quiet bishop", "If 4...h6 is played"):
  no "Step 1" or "1a". One line per menu item: the tick for the current one, the title, one state mark on the right.
  Menus are long lists: they open scrolled to the current item and take type-ahead.
- Every crumb and tab is a real link: middle-click and "open in new tab" work.
- **During a test** the trail never names what is being asked: in Name it the crumb says "Position 4 of 10", not the
  opening; in a review the line's name appears only once answered ([reveal](../patterns/reveal.md)).
- **On a phone** the trail shrinks to the last crumb with a back arrow before it; the back arrow's menu lists the crumbs
  above. Tabs drop below the trail as a full-width group.
- Locked items in a menu show their lock on the right, once; what opens them is the hover text, not a sentence. By default they are not links; an item marked
  `opens` still opens, and one with `onSelect` runs that instead of following its link (the Learn trail's locked steps
  ask once per opening, with the step rows' `StartAnywayDialog`). An `indent` item sits in a little under the one
  before (a step's follow-ups under it).

## Composed of

[state-badge](state-badge.md), [icon-action](icon-action.md), [hint](hint.md), shadcn `Breadcrumb`, `DropdownMenu`,
`ToggleGroup`.

## Used by

[page-shell](page-shell.md); every page under [pages](../pages/README.md) except Today and the first visit.

## From v1

Keep. `components/breadcrumbs/trail-crumbs.tsx` (`TrailCrumbs`: root, crumbs with menus, tabs, trailing),
`crumb-menu.tsx` (`CrumbMenu`), `tab-group.tsx` (`TabGroup`), `use-course-items.ts`, and the per-section trails built on
them (`course-breadcrumbs.tsx`, `features/create/crumbs.tsx`, `features/profile/profile-page.tsx`). Renamed crumbs only:
course to opening, section to variation, unit to step.
