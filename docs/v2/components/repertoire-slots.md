# Repertoire slots

The learner's repertoire as three slots, White, against 1.e4 and against 1.d4, each holding one opening or empty.

## Shows

- One tile per slot, in a fixed order: **As White**, **Against 1.e4**, **Against 1.d4**. Later slots (against 1.c4,
  against 1.Nf3) appear only when an opening for them exists.
- A filled slot: the opening's [opening-name](opening-name.md), a [board-thumb](board-thumb.md) of the position where
  it begins, its [progress-ring](progress-ring.md), its [mode-counts](mode-counts.md) in compact form, and its
  [coverage-meter](coverage-meter.md) at the learner's band, by move 10.
- An empty slot: a dashed outline, one sentence on why it matters ("Half your games start with 1.e4: choose what to
  play against it"), and **Choose an opening**.
- A slot may hold a second opening for the same trigger (a learner who keeps both the Italian and the Ruy Lopez); it is
  listed under the first, smaller, with a **Make main** action.

## Configuration

- `layout`: `full` (the repertoire page: three tiles side by side, each with coverage) or `compact` (Today and the
  header menu: one line per slot with name, ring and due count).
- `editable`: shows Choose, Change and Remove (off on Today).
- Reads `level.band` for the coverage figure and the band named under it.

## Behaviour

- Click a filled tile: the opening's page. The ring, counts and meter keep their own hovers and links.
- **Choose an opening** (empty slot) and **Change** open a short picker of [opening-card](opening-card.md)s filtered to
  that slot's side and trigger, the suggested ones first. Picking one fills the slot and opens its first step.
- **Remove** asks once ("Your progress in the Italian Game is kept and comes back if you choose it again") and empties
  the slot. Nothing about the learner's answers is deleted.
- Loading: three skeleton tiles. Before onboarding: all three empty, with a link to the three questions.
- Keyboard: the tiles are links in reading order; Choose, Change and Remove are ordinary buttons.

## Composed of

[opening-name](opening-name.md), [board-thumb](board-thumb.md), [progress-ring](progress-ring.md),
[mode-counts](mode-counts.md), [coverage-meter](coverage-meter.md), [opening-card](opening-card.md) (in the picker),
[empty-state](empty-state.md), [hint](hint.md).

## Used by

[repertoire](../pages/repertoire.md), [today](../pages/today.md), [onboarding](../pages/onboarding.md) (its result),
the header's repertoire menu ([menu](../navigation/menu.md)). Reads [use-progress](../hooks/use-progress.md).

## From v1

Repurpose. v1 has a flat set of "courses I am learning" (`getEnrolled` and `setEnrolled` in
`apps/web/src/data/training-settings.ts`) toggled by `apps/web/src/features/courses/enrol-button.tsx`, with no notion
of a slot or a side. The enrolled list becomes the repertoire; slots are new.

## Open questions

- Is a second opening per slot allowed, or does choosing a new one replace the old? The plan says "one for White",
  but learners do keep two.
