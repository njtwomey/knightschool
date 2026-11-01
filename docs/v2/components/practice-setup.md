# Practice setup

The set-up card for any practice mode: what to practise, how to weight it, the mode's own choices, and Start.

## Shows

- A card with the mode's icon and colour, a title ("Set up a drill") and one sentence on what the mode does.
- **From** (every mode): Due today (your schedule; Review only, its default), My repertoire, Everything, one opening,
  one variation, or the hardest moves (the ones missed most). Speed adds an opening rush for one opening.
- **Weighting** (every mode except Due today): At random, or Favour popular, with its hint "Positions players at your
  level reach more often come up more often".
- **The mode's own fields**, drawn from the settings registry so they read the same here as on the settings page:
  - Review: moves per question (1 to 5, or the rest of the line);
  - Drill: how the computer replies (as written, as players at your level play, the engine);
  - Puzzles: how many, rating range, who solves (you, the opponent, both);
  - Play on: how many moves, how much evaluation you may lose;
  - Speed: the run (3, 5 or 10 lines, or 30 s, 1 min, 2 min) and the depth (to move 6, 10, 15, or the whole line);
  - Name it: how many positions (5, 10, 20).
- **Start**, and **Cancel** when it was opened from a running session.

## Configuration

- `mode`; `initial` (the saved choice, or the running session's copy); `onStart(config)`; `onCancel`.
- `only`: limit the fields (a line's quiz shows only moves per question; a variation's checkpoint shows none).
- `startLabel`: Start, Start again, Again.
- Each field is a registry entry with the **this session** layer ([settings](../settings.md), layer 1), so it also says
  where the default came from ("from the Exam preset"). Reads `review.movesPerQuestion`, `opponent.plays`,
  `puzzles.rating`, `puzzles.solver` and the per-mode saved choice (`knightschool.practice.<mode>`).

## Behaviour

- It edits a copy: **nothing restarts and nothing is saved until Start**. Cancel leaves the running session as it was.
- Start saves the choice as the mode's default for next time and starts a fresh session.
- Choosing Due today hides Weighting (the schedule decides the order).
- A source that has nothing to practise disables Start and says why: "Nothing due. Pick My repertoire for free
  practice". Free practice (any source but Due today) is never saved to the schedule, and the card says so.
- Opens inside the page, never as a dialog, on the page's first visit and on Change from the
  [practice-bar](practice-bar.md); the end of a session shows it again with **Again**.
- Keyboard: fields in order, Enter on the card starts.

## Composed of

[filter-toggle](filter-toggle.md), [settings-row](settings-row.md) (compact form, for the mode's fields),
[opening-name](opening-name.md) (the source list), [mode-counts](mode-counts.md) (small, beside each opening in From),
shadcn `Card`, `Select`, `Button`.

## Used by

[practice](../pages/practice.md), [review](../pages/review.md), [drill](../pages/drill.md),
[puzzles](../pages/puzzles.md), [play-on](../pages/play-on.md), [speed](../pages/speed.md),
[name-it](../pages/name-it.md), [practice-bar](practice-bar.md), [session-summary](session-summary.md).

## From v1

Keep. `apps/web/src/components/practice-setup.tsx` (`PracticeSetup`) is already the one card for Quiz, Name it and
Speed, editing a copy until Start, with `only` and `startLabel`; `apps/web/src/data/practice-config.ts` holds each
mode's saved choice (`createPrefStore`, `resolvePool`, `migratePracticePrefs`). v2 adds the Drill, Puzzles and Play on
modes, the variation and hardest-moves sources, and draws the mode fields from the registry.
