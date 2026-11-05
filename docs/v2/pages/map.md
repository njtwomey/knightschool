# Map

Every line as one tree, coloured by what the learner knows, with the gaps in their repertoire and the opponent's
common mistakes drawn on it. For seeing the whole ground at once and going straight to any part of it.

## Address

`/explore/map` (every line), `/openings/<opening>/map` (one opening, its Map tab). Hash:
`#line=<line>&m=<uci.uci...>&focus=<move prefix>&layers=gaps,mistakes&zoom=<n>`: the picked line, the board's
move, the subtree drawn alone, the overlays shown, the zoom ([../navigation/url-state.md](../navigation/url-state.md)).
v1's `/tree` and `/course/<id>/tree` land here.

## Reached from

**Explore** in the menu ([../navigation/menu.md](../navigation/menu.md)); the Map tab of [opening](opening.md); a
[gap-link](../components/gap-link.md) on [Today](today.md), [repertoire](repertoire.md) or [your games](your-games.md);
**See on the map** on [line](line.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Explore › Map, or Openings › opening › Map.

A computer page: the whole screen under the header, edge to edge, each column scrolling on its own
([FullPage](../patterns/layout.md)). There is no phone layout.

1. Left: Main lines or All, the opening's ideas (a click goes to the first move showing it), and
   [map-index](../components/map-index.md): the variations as headings, each with its colour and its number of lines,
   with its main lines under it. A heading opens the rest of its lines, in the index and on the map; a search finds any
   line.
2. Middle: [map-tree](../components/map-tree.md), the full height: one column per move, one compact lane per line, the
   main line across the top. The selected move is solid in its line's colour. A line's name sits just left of its first own move, in its colour, so a name never adds a
   row. A line takes its variation's colour, the same as its dot in the index. Pills show the band's share on the reply that starts a branch, the author's marks (!!, !, !?, ?!, ?, ??), and the
   opponent's common mistakes and blunders as a badge on the move before them.
3. Right: a [board](../components/board.md) along the picked line with the arrow keys, then the move's description (its
   comment, the mistake that follows it, what is not covered), **Learn**, **Review**, **Open line**, then
   [map-legend](../components/map-legend.md).

Main lines by default: lines of kind main and each variation's first line, plus whatever the picked line grows from.
Replies nothing answers (gaps) are in a pill's hover and the description; the Gaps switch draws them as stubs.

Marks sit inside the pills, the classic symbols in their grades' colours: the author's where written, else the engine's:
`?!`, `?`, `??` on the opponent's moves by what they cost against the best move (a learner's own move is what the opening
teaches, so it is never marked down), and `!` on any move that is the only good one (the engine's first choice with its
second a mistake or worse). Each follow-up is drawn as its own short branch off its line: the mistake with its mark and
how often it is played, then the punishment, with its notes; **Learn** opens the follow-up. The Mistakes and marks
switch hides both.

## Behaviour

- Only a click changes anything; hovering a pill previews its position
  ([../hooks/use-move-interaction.md](../hooks/use-move-interaction.md)). A click on a pill picks its line and moves the
  board there; a click on a line's name, here or in the index, picks the line and brings the map to it (also
  `#line=<id>` from **See it on the map** on a line's page); the crosshair draws only that subtree. Arrow
  keys step along the picked line ([../navigation/shortcuts.md](../navigation/shortcuts.md)).
- The map shows lines, not progress: that is on the opening page. Gaps come from the shipped popularity at
  the learner's band, against the repertoire (not every line on the site: a gap is a hole in what _you_ answer).
- Clicking a gap stub shows the position with "played in 7% of games; nothing in your repertoire answers it", and
  **Find an opening that does** when another opening covers it.

## Leads to

**Learn** → the [step](step.md) teaching that move; **Try** → [drill](drill.md) of the line; **Review** →
[review](review.md) scoped to the line; a line's name → [line](line.md); a gap → [search](search.md) or
[opening](opening.md) for an opening that answers it.

## From v1

`features/tree` (`tree-explorer.tsx`, `lane-tree.tsx`, `tree-index.tsx`, `index-model.ts`, `tree-board.tsx`,
`course-tree-page.tsx`, `curriculum-tree-page.tsx`). Verdict: **repurpose**: the layout stays; progress, gaps and
mistakes are new overlays.
