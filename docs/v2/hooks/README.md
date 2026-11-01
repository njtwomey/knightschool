# Hooks

The shared behaviour behind the components: one hook per kind of interaction or data, so a move chip, a table row and
a map pill all hover, preview and click the same way. React hooks in the web app; none of this is core library code.

| File                                               | What it does                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [use-board-model.md](use-board-model.md)           | Creates a board's model: moves, cursor, orientation, mode, reveal level, feedback                |
| [use-board.md](use-board.md)                       | Reads the nearest board model from context (for the board's parts)                               |
| [use-move-interaction.md](use-move-interaction.md) | Hover, focus, click and long-press on a move anywhere: highlight on the board, preview, go there |
| [use-position-preview.md](use-position-preview.md) | Opens and places the position preview card, with a delay, one at a time                          |
| [use-setting.md](use-setting.md)                   | Reads and writes a setting through the registry's layers, saying where the value came from       |
| [use-exercise-session.md](use-exercise-session.md) | Runs a session of exercises: grade, feed back, record, next                                      |
| [use-judgement.md](use-judgement.md)               | The verdict on a move: author, then baked, then live, arriving when known                        |
| [use-explorer.md](use-explorer.md)                 | What players play at a position: baked first, the live explorer with the learner's token after   |
| [use-progress.md](use-progress.md)                 | States of a step, variation, opening and repertoire, derived from the answers                    |
| [use-hash-state.md](use-hash-state.md)             | A page's view state in the address, written as it changes, read once on arrival                  |
| [use-shortcuts.md](use-shortcuts.md)               | Registers keys for a page; one owner per key; never while typing                                 |
| [use-async.md](use-async.md)                       | Loads anything once with loading and error states (v1's `useAsync`)                              |
