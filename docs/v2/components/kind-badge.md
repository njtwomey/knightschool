# Kind badge

What kind of line this is and how risky it is to play, as one or two small coloured badges.

## Shows

- **Kind**, one of: Main line, Sideline, Rare, Gambit, Trap to spring, Trap to avoid. Kinds are relative to the side
  the line is written for; a trap written for the other side shows flipped (to spring becomes to avoid) in an opening
  for the learner's side.
- **Risk**, when asked: Low risk (green), Medium risk (amber), High risk (red): how easily a slip costs something.
- Optionally the line's character (solid, positional, sharp, tactical), an early mate, or a trick that comes up, in the
  compact list with "…" to open the rest in place.

Each kind and risk has one colour from [colours](../patterns/colours.md), and the word is always there (on hover and to a screen reader in the small form, an icon alone: an arrow up for a main line, a turning arrow for a sideline), so colour is
never the only signal.

## Configuration

- `line`: its kind, risk and tags, and the learner's side (for flipping traps and for "you" or "them" in mate tags).
- `show`: `kind`, `kind and risk`, or `all` (with character and tricks, the first three and "…").
- Settings read: none.

## Behaviour

- Hover, focus or long-press: a [hint](hint.md) with what it means, from the one wording table: "Trap to avoid: a trap
  the opponent can set; the opening shows how to step round it." "High risk: sharp and forcing; one wrong move can
  lose quickly."
- Not clickable by itself; a filter on a list uses the same names and colours through [filter-toggle](filter-toggle.md).
- A key to every badge in a list is given once by [map-legend](map-legend.md) on the map, and by a small "What the tags
  mean" collapsible on the opening page.
- Hidden at the `test` reveal level when the kind would give the answer away (a Trap to spring before it is sprung).

## Composed of

shadcn `Badge`, [hint](hint.md).

## Used by

[line-row](line-row.md), [position-card](position-card.md), [variation-list](variation-list.md),
[line-story](line-story.md), [opening-card](opening-card.md) (character as style tags), [map-index](map-index.md),
[search-box](search-box.md) results; pages [opening](../pages/opening.md), [line](../pages/line.md),
[search](../pages/search.md), [create-opening](../pages/create-opening.md) (choosing a kind).

## From v1

Repurpose `apps/web/src/components/tags/tag-badge.tsx` (`Tag`, `VariantTags` with the "…" to expand),
`tags/tag-specs.ts` (`tagsOf`, one tone per kind of tag, risk green, amber, red), `tags/hints.ts` (`KIND_LABEL`,
`KIND_OPTIONS`, `kindLabel`, `RISK_HINT`, `TRAP_HINT`) and `tags/tag-legend.tsx`. Motif tags leave this component and
become [idea-badge](idea-badge.md)s.
