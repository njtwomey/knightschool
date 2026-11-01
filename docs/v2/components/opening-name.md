# Opening name

An opening's or a variation's name, written one way everywhere, with its ECO code linking to Lichess.

## Shows

- the name in Lichess's form, split into its levels: **Opening** then **Variation** ("Italian Game: Giuoco Piano"),
  with the variation part in a lighter weight;
- for one of our openings, the side it is for when it matters ("Italian Game, as White"; "Caro-Kann Defense, against
  1.e4");
- the ECO code as a small outline badge ("C50") with an icon that says it leaves the site.

## Configuration

- `opening` or `position`: one of our openings (its own name and side), or a position (the deepest named position on
  the way to it, from the Lichess names fetched at build).
- `level`: `opening` (family only), `variation` (variation only, when the opening is clear from the page), `full`.
- `side`: show "as White" or "against 1.e4", or not.
- `eco`: show the code, or not.
- Settings read: none.

## Behaviour

- **The name**, when it is one of our openings or variations, is a link to its [opening](../pages/opening.md) or
  [variation](../pages/variation.md) page; otherwise plain text. Hover gives the full name when it is cut short.
- **The ECO badge** opens the position on Lichess's opening explorer in a new tab, with "(opens Lichess in a new tab)"
  for screen readers. Without an address it is a plain badge.
- Long names wrap between levels, never inside a word; in a one-line row the variation part is cut with "…" first.
- At the `test` reveal level in Name it, the name is the answer, so it is not drawn until answered.

## Composed of

shadcn `Badge`, [hint](hint.md).

## Used by

[board-notes](board-notes.md), [position-preview](position-preview.md), [position-card](position-card.md),
[move-explanation](move-explanation.md), [opening-card](opening-card.md), [opening-intro](opening-intro.md),
[line-row](line-row.md), [breadcrumbs](breadcrumbs.md); pages [opening](../pages/opening.md),
[variation](../pages/variation.md), [line](../pages/line.md), [name-it](../pages/name-it.md) (after answering),
[your-games](../pages/your-games.md).

## From v1

Repurpose `apps/web/src/components/eco-link.tsx` (`EcoLink`: the ECO code as a Lichess link from `lichess` in
index.json, a plain badge without one) and the names from core `content/lichess.ts` (Lichess opening names, fetched
once into `.cache/`). New: one component for the name itself, split into Opening and Variation.
