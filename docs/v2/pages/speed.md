# Speed

Lines played from memory against the clock, the other side answering instantly. For a learner who knows their lines
and wants them automatic.

## Address

`/practice/speed` (the set-up card); `/practice/speed/<opening>[/<variation>]` starts at once;
`/practice/speed/<opening>/rush` is the opening rush (each known step from the start to its end). No hash: a timed
run is not resumed ([../navigation/url-state.md](../navigation/url-state.md)). v1's `/speed` lands here.

## Reached from

The Speed tile on [practice](practice.md); the opening rush on [opening](opening.md) (once a few steps are known);
Speed records on [stats](stats.md) (**Beat it**).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Speed.

1. [practice-bar](../components/practice-bar.md): "Your repertoire, a set of 5 lines, to move 10" with **Change**
   ([practice-setup](../components/practice-setup.md)): source, weighting (favour popular: by the position where the
   line parts from those before it), the run (3, 5 or 10 lines; or 30 s, 1 min, 2 min against the clock), the depth
   (to move 6, 10, 15 or the whole line).
2. [countdown](../components/countdown.md): five seconds with the first line's name, and between lines of a fixed set.
3. Two columns from lg:
   - [board](../components/board.md) with [board-surface](../components/board-surface.md) and
     [board-controls](../components/board-controls.md) (Hint and Show me, each counted as a step of help).
   - The clock large, the line's name, moves made; [board-feedback](../components/board-feedback.md) (tick and cross
     only, no sentence while the clock runs); the [tries-table](../components/tries-table.md) with time per move.
4. At the end, [session-summary](../components/session-summary.md): mean time per move (a set) or moves made (a timed
   run), the personal best for this set-up, the tries table sorted slowest first, **Again**.

## Behaviour

- Board `test`, never `answered` mid-run: nothing is revealed while the clock runs
  ([../patterns/reveal.md](../patterns/reveal.md)). A wrong move costs a cross and the time; two wrong show the move.
  Verdicts and refutations fill in on the summary's tries table after the run.
- Runs are saved to Speed's own records, with no effect on the review schedule.
- Feedback timing is the one place the delays are shortest
  ([../patterns/feedback-timing.md](../patterns/feedback-timing.md)).
- A source with no known steps for a rush: [empty-state](../components/empty-state.md) "Learn a step of this opening
  first", with its next step.

## Leads to

**Again** → a new run with the same set-up; the slowest move → its [step](step.md); records → [stats](stats.md).

## From v1

`features/speed` (`speed-page.tsx`, `store.ts`, opening rush from `features/path/sessions/opening-rush.ts`). Verdict:
**keep**, moved onto the exercise session once it has proved itself; the end table becomes the shared tries table.
