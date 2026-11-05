# First visit

Home for someone who has never been here: one promise, a board that shows what learning looks like, and one action.
The new player and the improver arrive from a search, a link or a friend, knowing nothing about the site.

## Address

`/`, for everyone: the front door, a splash page. [Today](today.md) is its own page at `/today`; a returning learner
sees a small line with what is due and **Carry on**. `/welcome` shows the same page (for a link in the README or a shared post). No hash state
([../navigation/routes.md](../navigation/routes.md)).

## Reached from

- Typing the site's address, any outside link to `/`.
- The logo in the header while there is no repertoire ([../navigation/menu.md](../navigation/menu.md)).
- [Data](data.md), after "Reset all progress": the site starts again from here.

## Layout

1. [page-shell](../components/page-shell.md) with the full menu; nothing in it is hidden from a newcomer.
2. The promise, one sentence: "Learn what to play in the first moves, why, and what to do when your opponent goes
   wrong." Under it the one action, **Start with a repertoire in two minutes**.
3. The hero: a [board](../components/board.md) in the `thumb` preset playing a short line (the Italian to 4...Bc5, say)
   one move every two seconds, each move's idea beside it as [rich-text](../components/rich-text.md) with its
   [idea-badge](../components/idea-badge.md). Below it, a [move-run](../components/move-run.md) of the line so far.
4. Three short columns, the shape of every step: **Read** the idea, **Try** the moves, **Prove** them on a schedule.
   Each a sentence, no pictures beyond a [board-thumb](../components/board-thumb.md).
5. A quiet line: "No account. Everything stays in this browser, and works offline after this visit." With two small
   links: **Look around first** and **I have a backup**.

On a phone the hero sits under the action, so the button is above the fold
([../patterns/layout.md](../patterns/layout.md)).

## Behaviour

- Nothing is asked and nothing is stored on arrival. The hero loops; it pauses on hover or focus and when reduced motion
  is set, showing the line's last position with its marks
  ([../patterns/accessibility.md](../patterns/accessibility.md)).
- Clicking a move in the hero's run opens a [position-preview](../components/position-preview.md), the same as any move
  chip ([../hooks/use-move-interaction.md](../hooks/use-move-interaction.md)).
- If the database cannot open (another tab has it), the [notice](../components/notice.md) for a taken tab shows instead
  of the action ([../patterns/states.md](../patterns/states.md)).

## Leads to

- **Start with a repertoire** → [onboarding](onboarding.md) (`/start`).
- **Look around first** → [openings](openings.md); the menu works as for anyone.
- **I have a backup** → [data](data.md), on its import card.

## From v1

`features/home/home-page.tsx` (the hero showcase and the courses below it). Verdict: **repurpose**. The showcase line
stays; the course lists go to [openings](openings.md), and the page splits into this one and [Today](today.md).

## Open questions

- components/README.md has no hero component; this page composes it from a `thumb` board and rich text. If Today or
  the openings page want the same loop, it should become a component.

## As built

v1's front page brought up to date: the icon, "Learn chess openings, and actually keep them", a board playing the
Italian's main line by itself with each move's own note (one move every `timing.homeMove`, still for anyone who prefers
no motion), then four cards. Its line comes from the content, so it stays in step.
