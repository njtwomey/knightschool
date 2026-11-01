# Gap link

The most common reply the learner's repertoire does not answer yet, with a way straight to learning it: "go to your
biggest gap".

## Shows

- One line: "Your biggest gap: **1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6**, about 1 game in 6 at your level." The moves are a
  [move-run](move-run.md), the final reply (the gap) emphasised.
- A [board-thumb](board-thumb.md) of the position after the reply, on wider screens.
- What fills it: "Your Italian Game answers this in step 9 (Two Knights Defence)" for a reply the learner's opening
  covers but they have not learned; "The Caro-Kann answers 1...c6: add it to your repertoire" for a reply none of their
  openings covers; "No opening here answers this yet" when the catalogue has nothing.
- The action: **Learn it** (the step that answers it), or **Add an opening** (opens the slot picker), or **See it on
  the map** when nothing answers it.
- In `list` form, the top three to five gaps as rows, each with its share.

## Configuration

- `side`: a slot or the whole repertoire.
- `form`: `one` (Today, under the coverage meter) or `list` (the repertoire page).
- `kind`: `unanswered` (the reply is not covered by any opening the learner has) or `unlearned` (covered by their
  opening but not yet learned). Today shows whichever matters more by games.
- Reads `level.band`, `level.coverageTarget` (replies under it are never gaps) and `level.includeRare`.

## Behaviour

- Click **Learn it**: the step page for the step that answers the gap, even when that step is later on the path (it
  asks once, as [step-row](step-row.md) does).
- Hover a move chip: [position-preview](position-preview.md).
- Hover the share: "In the Lichess explorer, games at 1000 to 1600 in blitz and rapid" ([hint](hint.md)).
- Nothing left above the target: "No gaps above 1 game in 20. Lower the target in Settings to look deeper", with the
  setting offered inline ([setting-inline](setting-inline.md)).
- Recomputed when progress changes, never during a session.

## Composed of

[move-run](move-run.md), [move-chip](move-chip.md), [board-thumb](board-thumb.md), [opening-name](opening-name.md),
[position-preview](position-preview.md), [hint](hint.md), [setting-inline](setting-inline.md).

## Used by

[today](../pages/today.md), [repertoire](../pages/repertoire.md), [coverage-meter](coverage-meter.md) (beside it),
[opening](../pages/opening.md) (its own gaps), [map](../pages/map.md) (the gap overlay's list).

## From v1

New, over repurposed logic. `scripts/gaps.ts` ranks unanswered replies per side by explorer games and names the courses
whose lines reach the position; that ranking moves into core so the app can ask it for one learner. Chessbook's "go to
your biggest gap", in the survey.
