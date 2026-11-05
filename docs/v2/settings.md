# Settings

Almost everything in v2 has a sensible default and should be changeable: how many new moves a day, how strict the gates
are, what the computer plays, how much the feedback says, which puzzles come up. That needs one settings system,
designed once, rather than a switch added wherever it is wanted.

**Settings are the learner's; config is the site's.** How the site teaches and judges (how many tries before a move
is shown, when a move counts as known, the grade thresholds, the base delays) is config, written by us and the same
for everyone: see [config.md](config.md). Config also declares which settings exist, with their defaults, ranges and the
presets. Every learner setting key is listed once under "Keys" below; anything that is a rule lives in config.md.

## What v1 has

Settings work today, in five separate places:

| Where                          | Holds                                                             | Stored                             |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------- |
| `data/training-settings.ts`    | courses being learned, new moves per day, include rare lines      | SQLite `settings` table (exported) |
| `components/board/prefs.ts`    | board theme, pieces, display choices                              | localStorage, per device           |
| `data/engine/prefs.ts`         | engine on or off, depth                                           | localStorage                       |
| `data/practice-config.ts`      | each practice mode's last set-up (source, weighting, mode fields) | localStorage, `createPrefStore`    |
| `features/explorer/service.ts` | the Lichess token                                                 | localStorage, never exported       |

And many fixed numbers that ought to be settings: `DEFAULT_NEW_CARDS_PER_DAY`, `SESSION_SIZE`,
`MIN_POPULARITY_FOR_CARD`, `EASY_WITHIN_MS`, `EXPLORER_BAND` (`packages/core/src/constants.ts`), the delays in
`FEEDBACK_DELAYS` (`lib/feedback.ts`), the regret thresholds (`training/regret.ts`), the two-tries rule
(`training/attempt.ts`), the "passed" and "graduated" rules (`training/units/progress.ts`).

The good parts to keep: `lib/local-prefs.ts` reads every value field by field, so a bad stored value falls back to its
default and never breaks the app; old keys are carried over once (`migratePracticePrefs`); the practice set-up card
edits a copy and changes nothing until Start.

## The design

### One registry

Every setting is declared once, in core, with everything the app needs to store it, check it, show it and explain it:

```ts
defineSetting({
  key: 'review.newPerDay',
  group: 'review',
  label: 'New moves a day',
  hint: 'How many moves you have not seen before are added to your reviews each day.',
  schema: z.number().int().min(0).max(50), // the range comes from config: schedule.newPerDay
  default: 10,
  level: 'basic', // or 'advanced'
  scopes: ['learner', 'opening'], // where it may be set (below)
  store: 'learner', // device, learner or secret
  control: { kind: 'slider', step: 1, marks: [5, 10, 20] },
  explain: (value) => `About ${value * 7} new moves a week.`,
});
```

The settings page, the gear on a board, the practice card and an opening's page all draw from the registry, so a setting
looks, behaves and is worded the same wherever it appears. Adding a setting is one declaration; nothing else has to
remember it.

### Layers: where a value comes from

A value is looked up from the most particular layer to the most general, and the first that has one wins:

1. **this session**: the practice set-up card (as now: a copy, applied at Start);
2. **this opening**: a learner's choice for one opening in their repertoire ("only main lines here");
3. **you**: the learner's own choice;
4. **the material**: what an author set for an opening ("this one is sharp: include its rare lines");
5. **the preset** the learner picked (below);
6. **the default** in the registry.

The page always says where a value came from ("set for this opening", "from the Club player preset") and offers to reset
it to the next layer down.

**The learner wins, on purpose.** An opening's suggested setting values (the material layer) sit below the learner's own
choice, so an author can suggest "include rare lines here" but never override what the learner chose. This is different
from an opening's **config overrides** (the short listed set of keys an `opening.yaml` may change, such as how its gates
or rare lines count, config.md): those are config, the same for everyone, and are not a settings layer.

### Presets

Most people should never open the settings page. A preset sets many values at once, and anything changed afterwards
shows as "custom":

| Preset              | For                       | For example                                                                      |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| **Getting started** | new players               | 5 new moves a day, full explanations, words after each answer, gates relaxed     |
| **Club player**     | 1000 to 1600              | 10 new moves a day, gates as written, the computer plays what your level plays   |
| **Exam**            | testing yourself honestly | no Hint or Show me, the tries table only at the end, the computer may leave book |
| **Relaxed**         | browsing and studying     | no daily limit, gates relaxed, everything shown                                  |

### Where it is stored

| Store       | What                                                        | Where                           | Exported |
| ----------- | ----------------------------------------------------------- | ------------------------------- | -------- |
| **device**  | how things look on this screen: board, sounds, motion       | localStorage                    | optional |
| **learner** | how you learn: review, gates, feedback, puzzles, repertoire | SQLite `settings` table         | yes      |
| **secret**  | the Lichess token                                           | localStorage, this browser only | never    |

