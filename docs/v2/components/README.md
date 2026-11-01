# Components

Every reusable piece of the v2 interface, one file each. A page (../pages) is built only from these; a component is
built from smaller components and the shared hooks (../hooks). Nothing here is core library code.

Vocabulary: Repertoire → Opening → Variation → Line → Step, plus Idea, Position, Move (../model.md).

## How each file is written

```
# Name
One sentence: what it is.

## Shows            what is on screen, its parts
## Configuration    what a page can set (props), and the settings it reads (../settings.md keys)
## Behaviour        interactions (hover, click, keys, touch), states (loading, empty, locked, error)
## Composed of      the components it uses, as links
## Used by          the components and pages that use it, as links
## From v1          the v1 file it grows from, with a verdict (keep, repurpose, new)
## Open questions   only if there are any
```

Short and concrete: what we want, not how to code it.

## The board

| File                                             | What it is                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [board.md](board.md)                             | The one board: a model plus parts, presets and reveal levels; everything below plugs into it |
| [board-surface.md](board-surface.md)             | The squares and pieces with their layers: last move, marks, system arrows, feedback, dots    |
| [board-controls.md](board-controls.md)           | The control row: settings, flip, steps, Hint, Show me, the page's actions                    |
| [board-settings-menu.md](board-settings-menu.md) | The gear's menu: board look and display, drawn from the settings registry                    |
| [step-buttons.md](step-buttons.md)               | Start, back, forward, end, and the arrow keys                                                |
| [board-eval.md](board-eval.md)                   | The eval bar, the strip with the move's cost, the engine's lines                             |
| [board-explorer.md](board-explorer.md)           | What players at your band play here: share, results, verdict per move                        |
| [board-feedback.md](board-feedback.md)           | The verdict on the last move, why, the refutation to step through, tick and cross            |
| [board-notes.md](board-notes.md)                 | The shown move's comment, ideas, tags and the key to its marks                               |
| [mark-key.md](mark-key.md)                       | What the mark colours mean, only the ones on the board                                       |
| [move-table.md](move-table.md)                   | The moves so far, as a table, inline, or told with comments; bound to the board's cursor     |
| [tries-table.md](tries-table.md)                 | Every guess in a session: move, grade, centipawn cost, time, help used                       |
| [board-thumb.md](board-thumb.md)                 | A small still board for cards, lists and previews                                            |

## Chess pieces of text

| File                                         | What it is                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [move-chip.md](move-chip.md)                 | One move as a button: number, SAN, symbol; hover previews it, click goes there. Every move shown anywhere is one |
| [move-run.md](move-run.md)                   | A run of moves inline ("1. e4 e5 2. Nf3"), made of move chips                                                    |
| [position-preview.md](position-preview.md)   | The hover card: a small board of a position with its name, shown from any chip or link                           |
| [position-card.md](position-card.md)         | A position as a card: thumb, name, how often it is reached, which lines pass through                             |
| [move-explanation.md](move-explanation.md)   | Everything about one move: comment, ideas, verdict, how often played, why not the others                         |
| [verdict-badge.md](verdict-badge.md)         | A grade as symbol and colour (Book, Best, Good, ?!, ?, ??, Miss)                                                 |
| [verdict-note.md](verdict-note.md)           | The one-line why: "A mistake: after ...Nxg5 the knight is lost", with the refutation                             |
| [eval-words.md](eval-words.md)               | Where a position stands, in words and numbers: "White is a little better (+0.6)"                                 |
| [position-features.md](position-features.md) | What is going on in a position: threats, weak squares, hanging pieces, pins; hover lights them on the board      |
| [idea-badge.md](idea-badge.md)               | An idea's name as a chip; hover gives its summary, click its page                                                |
| [kind-badge.md](kind-badge.md)               | A line's kind and risk: main, sideline, rare, gambit, trap to spring, trap to avoid                              |
| [opening-name.md](opening-name.md)           | An opening or variation's name, with its ECO code and Lichess link                                               |
| [rich-text.md](rich-text.md)                 | Written text with move chips, positions and ideas inline                                                         |

## Repertoire and openings

| File                                       | What it is                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| [repertoire-slots.md](repertoire-slots.md) | The learner's repertoire: White, against 1.e4, against 1.d4, each an opening or empty |
| [opening-card.md](opening-card.md)         | An opening in a list: name, side, style tags, mode counts, progress                   |
| [opening-intro.md](opening-intro.md)       | An opening's introduction: idea, risks, who it suits, origin, sources                 |
| [variation-list.md](variation-list.md)     | An opening's variations in order, each with its steps and checkpoint                  |
| [step-row.md](step-row.md)                 | One step in a list: state, its moves, what opens it, Learn and Try                    |
| [line-row.md](line-row.md)                 | One line in a list: name, kind, moves, state                                          |
| [line-story.md](line-story.md)             | A line told in words: its moves with comments, where it branches, what grows from it  |
| [sources-list.md](sources-list.md)         | The videos, books and articles an opening credits                                     |

