# Stores

The web app's state, one file each: what it holds, who writes it, who reads it, where it persists. (A store is shared
state that outlives one component; the board model is per board and lives in context instead.)

| File                           | Holds                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| [settings.md](settings.md)     | Every setting's value per layer and store (device, learner, secret)                      |
| [repertoire.md](repertoire.md) | The learner's chosen openings and their slots                                            |
| [catalog.md](catalog.md)       | The openings, variations, lines and ideas available, shipped and authored                |
| [progress.md](progress.md)     | Cards, answers and derived states                                                        |
| [session.md](session.md)       | The exercise session running now: queue, current exercise, tries, results                |
| [judgement.md](judgement.md)   | Verdicts and evaluations known so far, from baked analysis and the browser engine        |
| [engine.md](engine.md)         | The browser engine: one search at a time, its cache                                      |
| [explorer.md](explorer.md)     | Explorer answers, cached for 30 days, one request at a time                              |
| [puzzles.md](puzzles.md)       | The puzzles shipped for the learner's openings, and their cards                          |
| [games.md](games.md)           | The learner's Lichess and Chess.com games read so far and where each left the repertoire |
| [authoring.md](authoring.md)   | Openings being written, with history and undo                                            |
