# repertoire

What the learner has chosen to learn: whole openings, or some of their variations, lines and steps.

## Holds

- **picks**: what the learner has ticked, from a whole opening to one step;
- the **band** chosen at onboarding lives in [settings](settings.md), not here.

Derived, not held: the openings being learned, and which slot each fills.

## Written by

[onboarding](../pages/onboarding.md) (the first repertoire), [repertoire-slots](../components/repertoire-slots.md) on
the [repertoire](../pages/repertoire.md) page (change, empty, swap), [choose-tick](../components/choose-tick.md) on
[opening](../pages/opening.md) and [variation](../pages/variation.md), and import.

## Read by

[today](../pages/today.md) (what to continue), [progress](progress.md) (which openings introduce new moves, in path
order taking turns), [coverage-meter](../components/coverage-meter.md) and [gap-link](../components/gap-link.md) (per
side), [practice-setup](../components/practice-setup.md) (source), [puzzles](puzzles.md) (which puzzles to offer),
[games](games.md) (what a game is checked against), the header's coverage ([menu](../navigation/menu.md)).

## Persists

The SQLite `settings` table, exported. One row, `repertoire`, in the registry
([settings](settings.md)): no new table and no migration.

**As built.** The row is a JSON list of picks, a flat list rather than the slots proposed earlier; a slot is worked out
from the opening (its side and the first move it answers), so nothing about slots is stored. The unit is the **step**:
the chunk learned and tested at once. Every move card belongs to a step, and a step sits in exactly one variation and
one line, so ticking a variation or a line is ticking its steps and the two can never disagree. A follow-up comes with
the step it hangs off.

Picks are kept in their smallest form (core `training/repertoire.ts`), so a whole opening or variation grows with the
content:

| Pick                              | Means                       |
| --------------------------------- | --------------------------- |
| `<opening>`                       | the whole opening           |
| `variation:<opening>/<variation>` | every step of the variation |
| `step:<opening>/<step>`           | one step                    |

A step's id is `<line>:<n>`, and a recut can change `n`. A line's id is permanent, so a step id that has gone widens to
the steps of its line and no tick is lost. A pick for an opening or variation that no longer exists is dropped when
read. v1's `enrolled` reads in as whole openings. Merging an import is by `at`, as for any setting: the newer list wins
whole.

## What it does to practice

A tick says what is chosen and nothing else: it makes no cards and changes no progress. With nothing ticked, practice
runs as it did before. With anything ticked (`withRepertoire`, `features/practice/chosen.ts`):

- **Due**: Today, the hub, the Due today session and the next action count only cards in the repertoire: the move cards
  of ticked steps and their follow-ups, the questions of variations with a ticked step, the puzzles of ticked lines.
  Cards outside stay in the log and on their schedule. A quiet line says how many wait, and **Review them too**
  (`/practice/review/due-all`) asks every card due.
- **New moves** come only from ticked steps, within the same daily limit.
- **Gates**: a ticked step counts as open for the next action and new moves however far off it is, because the learner
  asked for it. Its state on the opening's pages does not change.
- **"My repertoire"** in practice-setup is what is ticked in every mode. A drill walks each ticked line from the
  opening's start up to its last ticked step, replying only into ticked lines. Puzzles matched to no one line come with
  their opening.
- A tick on a later step does not add the steps before it; a drill still plays those moves on the way.
- Coverage still asks of the whole opening: it measures what is known, not what is ticked.

## From v1

- `apps/web/src/data/training-settings.ts`: `getEnrolled`, `setEnrolled` (key `enrolled`).
- `apps/web/src/data/practice-config.ts`: the source `learning` ("the courses I am learning"), resolved by
  `resolvePool`.
- core `training/units/introductions.ts` (`planIntroductions`: enrolled courses take turns in path order).
- `apps/web/src/features/profile/settings/training-section.tsx`: where courses are enrolled today.
