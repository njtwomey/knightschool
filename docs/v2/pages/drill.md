# Drill

Every branch of a line, a variation or an opening, the learner playing their side and the computer choosing replies
as players at their level do. For proving a whole tree, not one card at a time.

## Address

`/practice/drill` (the set-up card), `/practice/drill/<opening>`, `/practice/drill/<opening>/<variation>`,
`/practice/drill/<opening>/lines/<line>` (start at once). Hash: `#m=<moves played>` for the game in progress, so a
refresh resumes the branch ([../navigation/url-state.md](../navigation/url-state.md)). v1's
`/play/<course>/all/branches` and `/play/<course>/<line>/drill` land on the matching scope.

## Reached from

The Drill tile on [practice](practice.md); **Drill** on [opening](opening.md), [variation](variation.md) and
[line](line.md); the Drill count in [mode-counts](../components/mode-counts.md); a [map](map.md) move's **Try**.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice › Drill › (opening, a menu).

1. [practice-bar](../components/practice-bar.md): "Italian Game, every branch, replies as 1000 to 1600 players play"
   with **Change** ([practice-setup](../components/practice-setup.md): source, weighting, the responder: as written,
   as players play, or the least-known branch first).
2. Two columns from lg:
   - [board](../components/board.md) with [board-surface](../components/board-surface.md),
     [board-controls](../components/board-controls.md) (Hint, Show me, **Restart branch**) and a caption ("Black
     chose 3...Nf6, played in 41% of games at your band").
   - [exercise-panel](../components/exercise-panel.md), [board-feedback](../components/board-feedback.md) with
     [verdict-note](../components/verdict-note.md), [move-table](../components/move-table.md) of the branch so far, and
     the [tries-table](../components/tries-table.md) for the whole drill.
3. At the end of each branch: where it leaves you as [eval-words](../components/eval-words.md), and **Next branch** or
   **Play on from here**. At the end of the drill, [session-summary](../components/session-summary.md): branches
   covered, moves right first time, the tries table.

## Behaviour

- Board `test`, `answered` after each move. The computer's reply is a weighted random choice among the opening's
  known replies by how often players at the band play them, and the caption says so; with "least-known first", it
  steers to branches holding the learner's weakest moves.
- Right moves carry on with no click; a wrong move snaps back with its verdict; two wrong tries show the move with
  **Next**. When the opponent's reply is a known mistake, the board says so and the next move is the punishment.
- Answers feed the same cards as review ([../hooks/use-exercise-session.md](../hooks/use-exercise-session.md)); Drill
  never introduces cards it would not introduce in a step.
- The drill ends when every branch in scope has been played once, or the learner stops; **Stop** shows the summary.
- A scope with no learnable moves (an alternative only): [empty-state](../components/empty-state.md) with its line page.

## Leads to

**Play on from here** → [play-on](play-on.md) from that position; summary → [Today](today.md), [practice](practice.md),
the [step](step.md) holding the most missed move; a tries-table row → that position.

## From v1

`features/play` in drill and branches modes (`play-page.tsx`, `store.ts`, `record.ts`; `nextBranchMove` in core's
`training/branches.ts`). Verdict: **repurpose** onto the exercise session, with the responder named on screen.
