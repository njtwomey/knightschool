# Learner data: the browser database

Everything about one learner, in SQLite in their browser (as v1), exported and imported as one file. Few tables, each
simple. Rows carry an `at` time; logs are append-only. Tables marked **new** change the stored format and need agreeing
first.

| Table                                               | Holds                                                 | v1                                        |
| --------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| `settings`                                          | key, value, `at`: settings, repertoire, small state   | kept                                      |
| `cards`                                             | one per thing scheduled: FSRS state                   | kept, more kinds; move cards re-keyed     |
| `reviews`                                           | each scheduled answer                                 | kept                                      |
| `attempts`                                          | each exercise answered, with every try                | **new**                                   |
| `games`                                             | the learner's Lichess and Chess.com games read so far | **new**                                   |
| `authored_*`                                        | openings and lines written in Create, with history    | kept                                      |
| `eval_cache`, `explorer_cache`                      | results fetched or computed in the browser            | kept (left out of exports: proposed)      |
| `quiz_attempts`, `guess_attempts`, `speed_attempts` | v1's per-mode logs                                    | kept, read only; new modes use `attempts` |

## `settings`

One row per key. The learner layer of [../settings.md](../settings.md), plus:

- `repertoire`: `{ "white": "italian-white", "vsE4": "e5-open", "vsD4": "qgd" }` (v1 kept `enrolled` openings here).
- `opening:<id>:<key>`: a setting for one opening.
- `preset`: the chosen preset.
- `lichess.username`, `chessdotcom.username`: whose public games [your games](../pages/your-games.md) reads. Personal
  but public on both sites; exported, never in the hash.

Device settings (board look, motion) stay in localStorage, and the token stays in this browser only, as in v1.

## `cards`

v1's table, unchanged in columns. The id says what it is:

| Kind      | Id                                | `epd`                         | `expectedUci`          |
| --------- | --------------------------------- | ----------------------------- | ---------------------- |
| move      | `move:<epd>:<uci>` (**new**)      | the position                  | your move              |
| question  | `quiz:<opening>:<id>` (v1)        | the position                  | empty                  |
| puzzle    | `puzzle:<id>`                     | the puzzle's start            | the first solving move |
| deviation | `deviation:<source>:<game>:<ply>` | where your game left the line | the line's move        |

**Move cards are re-keyed (a recommended stored-format change, [upgrades.md](upgrades.md)).** v1 keys a move card by
course and position (`<course>:<epd>`); v2 keys it by position and move, `move:<epd>:<uci>`, so what a learner knows
about a move is the same in every opening and through every transposition, and content can be restructured without
losing progress. Steps, variations and lines hold no progress; their states are worked out from the move cards. A
one-off migration turns v1's cards into the new ids. A move no opening teaches any more keeps its card, dormant.

`<source>` in a deviation id is `lichess` or `chessdotcom`, since game ids are only unique within one site.

## `attempts` (new)

One row per exercise answered, in any mode, so the tries table and every summary read one log:

```
id, at, session, mode, ref, result, tries, ms, hints, shown
```

- `mode`: learn, try, drill, review, puzzle, play-on, checkpoint, speed, name-it.
- `ref`: what was asked (a card id, a step id, a puzzle id).
- `result`: right, wrong, shown, or a score.
- `tries`: a JSON list of the moves tried, in order, with the time of each. The cost of each is worked out from
  judgement when shown, not stored.

## `games` (new)

```
id, source, at, played (date), colour, opponent, moves (UCI, first 30 plies), opening, leftAt (ply), leftMove, lineMove
```

Read from Lichess and Chess.com by username, newest first, from the browser with no token (both public APIs allow it).
`source` is `lichess` or `chessdotcom`; `id` is that site's game id, unique together with `source`. `leftAt` is where
the game first left the repertoire; a deviation card is made from it.

## Authored openings

v1's three tables stay: `authored_chapters` (a line's PGN, in the content format), `authored_courses` (an opening's YAML
as JSON), `authored_history` (undo). Table names stay as they are; only the code and the screens say line and opening.
An authored opening is validated when built, so an old row never blocks the app.

## Export

One file with every table above except the caches: the same as v1, plus `attempts` and `games`. The file is versioned:
it is stamped with the app version, the database schema version and the content version it was made with. Every older
version imports (migrated on the way in, [upgrades.md](upgrades.md)); a newer one is refused with a message. The export
reminder (20 edits or 7 days) and the automatic snapshots taken before each migration are on the
[data](../pages/data.md) page. Import merges by `at` and writes nothing if a row fails to validate (v1's rule).
