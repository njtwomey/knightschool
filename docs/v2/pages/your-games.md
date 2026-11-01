# Your games

The learner's recent Lichess games checked against their repertoire: where each game left it, who left, and what the
opening plays there. Each deviation becomes a card to review. For the improver who wants to see their openings hold up
in real games.

## Address

`/practice/your-games` (the list); `/practice/your-games/<game>` (one game, by Lichess game id). Hash on a game:
`#ply=<n>` for the board; on the list, `#who=you|them|all&slot=white|e4|d4`
([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

The Your games tile on [practice](practice.md); the games line on [Today](today.md); **What you face most** on
[repertoire](repertoire.md); [onboarding](onboarding.md)'s "Show me what I already play" when the username is kept.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Your games.

**The list**

1. The username (from settings, Lichess group) with **Fetch new games** and "last fetched 2 hours ago". No username:
   an [empty-state](../components/empty-state.md) with a username field and "Your public games are read from Lichess;
   nothing is sent anywhere else".
2. [filter-toggle](../components/filter-toggle.md)s: who left the repertoire (you, your opponent, all) and the slot.
3. A [sortable-table](../components/sortable-table.md): date, colour, opponent and rating, result, opening as
   [opening-name](../components/opening-name.md), where it left the repertoire as a
   [move-chip](../components/move-chip.md) ("5.d3, you"), and the card's state
   ([state-badge](../components/state-badge.md)). A row opens the game.

**One game**

Two columns from lg: a [board](../components/board.md) in the `study` preset with
[board-controls](../components/board-controls.md) and [move-table](../components/move-table.md) of the game, the
deviation marked; beside it [move-explanation](../components/move-explanation.md) for the move that left the
repertoire: what was played with its [verdict-badge](../components/verdict-badge.md) and cost, what the opening plays
and why, and how often players at the band choose each.

## Behaviour

- Fetching reads the last 50 games (a setting) from Lichess's public games API in the browser, no token needed, one
  request at a time. Games are kept locally so the list works offline; only **Fetch new games** goes out.
- For each game, the first move outside the repertoire is found by position, so transpositions stay inside.
- **You left**: the position becomes a game card in [review](review.md) ("In your game you played 5.d3; the opening
  plays 5.c3"), unless the learner removes it.
- **They left**: a reply the repertoire does not answer. If a step answers it, the row offers that step; if not, it is
  a gap, offered as a [gap-link](../components/gap-link.md) to the [map](map.md).
- A game that never entered the repertoire (another first move) is listed greyed with "outside your repertoire".
- Lichess unreachable or a 429: a [notice](../components/notice.md), and the list stays as it was.

## Leads to

[review](review.md) (game cards are due with the rest); the [step](step.md) that teaches the missed move; [map](map.md)
at a gap; [analysis](analysis.md) with the whole game; the game on Lichess.

## From v1

New. The Lichess plumbing (`features/explorer/service.ts`, the token in
`features/profile/settings/explorer-section.tsx`) is the pattern; the games API needs no token.

## Open questions

- Storing fetched games needs a stored-format decision (roadmap decision 4, and decision 6 on reading games at all).
