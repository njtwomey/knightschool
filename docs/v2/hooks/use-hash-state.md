# useHashState

A page's view state in the address: read once on arrival, written as it changes, so a refresh or a shared link
restores the view.

## Gives

- **state**: the page's fields, each parsed from the hash or given its default;
- **set(patch)**: changes fields; the hash is rewritten with the defaults left out, replacing the history entry.

A sketch: `const [view, setView] = useHashState({ l: line(), m: moves(), z: zoom(1) })`, where each field is a small
parser with a default (moves, a choice of values, a number in a range, free text).

## Takes

A description of the fields: per key, how to read it (dropping a bad value to the default), how to write it, and its
default. Keys and their meaning per page are in [url-state](../navigation/url-state.md).

## Behaviour

- Reads **once**, when the page opens: the page's own writes never feed back, and back and forward between pages read
  again because the page opens again.
- Writes replace, never push, so stepping through moves does not fill the history.
- Leaves out defaults and empty values, so a clear view is an empty hash.
- Old keys can be mapped on read (v1's `v` to `l` on the opening page) and are never written.
- Moves are encoded as UCI joined by dots; an illegal move ends the list rather than failing.
- Never holds anything secret or anything that changes data when opened.

## Used by

Pages: [opening](../pages/opening.md), [variation](../pages/variation.md), [step](../pages/step.md),
[line](../pages/line.md), [openings](../pages/openings.md), [repertoire](../pages/repertoire.md),
[review](../pages/review.md) (`start=due`), [drill](../pages/drill.md), [map](../pages/map.md),
[search](../pages/search.md), [analysis](../pages/analysis.md), [ideas](../pages/ideas.md),
[idea](../pages/idea.md), [stats](../pages/stats.md), [settings](../pages/settings.md),
[line-editor](../pages/line-editor.md). [use-board-model](use-board-model.md) uses it when given `hash`.

## From v1

- `apps/web/src/router/hash.ts` (`parseHash`, `buildHash`, `encodeMoves`, `decodeMoves`) and `router/location.ts`
  (`setHashState`, `readHashState`).
- Each page does it by hand today: `features/search/hash-state.ts` (`filterFromHash`, `hashFromState`),
  `features/course/course-page.tsx`, `features/play/use-play-address.ts` and `resume.ts`, `features/lab/lab-page.tsx`.
