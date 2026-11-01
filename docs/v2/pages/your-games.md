# Your games

The learner's recent games from Lichess and Chess.com checked against their repertoire: where each game left it, who
left, and what the opening plays there. Each deviation becomes a card to review. For the improver who wants to see their
openings hold up in real games.

## Address

`/practice/games` (the list); `/practice/games/<source>/<game>` (one game: `<source>` is `lichess` or `chessdotcom`,
`<game>` that site's game id). Hash on a game: `#ply=<n>` for the board; on the list,
`#who=you|them|all&slot=white|e4|d4` ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

The Your games tile on [practice](practice.md); the games line on [Today](today.md); **What you face most** on
[repertoire](repertoire.md); [onboarding](onboarding.md)'s "Show me what I already play" when the username is kept.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Your games.

**The list**

1. The usernames (settings `lichess.username` and `chessdotcom.username`, Accounts group), each with its site, and
   **Fetch new games** with "last fetched 2 hours ago". No username: an [empty-state](../components/empty-state.md) with
   a field for each site and "Your public games are read from Lichess or Chess.com; nothing is sent anywhere else".
2. [filter-toggle](../components/filter-toggle.md)s: who left the repertoire (you, your opponent, all), the slot, and
   the site when both are set.
3. A [sortable-table](../components/sortable-table.md): date, site, colour, opponent and rating, result, opening as
   [opening-name](../components/opening-name.md), where it left the repertoire as a
   [move-chip](../components/move-chip.md) ("5.d3, you"), and the card's state
   ([state-badge](../components/state-badge.md)). A row opens the game.

**One game**

Two columns from lg: a [board](../components/board.md) in the `study` preset with
[board-controls](../components/board-controls.md) and [move-table](../components/move-table.md) of the game, the
deviation marked; beside it [move-explanation](../components/move-explanation.md) for the move that left the repertoire:
what was played with its [verdict-badge](../components/verdict-badge.md) and cost, what the opening plays and why, and
how often players at the band choose each.

## Behaviour

- Fetching reads the last 50 games per site (`games.count`) from the public games APIs in the browser, no token needed,
  one request at a time: Lichess's `/api/games/user/<name>` and Chess.com's monthly archives
  (`api.chess.com/pub/player/<name>/games/archives`), both of which answer the browser directly. A Lichess token, if
  set, only raises Lichess's rate limit. Games are kept locally so the list works offline; only **Fetch new games** goes
  out.
- For each game, the first move outside the repertoire is found by position, so transpositions stay inside.
- **You left**: the position becomes a game card in [review](review.md) ("In your game you played 5.d3; the opening
  plays 5.c3"), unless the learner removes it.
- **They left**: a reply the repertoire does not answer. If a step answers it, the row offers that step; if not, it is a
  gap, offered as a [gap-link](../components/gap-link.md) to the [map](map.md).
- A game that never entered the repertoire (another first move) is listed greyed with "outside your repertoire".
- A site unreachable or rate limited (a 429): a [notice](../components/notice.md), and the list stays as it was.

## Leads to

[review](review.md) (game cards are due with the rest); the [step](step.md) that teaches the missed move; [map](map.md)
at a gap; [board](board.md) with the whole game; the game on its site.

## From v1

New. The Lichess plumbing (`features/explorer/service.ts`, the token in
`features/profile/settings/explorer-section.tsx`) is the pattern; neither games API needs a token.
