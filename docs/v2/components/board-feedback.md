# Board feedback

The verdict on the move just played, and why, kept next to the board and tied to the move it is about.

## Shows

- **Right move**: the tick on the board, a [verdict-badge](verdict-badge.md) (usually Book), and the move's comment,
  which stays until the learner's next move.
- **Wrong move**: the cross and snap back, the badge (Inaccuracy, Mistake, Blunder), the
  [verdict-note](verdict-note.md) ("A mistake: after ...Nxg5 the knight is lost"), the author's note on that wrong move
  when there is one, and **Show why** to step through the refutation.
- **As good, but not the line's move**: no cross and no try used; the badge keeps its grade (Good or Excellent) with
  the flag "not your repertoire move", the note says "Excellent, but not your repertoire move: this opening plays 4.c3",
  and the learner is asked for the line's move ([capabilities](../capabilities.md) section 2).
- **Opponent's mistake**: "Black's ...g5? is played in about a quarter of games at your level, and loses a piece. Find
  the punishment." The move is marked on the board in its verdict colour.
- **Missed punishment** (Miss): what the punishing move was, with Show why.
- Tries left, and help used, in one quiet line.

## Configuration

- From the model: the feedback for the move at the cursor (not only the latest), the reveal level.
- From the session ([use-exercise-session](../hooks/use-exercise-session.md)): tries left, whether Next is needed.
- Settings read: `feedback.explain` (symbol only, a sentence, or the refutation on the board), `feedback.speed`,
  `feedback.sounds`.

## Behaviour

- **Connected to the board.** The symbol and colour in the panel are the ones on the target square; hovering the panel
  lights the move's squares; the refutation arrow is drawn while the note is shown. Step back to an earlier move and the
  panel shows that move's feedback; step to a move with none and it is empty.
- **Show why** puts the refutation on the model as a side branch: the step buttons walk it, each move with its verdict,
  and "Back to the line" returns. It opens folded in the [move-table](move-table.md) too.
- **Timing** ([feedback-timing](../patterns/feedback-timing.md)): a right move never waits for a click; play carries
  on. A miss with something to read stays up with **Next**. The verdict may arrive a moment after the cross (the
  judgement's live layer); it fills in without moving anything else.
- On a phone it sits directly under the controls, above everything else.
- Announced to screen readers as it changes (polite).

## Composed of

[verdict-badge](verdict-badge.md), [verdict-note](verdict-note.md), [move-run](move-run.md), [rich-text](rich-text.md),
[idea-badge](idea-badge.md).

## Used by

[board](board.md) on [step](../pages/step.md) (Try, Their mistakes), [review](../pages/review.md),
[drill](../pages/drill.md), [puzzles](../pages/puzzles.md), [play-on](../pages/play-on.md),
[checkpoint](../pages/checkpoint.md), [your-games](../pages/your-games.md).

## From v1

New as a panel. The tick and cross badge come from `apps/web/src/components/board/app-board.tsx` (`BoardBadge` in
`shapes.ts`); the verdict from core `training/regret.ts`; the sentences from core `explain/explainers.ts` (author,
motif and engine explainers; the engine's sentences are never shown in v1); the timings from `lib/feedback.ts`
(`FEEDBACK_DELAYS`). The quiz's answer card (`features/quiz/move-view.tsx`) is the closest v1 has.
