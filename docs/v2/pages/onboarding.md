# Onboarding

Three questions, each skippable, that end in a first repertoire and an open first step. For the new player who has never
heard of a repertoire and the improver who wants to start clean.

## Address

`/start`. The hash keeps which question is showing and the answers so far, so a refresh or the back button lands on the
same question: `#q=level|white|black&band=new|some|club&white=<opening>&e4=<opening>&d4=<opening>`
([../navigation/url-state.md](../navigation/url-state.md)). Nothing is saved until the last screen.

## Reached from

- [First visit](first-visit.md): **Start with a repertoire**.
- [Openings](openings.md): **No idea what to pick?** (jumps to the side asked about, `#q=white` or `#q=black`).
- [Repertoire](repertoire.md): an empty slot's **Help me choose**.

## Layout

One question per screen, a progress line ("2 of 3") and **Skip** on each, inside
[page-shell](../components/page-shell.md) with the menu hidden behind a small **Leave** link (nothing is lost; the
answers sit in the hash).

1. **How much do you play?** A [filter-toggle](../components/filter-toggle.md) of three: New to the game, A few hundred
   games, A club player. A [hint](../components/hint.md) on each says what it changes: the explorer band, the suggested
   openings and the starting preset ([../settings.md](../settings.md): Getting started or Club player).
2. **As White, what do you want?** Two or three [opening-card](../components/opening-card.md)s, each with one line from
   its `about.suits` ("solid and simple", "sharp, with traps") and a [board-thumb](../components/board-thumb.md) of its
   first named position. Under them, **Show me what I already play**: a username field with a choice of site, Lichess or
   Chess.com.
3. **As Black, against 1.e4 and against 1.d4?** The same, two rows of cards.
4. **Your repertoire**: [repertoire-slots](../components/repertoire-slots.md) filled with the choices, each slot's first
   step named, and the one action **Start step 1 of the Italian Game**.

## Behaviour

- A card is chosen with a click; the choice is ticked and **Next** appears. Choosing nothing and pressing **Skip**
  leaves the slot empty.
- **Show me what I already play** reads the username's last 50 public games from Lichess or Chess.com (from the browser,
  no token needed), counts the openings they reached at each slot, and puts the closest match first with "you played
  this in 18 of 50 games". A username that does not exist, or no network, says so in one line and the cards stay as they
  were. The username is saved to settings (`lichess.username` or `chessdotcom.username`) for [your games](your-games.md)
  only if the learner ticks "keep it".
- On the last screen everything is saved at once: the band, the preset, the repertoire, the username if kept. Then the
  step opens; the learner never meets an empty Today.
- If every question was skipped, the last screen offers [openings](openings.md) instead of a step.

## Leads to

- **Start step 1** → [step](step.md) (`/openings/<opening>/step/1`).
- Skipped everything → [openings](openings.md).
- **Leave** → back where they came from, answers kept in the hash.

## From v1

New. v1 enrols one course at a time from the course page (`features/courses/enrol-button.tsx`, the list in
`data/training-settings.ts`); onboarding writes the same list, now the repertoire.

## Open questions

- Which two or three openings are suggested per slot depends on the first catalogue ([decisions](../decisions.md),
  Content).
