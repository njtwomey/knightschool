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

[breadcrumbs](../components/breadcrumbs.md): Learn › Repertoire, with **All openings** beside it.

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

- Coverage counts a move as covered once it is known (two right in a row), and as half-covered while learning; the
  meter says which ([../hooks/use-progress.md](../hooks/use-progress.md)). Numbers come from the shipped popularity
  data; another band asks the live explorer ([../hooks/use-explorer.md](../hooks/use-explorer.md)) and says "live".
- **Change** opens the [openings](openings.md) list filtered to that slot; choosing keeps the old opening's progress
  (history is keyed by opening and position) and asks once before replacing.
- **Remove** asks, then empties the slot; its cards stop being introduced but stay in the log.
- Transpositions count: a reply answered by another opening in the repertoire is not a gap.
- Per-opening settings ("only main lines here") are on each [opening](opening.md) page, not here.

## Leads to

- An opening card → [opening](opening.md); a mode count → that mode for the opening.
- A gap → [step](step.md) that teaches it, or [map](map.md) at that move (`/explore/map#m=...`).
- **Help me choose** → [onboarding](onboarding.md) at that question; **Browse** → [openings](openings.md).

## From v1

"Courses I am learning" (`data/training-settings.ts`, enrolled from `features/courses/enrol-button.tsx`) and the
gaps report (`scripts/gaps.ts`, `make gaps`), whose logic moves into core. Verdict: **new** page over repurposed
parts.
