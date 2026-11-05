# Review

The spaced-repetition session: the moves, questions, puzzles and game deviations due today, one card at a time. The
core habit; a few minutes a day for anyone with a repertoire.

## Address

`/practice/review`: today's due session, started at once. `/practice/review/<opening>[/<variation>|/lines/<line>]`:
free practice of that material, never saved to the schedule. No hash: a session is not rebuilt from the address; a
refresh starts the due session again with what is still due ([../navigation/url-state.md](../navigation/url-state.md)).
`/practice/review/repertoire`: free practice of what is ticked. `/practice/review/due-all`: every card due, ticked or
not, saved like the due session. v1's `/quiz`, `/review` and `/quiz#start=due` land here.

## Reached from

[due-card](../components/due-card.md) on [Today](today.md) and [practice](practice.md); Today's main button when
reviews come first; the Review count in an opening's [mode-counts](../components/mode-counts.md) (scoped).

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Review.

1. [practice-bar](../components/practice-bar.md): "Due today: 14 cards, one move each" with **Change**, which opens the
   [practice-setup](../components/practice-setup.md) card in its place (source: Due today, your repertoire, everything,
   one opening; weighting, hidden for Due today; moves per question, 1 to 5 or the rest of the line).
2. Two columns from lg (`.board-columns`):
   - [board](../components/board.md) with [board-surface](../components/board-surface.md) and
     [board-controls](../components/board-controls.md) (Hint, Show me).
   - [exercise-panel](../components/exercise-panel.md): what is asked ("Your move as White", "What is the idea of
     4.c3?"), the card's opening and step, tries left; [answer-input](../components/answer-input.md) for typed
     questions; [board-feedback](../components/board-feedback.md) with [verdict-note](../components/verdict-note.md);
     [board-notes](../components/board-notes.md) once answered; the [tries-table](../components/tries-table.md) below.
3. At the end, [session-summary](../components/session-summary.md): right first time, slowest moves, the tries table as
   the record (every guess, its grade, its centipawn cost against the line's move), and what next.

## Behaviour

- **The prompt names what is asked**: a move card says "Find the book move" with the line and step it is from, not
  "step 3"; a sound move that is not the book's is answered as an alternative, never as wrong.
- Board in the `test` preset, `answered` once a card is answered ([../patterns/reveal.md](../patterns/reveal.md)): no
  marks, eval or explorer while asking; the opponent's last move highlighted.
- A session asks the move cards first, then the question cards (the Questions mode's `QuestionRun`, saved to the
  schedule), then puzzle cards. With moves per question above one, a move card plays on along the line of the step
  that teaches it (`runExercise`), stopping at a move the learner has not met; a later move of a run that is due
  itself is not asked again. New cards are always asked one move at a time.
- Card kinds: a move (the position before your move), a question (typed, matched by keyword groups), a puzzle (if
  puzzle cards are agreed), and a game deviation from [your games](your-games.md) ("In your game against ... you
  played 5.d3; the opening plays 5.c3. Find it").
- Right: a tick and on to the next card by itself, the comment kept in the panel until the next move. Wrong: a cross,
  snap back, the verdict and refutation. Two wrong tries reveal the move. A miss, and every typed question once
  answered, waits with **Next** so the explanation can be read
  ([../patterns/feedback-timing.md](../patterns/feedback-timing.md)).
- Grading is automatic (quick and right is Easy) or by hand, by setting; each answer is scheduled with FSRS and logged
  ([../hooks/use-exercise-session.md](../hooks/use-exercise-session.md)). New cards are introduced at the start, up to
  the daily limit, in path order.
- Nothing due: [empty-state](../components/empty-state.md) "Nothing due. Next review in 3 hours", with **Learn the
  next step** and **Practise anyway** (free practice of the repertoire).
- Free practice says so on the bar ("not saved to your schedule").
- With anything ticked, the due session and its new moves are cut to the repertoire
  ([../stores/repertoire.md](../stores/repertoire.md)).

## Leads to

Session summary → [Today](today.md), [practice](practice.md), the [step](step.md) of the most missed move, or
[stats](stats.md); a tries-table row → that position on this board; a card's opening name → [opening](opening.md).

## From v1

`features/quiz` (`quiz-page.tsx`, `store.ts`, `session.ts`, `questions.ts`, `move-view.tsx`, `quiz-view.tsx`,
`summary.tsx`, `miss-list.tsx`). Verdict: **repurpose** onto the exercise session; the end-only miss list becomes the
live tries table.
