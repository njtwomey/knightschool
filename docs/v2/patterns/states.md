# States

Loading, empty, locked, error, offline and another tab look and behave the same on every page and part, and each one
says what it offers next.

## The rule

| State             | Looks like                                                                                                                                               | Offers                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Loading**       | A skeleton in the shape of what is coming, after about 300 ms (never a flash). A board shows its position at once; only its panel waits.                 | nothing; it resolves by itself              |
| **Arriving late** | A part that fills in later (a verdict, an engine score, explorer numbers) shows a muted placeholder ("judging...") in its final place, so nothing jumps. | play carries on; it never waits for it      |
| **Empty**         | An [empty-state](../components/empty-state.md): one sentence why, in the learner's terms.                                                                | one action that fixes it                    |
| **Locked**        | Muted, with the lock icon ([state-badge](../components/state-badge.md)); still visible and readable.                                                     | what unlocks it, a link there, and Test out |
| **Error, a part** | The part says what failed in one line; the rest of the page works ("The engine could not start. The baked evaluation is shown.").                        | Try again                                   |
| **Error, a page** | The page area is replaced by "This page could not be shown"; header and menu stay.                                                                       | Reload, and the details in a fold           |
| **Offline**       | A site [notice](../components/notice.md); everything shipped works. Parts that need Lichess say "Needs a connection" and show baked data where any.      | nothing to do; it clears when back online   |
| **Another tab**   | The paused notice; the page stays readable, anything that saves is disabled with the reason on hover.                                                    | Use it in this tab                          |
| **No database**   | A private window or a browser without OPFS: a notice, "Progress cannot be saved in this window"; learning still works for the visit.                     | how to fix it, and Export before leaving    |

- **Locked is never a dead end.** Clicking a locked step or variation opens it with "Pass Step 2 first" and two
  buttons: go to Step 2, or Test out. Starting a later step once asks "Start here anyway?" (experience.md).
- **A failed load retries once by itself** after a moment, then shows Try again; content loaded once is never fetched
  twice.
- **Errors say what to do in plain words**, never a code alone, and never blame the learner.
- **One state at a time per part**: a list that is loading is not also empty; an offline explorer is not also an error.

## Where it applies

Every page through [page-shell](../components/page-shell.md) (its gate, skeleton and error), every board part
([board-eval](../components/board-eval.md), [board-explorer](../components/board-explorer.md),
[board-feedback](../components/board-feedback.md)), every list, and every hook that loads
([use-async](../hooks/use-async.md), [use-judgement](../hooks/use-judgement.md),
[use-explorer](../hooks/use-explorer.md)).
Sessions add their own phases (loading, running, finished, error) on top, through
[use-exercise-session](../hooks/use-exercise-session.md).

## From v1

- `apps/web/src/components/page-fallback.tsx` (`PageFallback`, `PageSuspense`): the skeleton.
- `components/error-boundary.tsx`: a page that fails keeps the header and menu, reset by moving away.
- `app/header.tsx` (`PausedBanner`, "Use it in this tab"): another tab.
- `data/fetch-content.ts` (`onceRetryable`), `hooks/use-async.ts` (`{ data, error, loading }`): loading once, retrying.
- `lib/session.ts` (`SessionPhase`, `sessionLoader`): a session's loading and error phases.
- `features/create/shell.tsx` (`AuthorGate`): a page gated on the database, saying why it cannot open.
- `features/path/unit-state.ts`: locked, with "Pass the unit it grows from first."
- v1 has no offline notice and no "no database" notice; the service worker makes it work offline silently.