Maintainer values (the explorer band baked into the build, thresholds the build checks) move out of `constants.ts` into
config (`content/config.yaml`, [config.md](config.md)), visible and changed in one place.

### The page

- Groups down the side, a search box at the top ("delay", "puzzle", "rare"), Basic and Advanced.
- Each row: the label, the control, one line of hint, what the value means in practice (`explain`), where it comes from,
  and a reset when it differs from the default.
- Changes save as they are made, with Undo; no Save button. (The practice card stays the exception: it edits a copy
  until Start, as now.)
- Settings also appear **where they bite**: the board's gear (board look), the practice card (this session), an
  opening's page (this opening), the end of a step ("too fast? slow the feedback down"). Each is the same registry
  entry.
- Export and import carry learner settings with everything else (v1 already exports the settings table).

## Keys

Every learner setting, once. **Group** is where it sits on the settings page (`/you/settings/<group>`); **store** is
where it is kept (device: localStorage on this screen; learner: the SQLite `settings` table, exported; secret: this
browser only, never exported); **level** is Basic or Advanced on the page. A default written as a config key comes from
[config.md](config.md), which also sets the allowed range. Rules (hint fading, tries before the move is shown, the known
and mastered rules, gates, stages, checkpoint marks, grade cut-offs, base delays) are config keys, not settings, and are
not listed here.

