# Line

One exact line, taught through the same Learn flow as a step ([step.md](step.md#the-learn-flow)): Learn (the line
told in words beside the board), Try (the learner plays their moves of it), Done. For the curious who want to read a
line through, anyone arriving from the Lines tab, the map or search, and a trap or danger line worth knowing on its
own.

## Address

Two addresses, one page ([../navigation/routes.md](../navigation/routes.md)):

- `/openings/<opening>/lines/<line>`: inside an opening, so the side is the opening's and the steps that teach it are
  shown. The trail sits under the opening.
- `/lines/<line>`: the line on its own (lines are shared), side from the line's `[For]`, from the map and search.

`<line>` is the v1 PGN file name. Hash: `#stage=learn|try|done&m=…`, as a step's
([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

The Lines tab of [opening](opening.md); [line-row](../components/line-row.md)s on [variation](variation.md); a line's
name on the [map](map.md) and in [search](search.md); "grows from" and "branches" links on another line page.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › Opening ▾ › Line ▾ (lines of the opening), or on its own
Explore › (line, a menu of the lines it branches from and that grow from it).

1. Heading: the line's name with its [kind-badge](../components/kind-badge.md) (main, sideline, rare, gambit, trap to
   spring, trap to avoid), then the stages as tabs.
2. **Learn**: the [line-story](../components/line-story.md) beside a [board](../components/board.md) in `learn`: the
   introduction (how many of the learner's moves, and whether the line is drilled), "branches off the Giuoco Piano
   after 4.c3", the moves from the branch with every note, refutations folded under the move they follow, where it ends
   ([eval-words](../components/eval-words.md) and the variation's plan), and the lines that grow from it. **Try it**.
3. **Try**: the learner's moves from the branch, the other side playing the line's replies. A line that earns cards
   (core `lineEarnsCards`) saves them; an alternative or rare line saves nothing and says so.
4. **Done**: [session-summary](../components/session-summary.md), the moves not yet known, **Try again**, **Drill the
   variation**, **Play on from the end**, **Learn it again**, **Back to the opening**.
5. Inside an opening, under every stage: **Steps that teach it**, as [step-row](../components/step-row.md)s with their
   states.

## Behaviour

- A line has no state of its own: Done's "known" is every one of the learner's moves in it known.
- The board follows the story and the story the board, as in every Learn stage
  ([line-story](../components/line-story.md)).
- Opening a line inside an opening it is not part of redirects to `/lines/<line>` with a
  [notice](../components/notice.md).

**Built so far** (features/learn/line-page.tsx): `/openings/<opening>/lines/<line>` only. Not yet: `/lines/<line>`, the
explorer, other openings that teach it, a per-line Drill address.

## Leads to

A step row → the [step](step.md) that teaches it; **Drill this line** → [drill](drill.md)
(`/practice/drill/<opening>/lines/<line>`); **Play on from the end** → [play-on](play-on.md); **See on the map** →
[map](map.md) with the line picked; **Open on the board** → [board](board.md) with its moves; another line or opening.

## From v1

`features/line/about-tab.tsx` (the line in words, `namedPly`, branches, other courses) inside
`features/line/line-page.tsx`. Verdict: **keep**; the Learn, Drill, Quiz and Tree tabs go to the step, drill, review and
map pages.
