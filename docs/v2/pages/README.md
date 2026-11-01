# Pages

Every page of v2, one file each. A page is built from components (../components) and says what it shows, where it
sits in the menu (../navigation), its address, the state it keeps in the address, and where each part comes from.

## How each file is written

```
# Name
One sentence: what the page is for, and who comes to it.

## Address          path and hash state (../navigation/routes.md)
## Reached from     links and buttons that lead here
## Layout           top to bottom (and side by side on a wide screen), naming components
## Behaviour        what happens on arrival, the main actions, empty and locked states
## Leads to         where its actions go
## From v1          the v1 page it grows from, with a verdict
## Open questions   only if there are any
```

## Arriving and today

| File                             | What it is                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------- |
| [first-visit.md](first-visit.md) | Home for someone new: the promise, the hero, one action                       |
| [onboarding.md](onboarding.md)   | Three questions to a first repertoire                                         |
| [today.md](today.md)             | Home for a returning learner: what to do now, due, a puzzle, streak, coverage |

## Learn

| File                           | What it is                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| [repertoire.md](repertoire.md) | Your repertoire: the slots, coverage per side, the biggest gaps                            |
| [openings.md](openings.md)     | Every opening: filters (side, style, level), opening cards, "what to pick"                 |
| [opening.md](opening.md)       | One opening: introduction, mode counts, variations with their steps, the board, every line |
| [variation.md](variation.md)   | One variation: its steps, lines, ideas and checkpoint                                      |
| [step.md](step.md)             | Learning one step: read, watch, try, their mistakes, done                                  |
| [line.md](line.md)             | One line in words: its moves and comments, branches, other openings that use it            |

## Practice

| File                           | What it is                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------- |
| [practice.md](practice.md)     | The practice hub: every mode, what is due, the set-up card                        |
| [review.md](review.md)         | The spaced-repetition session                                                     |
| [drill.md](drill.md)           | Every branch of a line, variation or opening, the computer replying as players do |
| [puzzles.md](puzzles.md)       | Puzzles from your openings                                                        |
| [play-on.md](play-on.md)       | Play on from a line's end, or after the computer leaves the book                  |
| [checkpoint.md](checkpoint.md) | The test at the end of a variation                                                |
| [speed.md](speed.md)           | Lines against the clock                                                           |
| [name-it.md](name-it.md)       | Name the opening of a position                                                    |
| [your-games.md](your-games.md) | Your Lichess games against your repertoire: where each left it                    |

## Explore

| File                       | What it is                                                                  |
| -------------------------- | --------------------------------------------------------------------------- |
| [map.md](map.md)           | Every line as one tree, coloured by what you know, with gaps                |
| [search.md](search.md)     | Openings, variations, lines and ideas in one search, and board search       |
| [analysis.md](analysis.md) | A free board: play, set up, paste a PGN or FEN, the engine and the explorer |
| [ideas.md](ideas.md)       | Every idea, A to Z and by kind                                              |
| [idea.md](idea.md)         | One idea: what it is, the steps, moves and puzzles that show it             |

## You

| File                       | What it is                                                |
| -------------------------- | --------------------------------------------------------- |
| [stats.md](stats.md)       | Accuracy, misses, time, Speed records, learning over time |
| [settings.md](settings.md) | Presets and every setting, grouped and searchable         |
| [data.md](data.md)         | Export, import, backups, resetting progress               |

## Create

| File                                   | What it is                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------- |
| [create.md](create.md)                 | Your openings: list, new, import, undo, export                             |
| [create-opening.md](create-opening.md) | One opening you write: details, variations, lines, steps, puzzles, publish |
| [line-editor.md](line-editor.md)       | Writing one line: moves, notes, marks, refutations, branching              |

## Other

| File                         | What it is                                             |
| ---------------------------- | ------------------------------------------------------ |
| [credits.md](credits.md)     | Stockfish, Lichess data and puzzles, sources, licences |
| [not-found.md](not-found.md) | An address that leads nowhere                          |
