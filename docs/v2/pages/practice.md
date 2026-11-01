# Practice

The practice hub: every way to test what you know, what is due in each, and one set-up card behind them all. For the
returning learner who wants to choose for themselves rather than take Today's button.

## Address

`/practice`. Each mode has its own page below it: `/practice/review`, `/practice/drill`, `/practice/puzzles`,
`/practice/play-on`, `/practice/speed`, `/practice/name-it`, `/practice/your-games`. A mode's address can carry a
**scope** that starts at once: `/practice/<mode>/<opening>`, `/practice/<mode>/<opening>/<variation>` or
`/practice/<mode>/<opening>/lines/<line>`. Without one, the mode opens on its set-up card with the last choice saved.
No hash on the hub ([../navigation/routes.md](../navigation/routes.md)). v1's `/quiz` and `/review` lead to Review.

## Reached from

**Practice** in the menu and the phone's bottom bar ([../navigation/menu.md](../navigation/menu.md)); Today's
**Practise anyway**; any [session-summary](../components/session-summary.md)'s **Practise something else**.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Practice, with the modes as the trail's tabs
([../navigation/trails.md](../navigation/trails.md)).

1. [due-card](../components/due-card.md) at the top, wide: "14 due: 10 moves, 2 questions, 2 from your games" and
   **Review now**. Nothing due: when the next ones are.
2. One tile per mode, in this order, each in its mode colour ([../patterns/colours.md](../patterns/colours.md)) with one
   line of what it is and a count:
   - **Review**: the moves and questions due, on your schedule.
   - **Drill**: every branch, the computer replying as 1000 to 1600 players do.
   - **Puzzles**: tactics from your openings; "3 new from the Italian".
   - **Play on**: five more moves from a line's end; or the computer leaves the book.
   - **Speed**: lines against the clock; your best time.
   - **Name it**: which opening is this.
   - **Your games**: where your Lichess games left your repertoire; "2 new".
   - **Checkpoints**: the variations whose checkpoint is ready, each a link.
3. **Per opening**: the repertoire's [opening-card](../components/opening-card.md)s with
   [mode-counts](../components/mode-counts.md), so a mode can be started for one opening in one click.

## Behaviour

- A tile opens its mode's page on the [practice-setup](../components/practice-setup.md) card with the saved choice;
  nothing starts until **Start**. Review is the exception: it starts today's due session at once, as v1's
  `#start=due` did, with **Change** on its [practice-bar](../components/practice-bar.md).
- A mode count on an opening card opens that mode scoped to the opening and starts at once.
- Counts are derived on arrival ([../hooks/use-progress.md](../hooks/use-progress.md)). Your games shows **Add your
  username** when none is set. With no repertoire, sources default to "everything" and the hub says so.

## Leads to

[review](review.md), [drill](drill.md), [puzzles](puzzles.md), [play-on](play-on.md), [speed](speed.md),
[name-it](name-it.md), [your-games](your-games.md), [checkpoint](checkpoint.md).

## From v1

No hub in v1: Quiz, Speed and Name it were separate menu items sharing `components/practice-setup.tsx` and
`data/practice-config.ts`. Verdict: **new** page; the set-up card and its saved choices are kept as they are.
