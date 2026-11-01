# modes

The rules that belong to Speed and Name it alone: how a timed run is scored and how deep it goes, and how a typed
opening name is graded.

## Gives

- **Speed**:
  - `cutToMove(line, depth)` and `SPEED_DEPTHS` (to move 6, 10, 15, or the whole line);
  - `decidingPosition(opening, line, depth)`: where a line parts from the lines before it in its opening, for
    weighting by popularity;
  - `speedSummary(run) → { moves, meanMsPerMove, hints, shown }`: a set of lines scores the mean time per move, a timed
    run how many moves were made; Hint and Show me each count a step;
  - `rushQueue(steps, depth)`: an opening rush, each passed step from the start to its end, ignoring the depth;
  - `formatMs`.
- **Name it**:
  - `guessTargets(position, catalog) → GuessTargets`: every opening and variation whose lines reach the position
    (transpositions count), at most `MAX_TELLABLE_VARIATIONS`;
  - `gradeGuess(text, targets) → GuessResult`: full credit for a variation, half for the opening only, none otherwise,
    through [search](search.md)'s forgiving match;
  - `guessSuggestions`, `suggest` (the answer box's suggestions), `guessPoints`, `guessSummary`, `guessWeight`
    (popularity weighting of positions), `lastResults`.

## Takes

[tree](tree.md) (lines, positions, names), [search](search.md) (text match), [training](training.md) (`practiceWeight`,
`pickWeighted`), [lichess-data](lichess-data.md) (names). Config: `timing.delays` for Speed's countdown (through the web
app).

## Rules

- **Speed never touches the schedule**: runs are logged (`speed_attempts` in v1, the shared attempts log once agreed),
  not reviewed.
- **The other side answers at once** in Speed; a five-second countdown with the next line's name sits before the first
  line and between lines of a fixed run.
- **Name it grades names, not moves**: a variation's name is full credit, its opening's half; a slip in spelling is
  forgiven by the text match.
- **Favour popular** is the same weight as everywhere ([training](training.md)): the deciding position for Speed, the
  position to name for Name it.
- Both become [exercise](exercise.md) definitions once the shared session has proved itself (capabilities.md 3): Speed
  as exact and timed with a scripted responder, Name it as typed with none. Until then their own stores run them.

## Used by

[exercise](exercise.md) (later); [countdown](../components/countdown.md), [answer-input](../components/answer-input.md),
[session-summary](../components/session-summary.md), [practice-setup](../components/practice-setup.md); pages
[speed](../pages/speed.md), [name-it](../pages/name-it.md), [stats](../pages/stats.md) (Speed runs).

## From v1

- `packages/core/src/modes/speed.ts`: **keep**.
- `packages/core/src/modes/guess.ts`: **keep**.
- `rushQueue` in `apps/web/src/features/speed/store.ts` (tested in `rush.test.ts`), started from
  `features/path/sessions/opening-rush.ts`: **repurpose**, its pure part moves here.

## Tests

The existing `speed` and `guess` tests stay. New: `rushQueue` over passed steps; `gradeGuess` with transpositions
reaching two openings; Speed summaries with hints and shows counted.
