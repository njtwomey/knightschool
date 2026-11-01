# Menu

The header on every page: six items by what you came to do, your coverage and streak, and You at the right; on a
phone, a bottom bar.

## The plan

| Item         | Address        | Holds (sub-menu on hover or tap)                                                 | Pages that mark it                                                                 |
| ------------ | -------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Today**    | `/`            | none                                                                             | today, first-visit, onboarding                                                     |
| **Learn**    | `/repertoire`  | Your repertoire, All openings, Tracks                                            | repertoire, openings, opening, variation, step, checkpoint, line (with an opening) |
| **Practice** | `/practice`    | Review (with the due count), Drill, Puzzles, Play on, Speed, Name it, Your games | practice and every mode                                                            |
| **Explore**  | `/explore/map` | Map, Search, Analysis                                                            | map, search, analysis, line (without an opening)                                   |
| **Ideas**    | `/ideas`       | none                                                                             | ideas, idea                                                                        |
| **Create**   | `/create`      | none                                                                             | create, create-opening, line-editor                                                |

Learn's own address is `/repertoire` when the learner has one and `/openings` when not, so the first click always
lands somewhere useful. Credits and not-found mark no item.

**On the right**, in this order: the [coverage-meter](../components/coverage-meter.md) in its small form (the share of
games at your band that stay inside what you know by move 10, White and Black), the [streak](../components/streak.md),
then **You** (a person icon) opening a menu of Stats, Settings, Data and the theme toggle. Coverage and streak are
links: coverage to `/repertoire`, the streak to `/you/stats#tab=activity`. Both hide until the database is open and
a repertoire exists, so a first visit sees only the menu and You.

**Groups.** A thin divider separates Today | Learn, Practice | Explore, Ideas | Create: do, then look, then write.
Sub-menus are shadcn `NavigationMenu` on a wide screen (not in `components/ui` yet); each item is still a plain
link, so a click on the label goes to its address and the sub-menu is only a shortcut.

**Phone.** Below `md` the header keeps the name, coverage and You; the items move to a **bottom bar** of four:
Today, Learn, Practice, Explore, each an icon over its label. A fifth button, More, opens a sheet with Ideas, Create
and Credits. The bar hides while a board is in a test (the board needs the height) and on a phone held sideways, as
the header already scrolls away there (`short:` variant). Due reviews show as a count on Practice.

**Marking where you are.** One function from route to item (v1's `headerItemOf`) decides it; `aria-current="page"`
on the item, `secondary` button style. A line page reached from an opening marks Learn, from the map Explore
(routes.md).

## From v1

- `apps/web/src/app/header.tsx`: the header, the phone sheet (`Sheet`, below `md`), the Profile dropdown, the theme
  toggle, groups with dividers. Repurposed: the eight links become six items; the sheet becomes the bottom bar and More.
- `apps/web/src/router/menu.ts`: `HeaderItem` and `headerItemOf`, one table from page to item; kept, with v2's items.
- v1's menu order (Courses, Search, Tree | Quiz, Speed, Name it | Create | Glossary) maps as Courses to Learn; Search
  and Tree to Explore; Quiz, Speed, Name it to Practice; Glossary to Ideas; Profile to You.

## Open questions

1. Should Ideas sit in the phone's bottom bar instead of Explore? It is fewer clicks for the curious learner
   (experience.md, who comes, 3) but Explore holds the map, which every learner uses.
2. Coverage in the header needs the explorer counts for the learner's openings at start-up; if that is slow on first
   open, show the streak alone until it is ready.
