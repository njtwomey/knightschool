# Opening intro

An opening's introduction in words: the idea, the risks, who it suits, where it comes from, and the sources it credits.

## Shows

- A summary of two or three sentences at the top.
- Three short parts side by side on a wide screen, stacked on a phone, each with a small icon and a heading:
  **The idea**, **The risks**, **Who it suits**.
- **Origin** (optional): a paragraph of history, folded by default behind "Where it comes from".
- The opening's ideas as [idea-badge](idea-badge.md)s ("Plans and ideas you will meet": Italian bishop, f7 weakness,
  kingside castling, d4 break).
- The [sources-list](sources-list.md) at the foot.
- All text is [rich-text](rich-text.md): moves are [move-chip](move-chip.md)s and named positions can be clicked to show
  them on the page's board.

## Configuration

- `opening`: the opening whose `about`, summary, ideas and sources are drawn.
- `variant`: `full` (the opening page) or `short` (onboarding and the opening card's expanded view: summary and
  "Who it suits" only).
- `board`: the page's board model, when there is one; inline positions and chips then drive it. Without one, a chip
  previews on hover only.
- Reads no settings.

## Behaviour

- Hover a move chip or position link: highlight on the page's board, or a [position-preview](position-preview.md) when
  there is no board. Click: the board goes there ([use-move-interaction](../hooks/use-move-interaction.md)).
- Origin opens and closes in place; its state is not kept in the address.
- An opening with no origin or sources simply leaves those parts out. The three main parts are required by the build,
  so they are never empty.

## Composed of

[rich-text](rich-text.md), [move-chip](move-chip.md), [idea-badge](idea-badge.md), [sources-list](sources-list.md),
[position-preview](position-preview.md).

## Used by

[opening](../pages/opening.md), [onboarding](../pages/onboarding.md) (short), [line](../pages/line.md) (short, for the
opening the line is seen in), [create-opening](../pages/create-opening.md) (preview of Details).

## From v1

Keep. `apps/web/src/features/course/course-intro.tsx` (`CourseIntro`) already draws summary, idea, risks and suits in
three columns, origin folded, and sources, over `RichText` (`apps/web/src/components/rich-text.tsx`). v2 renames it,
adds the ideas row (v1's motifs are listed separately on the course page) and lifts sources into their own component.
