# tree

Lines into the theory tree, an opening's tree built from the lines it selects, walking either, and the map's layout.

## Gives

- **`resolveTree(lines) → TheoryTree`**: reads every line (a PGN file) parents first, following each `[Start "line
move"]` to where it branches, and gives each line its full moves from the start. Refutation variations are kept with
  their position, never put into the tree.
- **`projectOpening(tree, opening) → OpeningTree`** (v1 `projectCourse`): rebuilds each line the opening lists from the
  start and merges them, through **`buildOpening`**, into one EPD-keyed tree: positions, moves with their notes, which
  lines pass through each move, the learner's move (`mine`), and the refutations at each position.
- **Clean positions**: positions after a mistake by the learner's own side are never cards (v1's rule in
  `course-build.ts`).
- **Variations**: `variationOf(opening, line)` and `branchesAt(variation)`, the position where a variation leaves the
  ground before it; a variation's default name is Lichess's name there ([lichess-data](lichess-data.md)).
- **Walking**: `pathFromUcis(tree, ucis, { strict })` (stops at the first move the tree does not have, or throws when
  strict), `walkMoves`, `positionsAlong`, `mainLine`, `transpositions(epd)`, `namedPly` (the ply that names a line),
  `lineName`, `lineSteps`, `continueLine`.
- **`treeGraph(tree)`**: lines and moves as a graph for drawing, positions as `positionId`.
- **The map**: `buildMoveTree` and `prefixId` (nodes keyed by move prefix), `laneLayout` (one column per move, one lane
  per line, the main line on top, later branches nearest, no crossings).
- **Coverage walk**: `reachedPositions(opening, upToMove)`, the positions an opening answers up to move 5, 10 or 15,
  for [training](training.md)'s coverage.

## Takes

[chess](chess.md) (replaying, EPDs), [annotations](annotations.md) (a move's note and refutations from the PGN), the
schemas from [schema](schema.md). Config: `teach.stepMoves` is not read here (steps are [training](training.md)'s).

## Rules

- **Lines are shared, steps are not** (model.md): the tree is the site's; an opening only selects lines from it.
- **One comment per move** across the whole tree; two comments on one move fail the build.
- **One answer per position within an opening**: two different `mine` moves at one position fail the build unless the
  second line is listed under `alternatives`; the tree itself may hold several.
- A line that does not reach its opening's `start`, a `[Start]` naming no line or no move, an illegal move: build
  errors, each naming the file and the move.
- A trap written for the other side flips when an opening of this side lists it (v1's rule).
- A bracketed variation whose first move carries `?` or `??` is a refutation, not a side line; one without is a side
  line, as in v1.
- Line ids are file names and reach learner history; v2 keeps every v1 id (model.md, "What stays fixed").

## Used by

[training](training.md) (cards and steps), [exercise](exercise.md) (scripted replies), [search](search.md) (positions to
lines), [authoring](authoring.md), [judge](judge.md) (Book moves); [catalog store](../stores/catalog.md);
[map-tree](../components/map-tree.md), [map-index](../components/map-index.md),
[line-story](../components/line-story.md), [variation-list](../components/variation-list.md),
[line-row](../components/line-row.md); pages [map](../pages/map.md), [opening](../pages/opening.md),
[variation](../pages/variation.md), [line](../pages/line.md), [step](../pages/step.md); scripts `content-build.ts`,
`doctor.ts`, `gaps.ts`, `course-eval.ts`.

## From v1

- `packages/core/src/content/theory-tree.ts` (`resolveTree`, `parseStart`, `projectCourse`, `treeGraph`, `uciLine`):
  **keep**, renamed (chapter to line, course to opening); refutations kept out of the tree.
- `packages/core/src/content/course-build.ts` (`buildOpening`, clean positions): **keep**; gains refutations and
  variations. `buildQuizzes` moves with questions onto variations.
- `packages/core/src/navigation/content-walk.ts`, `move-tree.ts`, `lane-layout.ts`: **keep**.
- `packages/core/src/content/related.ts` (`relatedCourses`): **keep**, as openings that share lines.
- `reachedPositions`: **new**, from the walk in `scripts/gaps.ts`.

## Tests

The existing `theory-tree`, `course-build`, `move-tree` and `lane-layout` tests stay. New: a refutation variation never
appears as a tree move but is found at its position; variations' branch points; `reachedPositions` by move number;
every build error above with a file and move in its message.
