# Credits

Who and what the site is built on: Stockfish, Lichess's data and puzzles, the sources each opening credits, the
libraries, and the licences. For the curious, and because the licences ask for it.

## Address

`/credits`. No hash ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

The footer of every page ([page-shell](../components/page-shell.md)); a puzzle's "from the Lichess puzzle database"
link on [puzzles](puzzles.md); an opening's [sources-list](../components/sources-list.md) (**All credits**).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Credits.

1. One paragraph: Knight School is free and open source (MIT), runs in the browser, and stands on the work below.
2. **Stockfish**: the engine (GPL-3.0), run as a separate program in the browser and spoken to over UCI; a link to its
   source and licence, and the version in use.
3. **Lichess**: the opening explorer (what players at your band play), the opening names, and the puzzle database
   (public domain, CC0): "6.2 million puzzles, of which the ones matching your openings ship with the site". The games
   API, for your games. Links to each. **Chess.com**: its public API, for your games.
4. **Sources by opening**: each opening's [opening-name](../components/opening-name.md) with its
   [sources-list](../components/sources-list.md) (videos, books, articles), shipped and authored.
5. **Libraries**: the board, the chess rules, the database, the scheduler (FSRS), the interface components; each with
   its licence and a link.
6. **Licence**: the MIT text for our code, and a link to the repository on GitHub.

## Behaviour

- A plain page; nothing interactive beyond links.
- Offline: everything shows; links out are marked as needing a connection.

## Leads to

Outside links only, and each opening's [opening](opening.md) page from its name.

## From v1

`features/credits/credits-page.tsx`. Verdict: **keep**, adding the Lichess puzzle database, the games API and sources
by opening.
