# Map tree

The tree of lines drawn as lanes of move pills, which doubles as the learner's progress view: every move coloured by
what they know, the gaps in their repertoire, and the opponent's common mistakes.

## Shows

**The drawing.** Like a git history turned on its side: one column per move, so a move number lines up down every
line, and one lane per line. The main line runs straight across the top; branches curve down out of the move they
follow, the latest branch nearest, so no lines cross. Move numbers stay along the top while the drawing scrolls.

- **Move pills.** Each move is a [move-chip](move-chip.md) drawn as a pill. The first pill stands for the moves every
  line shares (the opening's trigger). The learner's moves are bold; the opponent's are regular.
- **Line names** in the line's lane colour, just left of where each line starts.
- **Folded lines**: a "+N" after a line's last move when its branches are folded away from the
  [map-index](map-index.md).

**Overlays**, each switchable, drawn over the same pills:

- **Lines**: each pill in its line's lane colour (v1's look).
- **Progress**: each learner move filled by its state, open (not yet seen), learning, known or mastered (the
  [state-badge](state-badge.md) dot colours); opponent moves outlined in the colour of the learner's answer that
  follows.
- **Gaps**: short dashed stubs off an opponent's turn for replies players at the band make that no line answers, each
  labelled with its share ("c6, 12%"), thicker for more games.
- **Their mistakes**: a small marker on opponent moves that are common mistakes ("?" in the verdict colour), with how
  often they are played and whether the learner has practised the punishment.
- **Coverage**: lanes drawn thicker where more games at the band reach them, so the well-trodden paths stand out.
- **Puzzles**: a small puzzle mark on positions with matched puzzles, with the count.
- **Your games** (later, features.md Z3): the moves from the learner's own Lichess and Chess.com games beside the lines.

Progress and Gaps are on by default on the learner's map; the theory-tree view (an opening's Tree tab, the line page)
starts on Lines.

## Configuration

- `tree`, `lines` (which lines and in what order: one line, a variation, an opening, a side of the repertoire, or every
  line).
- `overlays`: which are available and which are on.
- `lit`: lines picked out (the rest dim); `focus`: the move shown on the board; `subtree`: draw only what grows from
  one line.
- `zoom`: where it starts (fit to the box by default).
- Reads `level.band` and `level.coverageTarget` (which replies are gaps), `level.includeRare` (rare lines shown or
  greyed), `board.notation` (pill text) and `access.reducedMotion` (no smooth scroll or zoom).

## Behaviour

- **Only a click changes anything.** Hover a pill: its squares highlight on the board and a
  [position-preview](position-preview.md) appears if there is no board in view; the pill's hint gives the move, its
  state and its share. Hover never re-centres or re-picks.
- **Click a pill**: picks its line and shows that position on the board with its comment, verdict and explorer
  numbers; the side panel offers **Learn**, **Try** and **Review** for the step through it, and **Open line**.
- **Click a gap stub**: the board shows the position after the unanswered reply, with the explorer's moves for the
  learner, and the [gap-link](gap-link.md)'s action (the step that answers it, or an opening that does).
- **Click a mistake marker**: the board shows the mistake and the punishment, with **Practise the punishment** (the
  step's Their mistakes stage).
- **Click a line's name, or the crosshair in the index**: draw only that line's subtree.
- **Zoom**: the buttons in the corner (in, out, fit), a pinch, or Ctrl or Cmd with the wheel, around the point under
  the pointer; a plain wheel scrolls. Zoom is kept in the address hash so a shared map opens the same.
- **Keys**, when the map has focus: Left and Right along the picked line, Up and Down to the neighbouring lane at the
  same move, Home and End to the line's start and end, + and - to zoom, F to fit
  ([use-shortcuts](../hooks/use-shortcuts.md); the board's arrow keys and the map's never both own Left and Right).
- **Touch**: tap picks; long-press shows the hint; one finger pans, two pinch.
- **States**: loading draws a skeleton of three lanes; an opening with one line draws one lane; positions with no
  popularity data show no gap stubs and the legend says "No data here yet".
- Every move on the map is the same move chip as everywhere else, so the same hover, focus and click rules apply
  ([interactions](../patterns/interactions.md)).

## Composed of

[move-chip](move-chip.md), [state-badge](state-badge.md) (dot colours), [verdict-badge](verdict-badge.md) (mistake
markers), [position-preview](position-preview.md), [hint](hint.md), [map-legend](map-legend.md) (in a corner, or
beside it), [icon-action](icon-action.md) (zoom buttons).

## Used by

[map](../pages/map.md) (every line, the learner's progress view), [opening](../pages/opening.md) (its tree, one
opening), [variation](../pages/variation.md), [line](../pages/line.md) (one line and what grows from it),
[repertoire](../pages/repertoire.md) (one side, with gaps). Always with a [board](board.md) in the `study` preset and
the [map-index](map-index.md).

## From v1

Repurpose. `apps/web/src/features/tree/lane-tree.tsx` (`LaneTree`: columns per move, lanes per line, pills, line
names, folded "+N", zoom buttons, pinch and Ctrl-wheel), laid out by `laneLayout` in
`packages/core/src/navigation/lane-layout.ts` over the prefix-keyed nodes of
`packages/core/src/navigation/move-tree.ts`; lane colours from `apps/web/src/features/tree/colours.ts`; the
three-column page in `tree-explorer.tsx` with `tree-board.tsx` and `use-move-comment.ts`. v2 keeps the layout and adds
the overlays, the side panel's actions and the keys.

## Open questions

- How gap stubs are placed in the lane layout: as zero-width extra lanes under the opponent's move, or as short marks
  off the pill that do not take a lane. The second keeps the layout unchanged.
- Whether Progress should colour transposed moves (same position reached in another line) as known: positions are keyed
  by EPD, so yes is consistent with the rest of the site.
