# Session summary

The end of any practice session: how it went, every guess with its cost, and what to do next.

## Shows

- **A headline and one sentence**: "Review done: 20 moves. 15 right first time, 3 with help, 2 to see again soon." For
  free practice: "Nothing here changes your schedule." For a checkpoint: "Cleared: 11 of 12. The Two Knights is open."
- **The score, in the mode's terms**, as two or three large figures: right first time, with help, missed (Review, Drill,
  Try); solved and rating range (Puzzles); mean time per move or moves made (Speed); points (Name it); kept or gave away
  the advantage, with the evaluation change (Play on).
- **The tries table** ([tries-table](tries-table.md)), for the modes that ask moves: every guess of the session, each
  try not only the last, with its grade, its cost in centipawns against the line's move, the time and help used. Costs
  still being worked out fill in as they arrive.
- **Name it** has no tries table, since it asks names, not moves: its summary keeps its own list instead, each position
  with the name typed, the right name and full, half or no credit ([name-it](../pages/name-it.md)).
- **What it means**: the ideas the session touched, as [idea-badge](idea-badge.md)s, and for a step's Done stage where
  the line leaves you ([eval-words](eval-words.md)).
- **What next**: the [next-action](next-action.md) for the same scope, plus the [practice-setup](practice-setup.md) card
  labelled **Again** for another session of this mode.

## Configuration

- `mode`, the finished session's results and tries, and its `config`.
- `scope`: what the session covered, for "what next" and for the Again card's `only`.
- Reads `feedback.triesTable` (live, only at the end, or off: with off the table here is folded behind "See every try"),
  `feedback.triesColumns`, `feedback.triesRightMoves` (list right moves too, or only the wrong ones) and
  `feedback.evalAfter`.

## Behaviour

- Click a row of the tries table: the board beside the summary goes to that position, showing what was played, the
  line's move and the refutation, in the `answered` reveal level ([reveal](../patterns/reveal.md)).
- A move as good as the line's but not it keeps its grade (Good or Excellent) with the flag "not your repertoire move",
  told apart from a real mistake, so the learner knows which misses matter ([capabilities](../capabilities.md) section
  2).
- An empty session ("Nothing to review right now"): no figures or table, the reason in a sentence, and the ways on:
  raise new moves a day ([setting-inline](setting-inline.md)), free practice, or the next step.
- Nothing waits: the summary appears as soon as the last answer's feedback ends.

## Composed of

[tries-table](tries-table.md), [board](board.md) (`answered` reveal), [idea-badge](idea-badge.md),
[eval-words](eval-words.md), [verdict-badge](verdict-badge.md), [next-action](next-action.md),
[practice-setup](practice-setup.md), [setting-inline](setting-inline.md), [empty-state](empty-state.md).

## Used by

[review](../pages/review.md), [drill](../pages/drill.md), [puzzles](../pages/puzzles.md),
[play-on](../pages/play-on.md), [checkpoint](../pages/checkpoint.md), [speed](../pages/speed.md),
[name-it](../pages/name-it.md), [step](../pages/step.md) (the Done stage, without the Again card).

## From v1

Repurpose. `apps/web/src/features/quiz/summary.tsx` (counts, free practice note, Again card) with
`apps/web/src/features/quiz/miss-list.tsx` (each wrong move and its engine cost, checked after the session);
`apps/web/src/features/play/complete-card.tsx` (end of a line or unit); the summaries inside
`apps/web/src/features/speed/speed-page.tsx` and `apps/web/src/features/name-it/name-it-page.tsx`. v2 makes one, with
the live tries table in place of the end-only miss list.
