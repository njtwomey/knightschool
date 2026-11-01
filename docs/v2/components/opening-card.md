# Opening card

An opening in a list: what it is, who it suits, and how far the learner has got with it.

## Shows

- A [board-thumb](board-thumb.md) of the position the opening is named after, oriented for the side it is for.
- The [opening-name](opening-name.md) with its ECO code, and the side ("As White", "Against 1.e4").
- One line from its introduction (`about.suits`: "Solid and simple, with few forced lines").
- **Style tags** as small badges: solid, attacking, gambit, trap-heavy (one or two per opening).
- Level: for beginners, for improvers.
- Once started: [mode-counts](mode-counts.md) ("Learn 12/40, Review 6 due, Puzzles 3/15") and a
  [progress-ring](progress-ring.md). Not started: its size instead ("6 variations, 28 steps, about 3 hours").
- A marker when it is in the repertoire ("In your repertoire, against 1.e4").

## Configuration

- `size`: `full` (Openings page, onboarding suggestions) or `small` (pickers, search results: thumb, name, side, ring).
- `action`: none (the card is a link), or a page action such as **Choose** in onboarding and the slot picker.
- `match`: a "why it matched" line from [search-box](search-box.md), shown under the name.
- Reads `level.band` (for the coverage line in `full` when started).

## Behaviour

- The whole card is a link to the opening's page ([sortable-table](sortable-table.md)'s row link); the action button
  and the mode counts keep their own clicks.
- Hover on a style tag: a [hint](hint.md) explaining it ("Gambit: gives a pawn early for quick development").
- Hover on the thumb: no preview; the card is already the preview.
- Loading: a skeleton of the same size. An authored opening (written in Create) shows "Yours" and an Edit icon.
- Touch: one tap opens; long-press on a tag shows its hint.

## Composed of

[board-thumb](board-thumb.md), [opening-name](opening-name.md), [mode-counts](mode-counts.md),
[progress-ring](progress-ring.md), [hint](hint.md), [icon-action](icon-action.md).

## Used by

[openings](../pages/openings.md), [onboarding](../pages/onboarding.md), [repertoire-slots](repertoire-slots.md) (its
picker), [search](../pages/search.md), [line](../pages/line.md) ("other openings that teach it"),
[idea](../pages/idea.md).

## From v1

Repurpose. `apps/web/src/features/search/course-card.tsx` already draws a course with a thumb, name, tier, side,
progress (`courseProgress` in `packages/core/src/search/progress.ts`) and "why it matched"; Overview reuses it
(`apps/web/src/features/profile/overview/overview-page.tsx`). v2 drops tier and "play it / against it", adds style
tags, level and mode counts. The rows of `apps/web/src/features/courses/courses-page.tsx` fold into the
[openings](../pages/openings.md) page's table view.

## Open questions

- Where do style tags live: a new `style:` field in the opening's YAML, or derived from line kinds (many gambit lines
  means "gambit")? Authored is clearer.
