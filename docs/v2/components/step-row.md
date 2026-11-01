# Step row

One step in a list: its state, its title, its moves, what opens it, and the ways into it.

## Shows

- A number in a circle (the step's place in the opening) and the title ("Bishop to c4, aiming at f7"). An untitled
  step, cut automatically, gets a headline from its first move ("When 3...Nf6 is played").
- A [state-badge](state-badge.md): locked, open, learning, known, mastered.
- Its moves as a [move-run](move-run.md): the last two moves leading in, greyed, then the step's own moves, the
  learner's in bold and ticked once known. A step with several short branches shows one run per branch.
- A count line: "4 moves of yours: 2 known, 3 in your reviews".
- Locked: "Opens when step 3 (Giuoco Piano) is known", with step 3 as a link.
- The stage reached, when started: Read, Watch, Try, Their mistakes, Done, as five small dots, the current one filled.
- Extras, muted: puzzles, traps, questions attached to this step, "not needed to know the step".
- Buttons: **Learn** (start or continue the stages) and **Try** (the Try stage alone, for review), the more useful of
  the two filled.

## Configuration

- `step`, its progress, and the step list it sits in (for "opens when" and the headline).
- `selected`, `onSelect`.
- `compact`: number, title, badge and buttons only (Today, the variation page's sidebar).
- Reads the config keys `teach.gates` (wording of the locked line), `teach.testOut` and `teach.stages` (which stage
  dots show), and the learner setting `learning.gatesRelaxed`.

## Behaviour

- Click anywhere on the row: select it; the page's board shows the stretch at its end, to step back through. The
  buttons and links in the row keep their own clicks ([sortable-table](sortable-table.md)'s row link).
- Hover a move chip: highlight on the page's board ([use-move-interaction](../hooks/use-move-interaction.md)).
- **The first step of every opening is always open.** Learn on a locked step asks once, in a small dialog: "This step
  builds on step 3. Start it anyway?", with **Start anyway**, **Go to step 3** and "Don't ask again for this opening".
  With gates off (`teach.gates`) or relaxed (`learning.gatesRelaxed`) it never asks.
- With testing out allowed, a locked row also offers **Test out** (the Try stage without Read and Watch).
- States: known and mastered rows are quieter; locked rows are slightly faded but fully readable.
- Touch: tap selects; the buttons are full-height touch targets.

## Composed of

[state-badge](state-badge.md), [move-run](move-run.md), [move-chip](move-chip.md), [kind-badge](kind-badge.md),
[puzzle-card](puzzle-card.md) (small), [idea-badge](idea-badge.md) (the step's ideas, once Done), [hint](hint.md).

## Used by

[variation-list](variation-list.md), [today](../pages/today.md) (compact, the step in progress),
[variation](../pages/variation.md), [idea](../pages/idea.md) ("steps that show it"),
[create-opening](../pages/create-opening.md) (preview).

## From v1

Repurpose. `apps/web/src/features/path/unit-row.tsx` (state, moves, what unlocks it, extras, Learn and Drill),
`stretch-moves.tsx` (the run with the learner's moves in bold), `unit-text.ts` (`headline`) and `unit-board.tsx` (the
board at the stretch's end) all carry over. New: titles, stage dots, the ask-once dialog, Test out.
