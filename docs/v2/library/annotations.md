# annotations

A move's note, read from and written back to PGN: its text, symbol, marks, tags and ideas; refutations; and rich text
(written prose with moves and positions inline).

## Gives

- **`Note`**: `{ text?, nag?, arrows?, circles?, tags?, ideas? }`
  ([../schemas/annotations.md](../schemas/annotations.md)); everything optional, an empty note left out.
- **`readNote(pgnMove) → Note`**: from a parsed move ([chess](chess.md) `parsePgn`): the comment's words, its NAGs,
  `[%cal]` arrows and `[%csl]` rings, and our own `[%tag ...]` and `[%idea ...]` commands, stripped from the text.
- **`writeNote(note) → { comment, nags }`**: the reverse, in a fixed order (text, then marks, then tags, then ideas), so
  a line saved from Create diffs cleanly against the hand-written file.
- **Symbols**: `nagSymbol(nag)` and `symbolNag(symbol)` for `!` 1, `?` 2, `!!` 3, `??` 4, `!?` 5, `?!` 6; `isBadNag`.
- **Marks**: `MARK_COLOURS` (G, R, Y, B) and `MARK_MEANINGS` (Idea, Threat, Target, Support); `parseArrow`,
  `parseCircle`, `toggleArrow`, `toggleCircle`, `cleanMarks`, `markColours` (the colours a move uses, for the key).
- **Refutations**: `readRefutations(pgnMove) → Refutation[]`: each bracketed variation whose first move carries `?` or
  `??`, as `{ uci, nag, text, then }` on the position it starts from; `writeRefutation` for Create.
- **Rich text**: `parseRichText(text) → RichSegment[]` (words, `{1. e4 e5 2. Nf3}` move runs, positions, idea links),
  `plainText`, `positionOf`, `checkRichText` (every move legal, every idea known).
- **Tags**: `MOVE_TAGS` (tip, trap, common mistake) plus any word.

## Takes

[chess](chess.md) (PGN, replaying a refutation or a move run). The idea ids from `ideas.yaml` for checking, passed in.

## Rules

- **One note per move**, across all lines: the build fails on two comments for one move (in the tree, or an authored
  line clashing with a shipped one, which is left out with a problem).
- **Colours mean one thing everywhere**: G Idea, R Threat, Y Target, B Support. Any other letter fails the build. One to
  three marks per move.
- **The author's symbol wins** over the engine's grade ([judge](judge.md)); a move without one is graded by the engine.
- **A refutation is never a line**: never drilled, never part of the tree, shown only when someone plays that move.
  A variation whose first move has no `?` is a side line.
- **Only what a person must say is written.** Costs, names, how often a move is played, threats and weak squares are
  worked out ([eval](eval.md), [features](features.md), [lichess-data](lichess-data.md)), never written into a note.
- Text is plain and neutral, one or two sentences (patterns/wording); rich-text move runs must be legal from where they
  start.
- `motifs` in v1 notes are read as `ideas`, so old content and authored rows still load.

## Used by

[tree](tree.md) (notes on moves, refutations at positions), [judge](judge.md) (author layer), [explain](explain.md)
(the author's sentence), [authoring](authoring.md) (writing notes back); [board-notes](../components/board-notes.md),
[mark-key](../components/mark-key.md), [rich-text](../components/rich-text.md),
[move-note-editor](../components/move-note-editor.md), [marks-editor](../components/marks-editor.md),
[refutation-editor](../components/refutation-editor.md), [board-feedback](../components/board-feedback.md),
[line-story](../components/line-story.md), [idea-badge](../components/idea-badge.md); `scripts/content-build.ts`.

## From v1

- `packages/core/src/content/marks.ts`: **keep**.
- `packages/core/src/content/rich-text.ts`: **keep**, gains idea links.
- `packages/core/src/chess/pgn.ts` (`[%tag]` reading, `PgnNote`, `noteToMove`): **keep**; `[%idea]` and refutations are
  **new**.
- `packages/core/src/authoring/chapter-edit.ts` (`setMoveNote`, `setMoveMarks`, `MOVE_TAGS`): the writing half moves
  here, used by [authoring](authoring.md).
- `packages/core/src/content/tags.ts`: **repurpose**; line kinds stay, motif tags become ideas.

## Tests

- Round trip: `writeNote(readNote(x))` gives back the same comment for every note in `content/`.
- Each NAG to symbol and back; unknown colours rejected; more than three marks rejected.
- Refutations: `?` and `??` first moves become refutations, others side lines; `then` replays legally.
- Rich text: move runs from a position, an unknown idea, an illegal move in a run.
