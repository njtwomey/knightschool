# Answer input

A typed answer with suggestions as you type: naming an opening, answering a question in words.

## Shows

- A text box with a placeholder that shows the shape of a good answer ("For example: Caro-Kann, Advance", "Name the
  idea in a few words").
- Up to six suggestions under it as small buttons, best match first, updated as the learner types: opening and
  variation names in Name it, idea names when a question asks for an idea.
- **Answer** and **I don't know**.
- After answering, the box turns read-only and shows the verdict beside it: full credit, half credit ("Right opening,
  the variation is the Advance"), or missed, with the accepted answers listed.

## Configuration

- `suggestions`: the list to suggest from (every opening and variation name, every idea name) or none (a free question
  with keyword grading, where suggesting would give the answer away).
- `grade`: given by the exercise ([use-exercise-session](../hooks/use-exercise-session.md)); the input only collects.
- `placeholder`, `autoFocus` (on by default).
- Reads `access.typedMoves` only to stay out of the way of a typed-move input on the same page (never both focused).

## Behaviour

- Suggestions match as forgivingly as [search-box](search-box.md) does: words run together and small slips are
  allowed ("carokann", "caro kan"). v1 suggests only by the start of each word.
- Up and Down move through suggestions, Tab or Enter on a suggestion fills the box, Enter on the box submits, Escape
  clears suggestions. Typing never triggers the board's arrow keys or other shortcuts
  ([use-shortcuts](../hooks/use-shortcuts.md)).
- Click a suggestion: fills the box, does not submit (a learner may want to add the variation).
- **I don't know** counts as missed and shows the answer, with Next.
- Empty box: Answer is disabled. Submitting is instant; the verdict stays up with Next while there is an explanation.
- On a phone the keyboard opens with the box; suggestions sit above the keyboard.

## Composed of

shadcn `Input` and `Button`, [hint](hint.md).

## Used by

[exercise-panel](exercise-panel.md) (as its slot), [name-it](../pages/name-it.md), [review](../pages/review.md)
(questions in words), [checkpoint](../pages/checkpoint.md).

## From v1

Repurpose. `apps/web/src/features/name-it/name-it-page.tsx` has the input, suggestion buttons from `suggest`
(`packages/core/src/modes/guess.ts`), Answer and "I don't know"; `apps/web/src/features/quiz/quiz-view.tsx` has the
plain input for worded questions, graded by `training/quiz.ts`. v2 makes one component and adds keyboard movement
through the suggestions.
