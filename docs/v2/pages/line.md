# Line

One exact line told in words: its moves with their comments, where it branches off and what grows from it, and every
opening that teaches it. For the curious who want to read a line through, and anyone arriving from the map or search.

## Address

Two addresses, one page ([../navigation/routes.md](../navigation/routes.md)):

- `/openings/<opening>/lines/<line>`: inside an opening, so the side is the opening's and the steps that teach it are
  shown. The trail sits under the opening.
- `/lines/<line>`: the line on its own (lines are shared), side from the line's `[For]`, from the map and search.

`<line>` is the v1 PGN file name. Hash: `#ply=<n>` for the board
([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

The Lines tab of [opening](opening.md); [line-row](../components/line-row.md)s on [variation](variation.md); a line's
name on the [map](map.md) and in [search](search.md); "grows from" and "branches" links on another line page.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › opening › (line, a menu of the opening's lines), or on its own
Explore › (line, a menu of the lines it branches from and that grow from it).

1. Heading: the line's name with its [kind-badge](../components/kind-badge.md) (main, sideline, rare, gambit, trap to
   spring, trap to avoid) and [opening-name](../components/opening-name.md) of the position that names it.
2. Two columns from lg:
   - Left: [line-story](../components/line-story.md): the moves with their comments as paragraphs, made of
     [move-chip](../components/move-chip.md)s, refutations folded under the move they answer; above it "branches off
     the Giuoco Piano after 4.c3", below it the lines that grow from it.
   - Right: a [board](../components/board.md) in the `study` preset on the naming position, with
     [board-controls](../components/board-controls.md), [board-notes](../components/board-notes.md),
     [board-eval](../components/board-eval.md), [board-explorer](../components/board-explorer.md) and
     [mark-key](../components/mark-key.md). At the end of the line, [eval-words](../components/eval-words.md).
3. Inside an opening: **Steps that teach it**, as [step-row](../components/step-row.md)s with their states.
4. **Other openings that teach it**: [opening-card](../components/opening-card.md)s, small.

## Behaviour

- Nothing is asked: this page only shows. The board follows the story: clicking a move goes there, hovering previews
  it ([../hooks/use-move-interaction.md](../hooks/use-move-interaction.md)); arrow keys step
  ([../navigation/shortcuts.md](../navigation/shortcuts.md)).
- A line has no progress of its own; the state shown on each move chip is the move's.
- Opening a line inside an opening it is not part of redirects to `/lines/<line>` with a
  [notice](../components/notice.md).

## Leads to

**Learn it** → the [step](step.md) that teaches its first unknown move; **Drill this line** → [drill](drill.md)
(`/practice/drill/<opening>/lines/<line>`); **Play on from the end** → [play-on](play-on.md); **See on the map** →
[map](map.md) with the line picked; **Analyse** → [analysis](analysis.md) with its moves; another line or opening.

## From v1

`features/line/about-tab.tsx` (the line in words, `namedPly`, branches, other courses) inside
`features/line/line-page.tsx`. Verdict: **keep**; the Learn, Drill, Quiz and Tree tabs go to the step, drill, review and
map pages.
