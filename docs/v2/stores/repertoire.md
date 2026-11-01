# repertoire

The learner's chosen openings, each in a slot: White, against 1.e4, against 1.d4, and later the rest.

## Holds

- **slots**: `white`, `vs-e4`, `vs-d4` each holding an opening id or nothing; later slots (`vs-c4`, `vs-nf3`, ...)
  are added by the registry, not by the learner;
- **extras**: openings being learned outside a slot (a second White opening, a trap course), as v1 allows any number;
- the **band** chosen at onboarding lives in [settings](settings.md), not here.

Derived, not held: the flat list of openings being learned (slots plus extras), which is what Review, Today and the
practice source "the openings I am learning" use.

## Written by

[onboarding](../pages/onboarding.md) (the first repertoire), [repertoire-slots](../components/repertoire-slots.md) on
the [repertoire](../pages/repertoire.md) page (change, empty, swap), the "Add to my repertoire" action on
[opening](../pages/opening.md) and [opening-card](../components/opening-card.md), and import.

## Read by

[today](../pages/today.md) (what to continue), [progress](progress.md) (which openings introduce new moves, in path
order taking turns), [coverage-meter](../components/coverage-meter.md) and [gap-link](../components/gap-link.md) (per
side), [practice-setup](../components/practice-setup.md) (source), [puzzles](puzzles.md) (which puzzles to offer),
[games](games.md) (what a game is checked against), the header's coverage ([menu](../navigation/menu.md)).

## Persists

The SQLite `settings` table, exported. v1 keeps the openings being learned as one row, `enrolled`, a JSON list of
course ids, read by `getEnrolled` (which drops ids that no longer exist).

**Decision for the user (stored format):** slots need more than a flat list. Two options:

1. **A new key `repertoire`** (JSON: slot to opening id, plus extras) and `enrolled` kept in step as the flat list, so
   a v1 build reading the same export still works. Proposed.
2. **Change `enrolled`** into the slot object. Simpler, but a v1 export's `enrolled` must be read as "extras" and v1
   could not read a v2 export.

Either way, v1 learners' enrolled courses that still exist become extras, and onboarding offers to place them in
slots. Courses parked in v2 (inventory.md) are dropped from the list but their cards stay in the database.

## From v1

- `apps/web/src/data/training-settings.ts`: `getEnrolled`, `setEnrolled` (key `enrolled`).
- `apps/web/src/data/practice-config.ts`: the source `learning` ("the courses I am learning"), resolved by
  `resolvePool`.
- core `training/units/introductions.ts` (`planIntroductions`: enrolled courses take turns in path order).
- `apps/web/src/features/profile/settings/training-section.tsx`: where courses are enrolled today.

## Open questions

1. Can a slot hold two openings (a main and a surprise weapon), or is the second always an extra?
