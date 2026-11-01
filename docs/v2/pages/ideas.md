# Ideas

Every idea the openings teach, A to Z and by kind: tactics, plans, structures, principles and trap patterns. For the
curious who want the understanding behind the moves, and learners looking up a word they met in a step.

## Address

`/ideas`. Hash: `#kind=tactic|plan|structure|principle|trap&q=<text>&mine=1` (`mine`: only ideas in the learner's
openings) ([../navigation/url-state.md](../navigation/url-state.md)). v1's `/glossary` lands here.

## Reached from

**Ideas** in the menu ([../navigation/menu.md](../navigation/menu.md)); the trail's root on any [idea](idea.md) page;
idea results in [search](search.md).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Ideas.

1. [search-box](../components/search-box.md) for names and summaries, and
   [filter-toggle](../components/filter-toggle.md)s for kind (All, Tactics, Plans, Structures, Principles, Traps) and
   "In my openings".
2. A row of letters A to Z that jump down the list.
3. The ideas, grouped by first letter (or by kind when one kind is chosen). Each entry:
   - its name as an [idea-badge](../components/idea-badge.md) and its kind;
   - its one-sentence summary as [rich-text](../components/rich-text.md);
   - a [board-thumb](../components/board-thumb.md) of its clearest example;
   - counts: "in 6 steps, 4 openings, 120 puzzles";
   - the learner's progress on it ([state-badge](../components/state-badge.md): seen, practised).
4. A short key at the top of the list on what the kinds mean, folded once read.

## Behaviour

- The page opens on all ideas, A to Z, with the learner's own openings' ideas first in each letter when they have a
  repertoire.
- An entry's whole area opens the idea (a row link, [../patterns/interactions.md](../patterns/interactions.md));
  hovering the badge shows its summary card.
- Progress per idea is derived: seen once a step showing it is passed, practised when its puzzles and moves are
  answered well ([../hooks/use-progress.md](../hooks/use-progress.md)).
- No match: [empty-state](../components/empty-state.md) "No idea called 'zugzwangg'. Did you mean zugzwang?".

## Leads to

[idea](idea.md) (`/ideas/<idea>`).

## From v1

`features/glossary` (`glossary-page.tsx`, `motif-chip.tsx`, `use-glossary.ts`), the motif vocabulary from
`content/motifs.yaml`. Verdict: **repurpose**: motifs widen into ideas of five kinds, with progress and counts.
