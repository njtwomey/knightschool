# Today

Home for a returning learner: one button for what matters most now, then what is due, a puzzle, the repertoire at a
glance and a light streak. Comes first in the menu; most visits start and end here.

## Address

`/` once the learner has a repertoire; `/today` always. No hash state. Old v1 `/overview`, `/today` and
`/profile` land here ([../navigation/routes.md](../navigation/routes.md)).

## Reached from

- **Today** in the menu and the logo ([../navigation/menu.md](../navigation/menu.md)); the phone's bottom bar.
- The end of any session: [session-summary](../components/session-summary.md)'s **Back to Today**.
- [Onboarding](onboarding.md) never leads here directly (it opens the first step), but every later visit does.

## Layout

1. [next-action](../components/next-action.md), large, with one line under it saying why: "Review 14 moves
   due", "Continue step 4 of the Italian Game (Try)", "Start step 5: When Black plays 3...Nf6", "The Giuoco Piano
   checkpoint is ready". A [board-thumb](../components/board-thumb.md) of where it starts.
2. Side by side on a wide screen, stacked on a phone:
   - [due-card](../components/due-card.md): moves, questions and game cards due, and "3 of 10 new moves today", so the
     daily limit is visible.
   - [puzzle-card](../components/puzzle-card.md): one puzzle from the learner's openings, matched "through the
     position" to a step they know ([../puzzles.md](../puzzles.md)).
3. **Your repertoire**: one [opening-card](../components/opening-card.md) per slot, each with its
   [mode-counts](../components/mode-counts.md) ("Learn 12/40, Review 6 due, Puzzles 3/15") and
   [progress-ring](../components/progress-ring.md). An empty slot shows **Choose an opening**.
4. [coverage-meter](../components/coverage-meter.md) per side (by move 5, 10, 15 at the learner's band) with the
   [gap-link](../components/gap-link.md) for the biggest gap under it.
5. **Your games**, only when a username is set: "2 of your recent games left your repertoire" with a link.
6. [streak](../components/streak.md) and a small [activity-calendar](../components/activity-calendar.md) of the last
   eight weeks, at the bottom and small: no currency, no leagues, nothing to buy.

## Behaviour

- The main button's choice, in order: reviews when more than a session's worth are due (reviews come before new
  steps); a step in progress; a checkpoint whose steps are all known; the next open step in path order across the
  repertoire's openings, taking turns between them; reviews, if any are due at all; otherwise "All done for today"
  with **Practise anyway** ([../hooks/use-progress.md](../hooks/use-progress.md)).
- Everything is worked out from the answer log on arrival; nothing on the page is stored.
- A step is in progress when its Try is begun and not finished (some of its moves in reviews, not all); the latest
  answered wins and the button opens its Try.
- The coverage meter has one row per opening started: the baked counts begin at each opening's own first position,
  so its shares are of the games that reach the opening (not of every game after 1.e4). "Known" is a move known or
  its step known (tested out included); the outline is what the opening covers. The gap link is the reply met most
  often that the learner cannot answer yet, with the step that teaches it when the opening does; with no map page
  yet, "See it on the map" opens the Board page at the reply.
- The calendar counts every graded answer in the attempts log (Watch is not an answer), tinted by the mode answered
  most that day; the streak above it stays the one streak line.
- With the new-move limit reached, the button never offers a new step; the due card says when more open.
- No repertoire at all: `/` shows [first visit](first-visit.md); `/today` shows an
  [empty-state](../components/empty-state.md) with **Choose a repertoire**.
- Offline: puzzle and coverage come from shipped data and still show; the games line is hidden.

## Leads to

- The main button → [step](step.md), [review](review.md), or [checkpoint](checkpoint.md).
- Due card → [review](review.md) (`/practice/review`, starts at once).
- Puzzle card → [puzzles](puzzles.md) (`/practice/puzzle/<id>`).
- An opening card → [opening](opening.md); a mode count → that mode scoped to the opening.
- Coverage → [repertoire](repertoire.md); the gap link → [map](map.md) at that move.
- Games line → [your games](your-games.md); streak and calendar → [stats](stats.md).

## From v1

`features/home/home-page.tsx` (due count, continue links) and `features/profile/overview/overview-page.tsx` (the
dashboard), with the path's sessions registry (`features/path/sessions`, Next unit) behind the main button. Verdict:
**repurpose**; Overview folds in here and its tab goes.