| Key                         | Group         | Store   | Default                                                                  | Level    |
| --------------------------- | ------------- | ------- | ------------------------------------------------------------------------ | -------- |
| `preset`                    | (top of page) | learner | Club player (onboarding may pick Getting started)                        | basic    |
| `repertoire`                | level         | learner | none; set by ticks and the repertoire page (v1 `enrolled`)               | basic    |
| `level.band`                | level         | learner | 1000–1600 (`coverage.band`), set by onboarding                           | basic    |
| `level.coverageTarget`      | level         | learner | 1 game in 20 (`coverage.minShare`; v1 `minPopularityPercent`)            | advanced |
| `level.includeRare`         | level         | learner | off (v1 `includeRareLines`)                                              | basic    |
| `level.includeAlternatives` | level         | learner | off                                                                      | advanced |
| `level.trapsAsDrills`       | level         | learner | off (traps to spring stay extras)                                        | advanced |
| `review.newPerDay`          | review        | learner | 10 (`schedule.newPerDay`; v1 `newCardsPerDay`)                           | basic    |
| `review.sessionSize`        | review        | learner | 20 (`schedule.sessionSize`)                                              | advanced |
| `review.order`              | review        | learner | due first (or by opening, mixed)                                         | advanced |
| `review.retention`          | review        | learner | 90% (`schedule.retention`)                                               | advanced |
| `review.movesPerQuestion`   | review        | learner | 1 (1 to 5, or the rest of the line)                                      | basic    |
| `review.grading`            | review        | learner | automatic (by hand, Anki-style, later)                                   | advanced |
| `learning.gatesRelaxed`     | learning      | learner | off; on, locked steps read "suggested later" and open unasked            | advanced |
| `learning.startFrom`        | learning      | learner | where the step branches off (or move 1)                                  | advanced |
| `feedback.explain`          | feedback      | learner | a sentence (or the symbol only, or the refutation on the board)          | basic    |
| `feedback.evalAfter`        | feedback      | learner | words (or off, or words and numbers)                                     | basic    |
| `feedback.speed`            | feedback      | learner | normal (slow 1.5×, fast 0.6× over `timing.delays`)                       | basic    |
| `feedback.hints`            | feedback      | learner | on (Hint and Show me offered)                                            | basic    |
| `feedback.triesTable`       | feedback      | learner | live (or only at the end, or off)                                        | advanced |
| `feedback.triesColumns`     | feedback      | learner | grade, cost, time, help                                                  | advanced |
| `feedback.triesRightMoves`  | feedback      | learner | on (list right moves too)                                                | advanced |
| `feedback.sounds`           | feedback      | device  | on                                                                       | basic    |
| `computer.plays`            | computer      | learner | what players at your level play (or the lines as written, or the engine) | basic    |
| `puzzles.rating`            | puzzles       | learner | around your puzzle results, within 600–1800                              | basic    |
| `puzzles.solver`            | puzzles       | learner | you (or the opponent, or both)                                           | advanced |
| `puzzles.showThemes`        | puzzles       | learner | off before solving, shown after                                          | advanced |
| `puzzles.themes`            | puzzles       | learner | all                                                                      | advanced |
| `board.theme`               | board         | device  | green (v1's default profile)                                             | basic    |
| `board.pieces`              | board         | device  | v1's default set                                                         | basic    |
| `board.coordinates`         | board         | device  | on                                                                       | basic    |
| `board.legalMoves`          | board         | device  | on                                                                       | basic    |
| `board.lastMove`            | board         | device  | on                                                                       | advanced |
| `board.hoverSquare`         | board         | device  | off (as in v1)                                                           | advanced |
| `board.animation`           | board         | device  | on                                                                       | advanced |
| `board.notation`            | board         | device  | letters (or figurines)                                                   | basic    |
| `board.marksWhileStudying`  | board         | device  | on                                                                       | advanced |
| `board.sizeCap`             | board         | device  | 36rem                                                                    | advanced |
| `display.previews`          | display       | device  | small board (or off, or on with name and counts)                         | advanced |
| `display.previewDelay`      | display       | device  | 350 ms to open, 150 ms to close                                          | advanced |
| `display.positionFeatures`  | display       | device  | on request (or off, or always while studying)                            | advanced |
| `engine.on`                 | engine        | device  | on                                                                       | basic    |
| `engine.depth`              | engine        | device  | v1's default                                                             | advanced |
| `engine.lines`              | engine        | device  | 1 (1 to 5; 3 on the Board page)                                          | advanced |
| `engine.bakedOnly`          | engine        | device  | off                                                                      | advanced |
| `explorer.minShare`         | engine        | device  | 1% (rows below it folded under More)                                     | advanced |
| `lichess.token`             | accounts      | secret  | none (raises Lichess's rate limits; never exported)                      | advanced |
| `lichess.username`          | accounts      | learner | none                                                                     | basic    |
| `chessdotcom.username`      | accounts      | learner | none                                                                     | basic    |
| `games.count`               | accounts      | learner | 50 most recent games per site                                            | advanced |
| `games.fetchOnOpen`         | accounts      | learner | off                                                                      | advanced |
| `progress.showStreak`       | progress      | learner | on                                                                       | basic    |
| `data.exportReminder`       | progress      | learner | on (20 edits or 7 days)                                                  | advanced |
| `access.reducedMotion`      | accessibility | device  | follows the system                                                       | basic    |
| `access.highContrast`       | accessibility | device  | off                                                                      | basic    |
| `access.largerPieces`       | accessibility | device  | off                                                                      | basic    |
| `access.typedMoves`         | accessibility | device  | off                                                                      | basic    |
| `access.squareCursor`       | accessibility | device  | off (arrow keys move a cursor while the board has focus)                 | advanced |
| `access.readMoves`          | accessibility | device  | off                                                                      | basic    |

Every opening-layer value is the same key stored as `opening:<id>:<key>` (stores/settings.md). Names are fixed once they
ship: a renamed key is carried over once, like `migratePracticePrefs`.

## What is configurable

The catalogue by group, in words; each item is a key above. What used to be listed here and is a rule (hint fading,
tries before the move is shown, what counts as known and mastered, the gates and testing out, which stages a step has,
the checkpoint rules) is config ([config.md](config.md)).

**Your level and what you meet**: your band (the baked data is 1000 to 1600, other bands go to the live explorer); the
coverage target (answer every reply played in at least 1 game in 20); rare lines, alternatives, traps to spring as
drills.

**Spaced repetition**: new moves a day; reviews per session; review order; desired retention (within config's range);
what a review asks (one move, a few, the rest of the line); grading, automatic or by hand (Anki-style, an open item in
v1).

**Learning**: relaxing the gates (locked steps become suggestions); starting a step from move 1 or from where it
branches off.

**Feedback**: how much a wrong move explains; the tries table (live, at the end, off; its columns; right moves too or
only wrong ones); evaluation after answering; the speed of play (one multiplier over config's base delays); Hint and
Show me offered or not; sounds.

**The computer as opponent**: what it plays in Drill (the lines as written, what players at your level play, or the
engine). How many moves a Play on lasts and how much it may lose are config (`opponent.*`).

**Puzzles**: rating range; who solves; themes shown before solving; themes included. Match levels and how many per step
are config (`puzzles.*`).

**Board and display** (device): theme, pieces, coordinates, legal-move dots, last move, hovered square, animation,
notation, marks while studying, size cap; position previews and their delay; position features.

**Engine** (device): on or off, depth, lines shown, baked analysis only; the explorer's cut-off.

**Accounts**: the Lichess token (secret), your Lichess and Chess.com usernames (for your games, read from both sites'
public APIs in the browser; no token needed), how many games to read, fetching new games on opening the app.

**Progress and data**: the streak shown or hidden; the export reminder (20 edits or 7 days, exists); resetting progress
for one opening or all is an action on the data page, not a setting.

**Accessibility** (device): reduced motion, high-contrast board, larger pieces, moves typed instead of dragged, a square
cursor on the arrow keys, moves read aloud.

## Reused from v1

`lib/local-prefs.ts` (field-by-field reading, `createPrefStore`), the `settings` table and its export,
`migratePracticePrefs` as the pattern for carrying old keys over, `PracticeSetup` for session-level choices, shadcn
controls (`Switch`, `Slider`, `Select`, `ToggleGroup`; `Slider` is to add, inventory.md) for the generated rows,
`FilterToggle` for one-of-several choices.
