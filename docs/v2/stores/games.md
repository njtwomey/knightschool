# games

The learner's games from Lichess and Chess.com read so far, and where each left their repertoire.

## Holds

- the **usernames** (learner [settings](settings.md) `lichess.username` and `chessdotcom.username`) and when each site
  was last fetched;
- the **games** read: source (`lichess` or `chessdotcom`), the site's game id, date, colour, opponent's rating, time
  control, result, and the moves up to a little past the first move outside the repertoire;
- per game, the **deviation**: the ply, the position, what was played, what the opening plays there, who left the book
  (the learner or the opponent), and the verdict on the move played ([judgement](judgement.md));
- **summaries**: what the learner faces most that the repertoire does not answer, per side.

## Written by

Its fetcher (by username, read from the browser with no token: Lichess's `/api/games/user/<name>` and Chess.com's
`api.chess.com/pub/player/<name>/games/archives`, both sending `access-control-allow-origin: *`; one request at a time
with the explorer's 429 pause; a Lichess token, when set, only raises Lichess's rate limit), started from
[your-games](../pages/your-games.md), from [onboarding](../pages/onboarding.md) ("Show me what I already play") and, if
the setting is on, when the app opens.

## Read by

[your-games](../pages/your-games.md), [onboarding](../pages/onboarding.md) (suggestions that match what you play),
[gap-link](../components/gap-link.md) (gaps you actually met), [today](../pages/today.md), the [session](session.md)
(deviation cards in Review), and later the map's games overlay (features.md, Z3).

## Persists

**Decision for the user (new table and stored format):**

1. **A new `games` table** for the games and their deviations (source, id, at, played at, colour, result, moves as UCI,
   the deviation ply, EPD, played and expected moves). Games can be fetched again, so it could instead be a cache that
   is not exported; but deviation cards point at it, so the proposal is a table, exported.
2. **Deviation cards** in `cards` with id `deviation:<source>:<game>:<ply>` (source `lichess` or `chessdotcom`, since
   game ids are unique only within one site), `epd` the position, `expectedUci` the opening's move, `openingId` the
   opening that should have answered. Answers in `reviews`.
3. The usernames are personal but public on both sites; they go in the `settings` table and are exported. Never in the
   hash.

## From v1

New. Nearest in v1: the explorer's request discipline in `apps/web/src/features/explorer/service.ts` (one request in
flight, 429 pause, token from this browser), and `scripts/gaps.ts` (holes in the catalogue, the same question asked of
the catalogue instead of one player's games).

## Open questions

1. Should a game where the opponent left the book become a card ("punish this") or only a note?