## Progress

| File                                         | What it is                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| [state-badge.md](state-badge.md)             | Locked, open, learning, known, mastered: one look everywhere                    |
| [progress-ring.md](progress-ring.md)         | Share of moves known and mastered, for a step, variation, opening or repertoire |
| [mode-counts.md](mode-counts.md)             | "Learn 12/40, Review 6 due, Puzzles 3/15", each mode in its colour              |
| [coverage-meter.md](coverage-meter.md)       | How much of what players at your band play you know, by move 5, 10 and 15       |
| [gap-link.md](gap-link.md)                   | The most common reply you do not answer yet, and a way to learn it              |
| [streak.md](streak.md)                       | Days in a row practised                                                         |
| [activity-calendar.md](activity-calendar.md) | Days practised over the past months                                             |
| [next-action.md](next-action.md)             | The one button that says what to do now                                         |
| [due-card.md](due-card.md)                   | Reviews due, and a way into them                                                |

## Practice

| File                                     | What it is                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| [practice-setup.md](practice-setup.md)   | The set-up card: what to practise, weighting, the mode's own choices, Start |
| [practice-bar.md](practice-bar.md)       | The one-line summary above a running session, with Change                   |
| [exercise-panel.md](exercise-panel.md)   | Beside the board in any exercise: the prompt, tries left, help used, Next   |
| [answer-input.md](answer-input.md)       | A typed answer with suggestions (questions, Name it)                        |
| [session-summary.md](session-summary.md) | The end of a session: score, the tries table, what to do next               |
| [puzzle-card.md](puzzle-card.md)         | A puzzle in a list or on Today: thumb, rating, themes, where it comes from  |
| [countdown.md](countdown.md)             | The five-second count before a timed run                                    |

## The map

| File                           | What it is                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| [map-tree.md](map-tree.md)     | The tree of lines: lanes, move pills, zoom; overlays for progress, gaps, the opponent's mistakes |
| [map-index.md](map-index.md)   | The list beside it, shaped like the tree                                                         |
| [map-legend.md](map-legend.md) | What the map's colours and marks mean                                                            |

## Finding

| File                                   | What it is                                                |
| -------------------------------------- | --------------------------------------------------------- |
| [search-box.md](search-box.md)         | A forgiving search with "why it matched"                  |
| [board-search.md](board-search.md)     | Search by setting up a position; transpositions match     |
| [filter-toggle.md](filter-toggle.md)   | Every one-of-several choice and filter                    |
| [sortable-table.md](sortable-table.md) | Tables that sort up, down, then back; rows that are links |

## Settings

| File                                   | What it is                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| [settings-row.md](settings-row.md)     | One setting drawn from the registry: label, control, hint, meaning, source, reset |
| [settings-group.md](settings-group.md) | A titled group of settings rows                                                   |
| [preset-picker.md](preset-picker.md)   | Getting started, Club player, Exam, Relaxed, and "custom"                         |
| [setting-inline.md](setting-inline.md) | A setting offered where it bites ("Too fast? Slow the feedback down")             |

## Creating

| File                                         | What it is                                       |
| -------------------------------------------- | ------------------------------------------------ |
| [move-note-editor.md](move-note-editor.md)   | A move's comment, symbol, ideas and tags         |
| [marks-editor.md](marks-editor.md)           | Drawing arrows and rings: colour, tapping, clear |
| [refutation-editor.md](refutation-editor.md) | Play a wrong move and write why                  |
| [step-editor.md](step-editor.md)             | A step's name, text and which moves it covers    |
| [puzzle-picker.md](puzzle-picker.md)         | Choosing puzzles for a step from the matches     |
| [pgn-import.md](pgn-import.md)               | Bringing in a PGN or a Lichess study             |
| [undo-button.md](undo-button.md)             | Undo, named after the action                     |
| [problems-list.md](problems-list.md)         | What does not build yet, shown where it occurs   |

## Everywhere

| File                             | What it is                                                                |
| -------------------------------- | ------------------------------------------------------------------------- |
| [breadcrumbs.md](breadcrumbs.md) | The trail: root, crumbs that are menus of their siblings, the page's tabs |
| [page-shell.md](page-shell.md)   | A page's frame: header, width, the skeleton while it loads                |
| [hint.md](hint.md)               | A hover or long-press explanation on anything                             |
| [icon-action.md](icon-action.md) | A small icon button with its label as a hint                              |
| [empty-state.md](empty-state.md) | What a list or panel says when there is nothing in it, and what to do     |
| [notice.md](notice.md)           | Messages: saved, problems, offline, the tab taken by another tab          |
