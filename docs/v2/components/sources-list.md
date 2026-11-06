# Sources list

The videos, books and articles an opening credits, as a short list of links.

## Shows

- A heading, "Sources", and one row per source: its kind as a small icon (video, book, article, study, database), its
  title, its author or channel, and what the opening took from it ("the plan with c3 and d4") in muted text.
- A line under the list: "Ideas taken from these sources and written in our own words; every claim checked with the
  engine." (The authoring rule in [making-openings](../making-openings.md), said once to the learner.)
- Lichess data and puzzles are not listed here; they are credited once on [credits](../pages/credits.md).

## Configuration

- `sources`: the opening's `sources:` list (title, url, author, note, and a new kind).
- `layout`: `list` (the opening page's foot) or `inline` (one line, "Sources: Hanging Pawns, Chessreps guide", for the
  opening card's expanded view and the line page).
- Reads no settings.

## Behaviour

- Each title is an external link, opening in a new tab, marked as leaving the site.
- Hover a row: the full URL in a [hint](hint.md), so the learner sees where it goes.
- Offline: the links stay but show "needs a connection" on hover.
- No sources: the component draws nothing (no empty heading).

## Composed of

[hint](hint.md), shadcn links and icons.

## Used by

[opening-intro](opening-intro.md), [opening](../pages/opening.md), [credits](../pages/credits.md) (every opening's
sources together), [create-opening](../pages/create-opening.md) (preview while editing Details).

## From v1

Repurpose. The `Sources` function inside `apps/web/src/features/course/course-intro.tsx` lists `course.sources` (from
`sources:` in course.yaml) as links under the introduction. v2 lifts it into its own component, adds the kind icon,
shows the author and note it already holds, and reuses it on Credits.

## Open questions

- v1's `CourseSource` (`packages/core/src/schema/course.ts`) has title, url, author and note; the kind would be
  a new optional field.
