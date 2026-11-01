# Settings

Almost everything in v2 has a sensible default and should be changeable: how many new moves a day, how strict the
gates are, what the computer plays, how much the feedback says, which puzzles come up. That needs one settings system,
designed once, rather than a switch added wherever it is wanted.

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

The good parts to keep: `lib/local-prefs.ts` reads every value field by field, so a bad stored value falls back to
its default and never breaks the app; old keys are carried over once (`migratePracticePrefs`); the practice set-up card
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
  schema: z.number().int().min(0).max(100),
  default: 10,
  level: 'basic', // or 'advanced'
  scopes: ['learner', 'opening'], // where it may be set (below)
  store: 'learner', // device, learner or secret
  control: { kind: 'slider', step: 1, marks: [5, 10, 20] },
  explain: (value) => `About ${value * 7} new moves a week.`,
});
```

The settings page, the gear on a board, the practice card and an opening's page all draw from the registry, so a
setting looks, behaves and is worded the same wherever it appears. Adding a setting is one declaration; nothing else
has to remember it.

### Layers: where a value comes from

A value is looked up from the most particular layer to the most general, and the first that has one wins:

1. **this session**: the practice set-up card (as now: a copy, applied at Start);
2. **this opening**: a learner's choice for one opening in their repertoire ("only main lines here");
3. **you**: the learner's own choice;
4. **the material**: what an author set for an opening ("this one is sharp: include its rare lines");
5. **the preset** the learner picked (below);
6. **the default** in the registry.

The page always says where a value came from ("set for this opening", "from the Club player preset") and offers to
reset it to the next layer down.

### Presets

Most people should never open the settings page. A preset sets many values at once, and anything changed afterwards
shows as "custom":

| Preset              | For                       | For example                                                                      |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| **Getting started** | new players               | 5 new moves a day, hints that fade slowly, full explanations, gates advise only  |
| **Club player**     | 1000 to 1600              | 10 new moves a day, gates on, the computer plays what players at your level play |
| **Exam**            | testing yourself honestly | no hints, no second try, the computer may leave the book, gates strict           |
| **Relaxed**         | browsing and studying     | no limits, no gates, everything shown                                            |

### Where it is stored

| Store       | What                                                        | Where                           | Exported |
| ----------- | ----------------------------------------------------------- | ------------------------------- | -------- |
| **device**  | how things look on this screen: board, sounds, motion       | localStorage                    | optional |
| **learner** | how you learn: review, gates, feedback, puzzles, repertoire | SQLite `settings` table         | yes      |
| **secret**  | the Lichess token                                           | localStorage, this browser only | never    |

Maintainer settings (the explorer band baked into the build, thresholds the build checks) move out of `constants.ts`
into one committed file the scripts read, so they are visible and changed in one place.

### The page

- Groups down the side, a search box at the top ("delay", "puzzle", "rare"), Basic and Advanced.
- Each row: the label, the control, one line of hint, what the value means in practice (`explain`), where it comes from,
  and a reset when it differs from the default.
- Changes save as they are made, with Undo; no Save button. (The practice card stays the exception: it edits a copy
  until Start, as now.)
- Settings also appear **where they bite**: the board's gear (board look), the practice card (this session), an
  opening's page (this opening), the end of a lesson ("too fast? slow the feedback down"). Each is the same registry
  entry.
- Export and import carry learner settings with everything else (v1 already exports the settings table).

## What is configurable

The catalogue, by group. Defaults are suggestions; everything here is a registry entry.

**Your level and what you meet**

- Your band (sets suggestions; the baked data is 1000 to 1600, other bands go to the live explorer).
- Coverage target: answer every reply played in at least 1 game in 20 (`MIN_POPULARITY_FOR_CARD`, 5%).
- Include rare lines (exists), alternatives, traps to spring as drills.

**Spaced repetition**

- New moves a day (exists, 10); reviews per session (`SESSION_SIZE`, 20); review order (due first, by opening, mixed).
- Desired retention (FSRS, default 90%) and the longest interval.
- What a review asks: one move, a few moves, or the rest of the line (exists for Quiz).
- Grading: automatic (exists; quick and right is Easy within `EASY_WITHIN_MS`, 5 s) or by hand, Anki-style (an open
  item in v1).
- What counts as known (two right in a row) and mastered (seven days and more).
- What the cards cover: your moves, the opponent's mistakes to punish, puzzles, deviations from your games.

**Learning**

- The lesson's steps: which to show (read, watch, try, their mistakes).
- Hints: how fast the arrow fades (two right) and comes back (two wrong).
- Start from move 1 or from where the lesson branches.
- Gates: strict, advise only, or off; testing out allowed.

**Feedback**

- How much a wrong move explains: the symbol, a sentence, or the refutation on the board.
- The tries table: shown live, only at the end, or off; which columns (cost in centipawns, winning chance, time,
  help used); right moves listed too or only the wrong ones.
- Evaluation after answering: off, words, words and numbers.
- Speed of play: one multiplier over `FEEDBACK_DELAYS` (slow, normal, fast), and the computer's thinking time.
- Tries before the move is shown (`WRONG_TRIES_ALLOWED`, 2); sounds; animation.

**The computer as opponent**

- What it plays: the lines as written, what players at your level play (weighted), or the engine.
- In Play on: how many moves, how much evaluation you may lose, how often it leaves the book.

**Puzzles**

- Rating range (fixed, or around your puzzle results); who solves (you, the opponent, both).
- Which match levels to use (through the position down to same idea; puzzles.md); how many per lesson.
- Themes to include or leave out.

**Board and display** (device)

- Theme, pieces (exists), coordinates, legal-move dots, last-move highlight, marks shown or not while studying.
- Notation (letters or figurines), board size cap, animation speed.

**Engine** (device)

- On or off (exists), depth (exists), number of lines shown, baked analysis only.

**Lichess**

- Token (secret, exists), your username (for your games), fetching your new games on opening the app.

**Data**

- The export reminder (20 edits or 7 days, exists), backups, resetting progress for one opening or all.

**Accessibility** (device)

- Reduced motion, high-contrast board, larger pieces, moves typed instead of dragged, moves read aloud.

## Reused from v1

`lib/local-prefs.ts` (field-by-field reading, `createPrefStore`), the `settings` table and its export,
`migratePracticePrefs` as the pattern for carrying old keys over, `PracticeSetup` for session-level choices, shadcn
controls (`Switch`, `Slider`, `Select`, `ToggleGroup`) for the generated rows, `FilterToggle` for one-of-several
choices.
