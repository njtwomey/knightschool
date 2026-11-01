# Variation

One named branch of an opening ("The Two Knights Defense, when Black plays 3...Nf6"): the decision it is about, its
steps in order, its lines, its ideas and puzzles, and the checkpoint that opens the next variation. For a learner
deciding where to go inside an opening, or coming back to one part of it.

## Address

`/openings/<opening>/<variation>`. `<variation>` is a slug from the variation's Lichess name (`two-knights`). Hash:
`#m=<uci.uci...>` for the board ([../navigation/url-state.md](../navigation/url-state.md)).

## Reached from

- [Opening](opening.md): a variation's name in the variation list.
- The variation crumb on [step](step.md), [checkpoint](checkpoint.md) and [line](line.md) pages
  ([../navigation/trails.md](../navigation/trails.md)).
- [Search](search.md) results of kind variation.

## Layout

[breadcrumbs](../components/breadcrumbs.md): Learn › opening › (variation, a menu of the opening's variations).

1. Heading: [opening-name](../components/opening-name.md) with ECO, [state-badge](../components/state-badge.md) (locked,
   open, learning, known once its checkpoint is cleared, mastered) and [progress-ring](../components/progress-ring.md).
2. Two columns from lg:
   - Left: the introduction, two or three sentences as [rich-text](../components/rich-text.md), with the decisive
     position as a clickable inline board. Then its steps, each a [step-row](../components/step-row.md) (state, moves,
     what opens it, **Learn** and **Try**). Then the checkpoint row: what it asks (about ten exercises), its state, and
     **Take the checkpoint** or **Test out**.
   - Right: a [board](../components/board.md) in the `study` preset on the variation's branch point, with
     [board-controls](../components/board-controls.md), [board-notes](../components/board-notes.md),
     [board-explorer](../components/board-explorer.md) (how often players at the band reach and choose this) and
     [mark-key](../components/mark-key.md).
3. **Lines**: its [line-row](../components/line-row.md)s with [kind-badge](../components/kind-badge.md)s, main line
   first.
4. **Ideas** shown in its steps, as [idea-badge](../components/idea-badge.md)s.
5. **Puzzles**: up to three [puzzle-card](../components/puzzle-card.md)s matched at the named-variation level.

## Behaviour

- A locked variation still shows everything; its steps say "opens when the Giuoco Piano checkpoint is cleared", and
  **Test out** takes this variation's checkpoint at once. Opening a locked step asks once per opening, as on the opening
  page.
- Hovering a step row puts the board on where that step starts; clicking a move in the introduction does the same.
- When every step is known the checkpoint row becomes the page's main action.
- An unknown variation in a known opening goes to [not found](not-found.md), which offers the opening.

## Leads to

[step](step.md) (Learn: from Read; Try: straight to the Try stage), [checkpoint](checkpoint.md)
(`/openings/<opening>/<variation>/checkpoint`), [line](line.md), [idea](idea.md), [puzzles](puzzles.md)
(`/practice/puzzles/<opening>/<variation>`), [drill](drill.md) (`/practice/drill/<opening>/<variation>`).

## From v1

A course line's `section`, shown only as groups on the course page (`features/course/lines-table.tsx`) and in Create.
Verdict: **new** page; the grouping is repurposed and gains a name, an introduction and a checkpoint.
