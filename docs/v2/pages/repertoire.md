# Repertoire

The learner's repertoire: which opening fills each slot, how much of what they will meet it covers, and where the
biggest holes are. For the improver checking whether their openings hold up, and anyone changing an opening.

## Address

`/repertoire`. `/learn` (the Learn menu item) leads here when a repertoire exists, else to [openings](openings.md).
Hash: `#side=white|black` for the side whose gaps are listed ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

- **Learn** in the menu ([../navigation/menu.md](../navigation/menu.md)); the coverage figure on the header's right.
- [Today](today.md): the coverage meter.
- [Onboarding](onboarding.md)'s last screen; an opening's **Add to repertoire** on [opening](opening.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Openings › Repertoire, with **All openings** beside it.

1. [repertoire-slots](../components/repertoire-slots.md): White, against 1.e4, against 1.d4 (later 1.c4 and the rest,
   folded under **More slots**). Each filled slot is an [opening-card](../components/opening-card.md) with
   [mode-counts](../components/mode-counts.md), a [progress-ring](../components/progress-ring.md) and **Change** and
   **Remove** as [icon-action](../components/icon-action.md)s. An empty slot is an
   [empty-state](../components/empty-state.md): "Nothing against 1.d4 yet" with **Help me choose** and **Browse**.
2. [coverage-meter](../components/coverage-meter.md), one per side: the share of games at the learner's band that stay
   inside what they know by move 5, 10 and 15, in two shades (known, and known plus still learning). A
   [hint](../components/hint.md) explains the band and links to the setting.
3. **Biggest gaps**, a [filter-toggle](../components/filter-toggle.md) for the side, then the five most common replies
   no opening answers, each a [gap-link](../components/gap-link.md): the [move-run](../components/move-run.md) to it,
   "played in 7% of games at 1000 to 1600", and what to do (**Learn it** when a step teaches it, **See it on the map**
   when nothing does yet).
4. **What you face most**, only with a username set: the slots' first moves from [your games](your-games.md), and how
   often each left the repertoire.

## Behaviour

- Coverage counts a move as covered once it is known (two right in a row), and as half-covered while learning; the meter
  says which ([../hooks/use-progress.md](../hooks/use-progress.md)). Numbers come from the shipped popularity data;
  another band asks the live explorer ([../hooks/use-explorer.md](../hooks/use-explorer.md)) and says "live".
- **Change** opens the [openings](openings.md) list filtered to that slot; choosing keeps everything learned (history is
  keyed by position and move, so a new opening that reaches the same positions starts with it) and asks once before
  replacing.
- **Remove** asks, then empties the slot; its cards stop being introduced but stay in the log.
- Transpositions count: a reply answered by another opening in the repertoire is not a gap.
- Per-opening settings ("only main lines here") are on each [opening](opening.md) page, not here.
- A tick on [opening](opening.md) or [variation](variation.md) changes the page at once
  ([choose-tick](../components/choose-tick.md)).

## Leads to

- An opening card → [opening](opening.md); a mode count → that mode for the opening.
- A gap → [step](step.md) that teaches it, or [map](map.md) at that move (`/explore/map#m=...`).
- **Help me choose** → [onboarding](onboarding.md) at that question; **Browse** → [openings](openings.md).

## As built

Titled **My repertoire**, the same words as the practice source; **Repertoire** in the header. With nothing ticked, an
[empty-state](../components/empty-state.md) says how to tick and links to Openings. Otherwise, in order:

1. The title, with the openings, steps and steps known, and a [progress-ring](../components/progress-ring.md).
2. [next-action](../components/next-action.md) beside **All of it at once**: [mode-counts](../components/mode-counts.md)
   and **Review and new moves** (`/practice/review`), **Drill all of it** (`/practice/drill/repertoire`) and **Puzzles**
   (`/practice/puzzles/repertoire`), each across everything ticked.
3. A line when cards are due outside the repertoire ([../stores/repertoire.md](../stores/repertoire.md)).
4. [repertoire-slots](../components/repertoire-slots.md), editable. A slot is worked out from the opening. Choosing
   ticks a whole opening and Change replaces the slot's main opening, both with Undo. **Make main** is not built.
5. **What you have ticked**, by opening: a [variation-list](../components/variation-list.md) of only the ticked steps,
   with their ticks. The list follows a tick at once.
6. The [coverage-meter](../components/coverage-meter.md) and the top gaps in
   [gap-link](../components/gap-link.md)'s list form.

Not built yet: **What you face most**, the side filter and `#side=` on the gaps, and `/learn`.

## From v1

"Courses I am learning" (`data/training-settings.ts`, enrolled from `features/courses/enrol-button.tsx`) and the gaps
report (`scripts/gaps.ts`, `make gaps`), whose logic moves into core. Verdict: **new** page over repurposed parts.
