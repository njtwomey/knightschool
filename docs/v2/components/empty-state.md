# Empty state

What a list, a panel or a page says when there is nothing in it, and the one thing to do about it. Never a blank box,
never only "No results".

## Shows

- **One sentence on why it is empty**, in the learner's terms.
- **One action** that fixes it, as a button or link; a second, quieter one at most.
- An icon only where it helps recognition (a lock for locked); no illustrations.

## Configuration

- `kind`, which sets the tone and the usual action:

| Kind             | Example                                                                           | Action                 |
| ---------------- | --------------------------------------------------------------------------------- | ---------------------- |
| `new`            | "Your repertoire is empty. Pick an opening for White to start."                   | Choose an opening      |
| `done`           | "Nothing due today. Your next review is tomorrow, 6 moves."                       | Learn the next step    |
| `no-match`       | "Nothing matches 'scotch gambit black'. Try fewer words or clear a filter."       | Clear filters          |
| `not-covered`    | "No opening of yours reaches this position. Step back to go back."                | Step back              |
| `locked`         | "Opens when Step 2 is known. Or take its check to test out."                      | Go to Step 2, Test out |
| `needs-username` | "Your games need your Lichess or Chess.com username."                             | Add it in Settings     |
| `offline`        | "The live explorer needs a connection. Showing the counts shipped with the site." | none                   |

- `text`, `action`: the page's own words and action, within the kind's shape.

## Behaviour

- `done` is good news and reads that way: plain, no exclamation mark, and always offers the next useful thing.
- A filtered list that empties keeps its filters on screen above the message, so the cause is visible.
- An empty part of a board page (no comment on this move, no explorer games) is one muted line inside the part, not a
  card: "No games reach this position at 1000 to 1600."
- Screen readers hear the sentence as a status when a list empties after a filter change.

## Composed of

shadcn `Button`, `Card` (only for a page-sized empty state).

## Used by

[settings-group](settings-group.md), [puzzle-picker](puzzle-picker.md), [page-shell](page-shell.md),
[search-box](search-box.md), [board-search](board-search.md), [board-explorer](board-explorer.md),
[board-notes](board-notes.md), [tries-table](tries-table.md), [due-card](due-card.md); pages [today](../pages/today.md),
[repertoire](../pages/repertoire.md), [review](../pages/review.md), [your-games](../pages/your-games.md),
[create](../pages/create.md).

## From v1

New as a component; the sentences exist, scattered: `features/search/search-page.tsx` ("Nothing matches. Try fewer
words or clear a filter."), `features/search/board-search.tsx`, `features/quiz/summary.tsx` ("Nothing to quiz right
now"), `features/explorer/explorer-panel.tsx`, `features/tree/tree-index.tsx` ("No line matches.").
