# Knight School

Learn what to play in the first moves of a chess game, why, and what to do when your opponent goes wrong. Free, open
source, and it runs entirely in your browser.

This branch is version 2, built from scratch from its plan in [docs/v2](docs/v2/README.md). Version 1 is on `main` and
live at https://www.nialltwomey.com/knightschool.

## Running it

You need Node 24 or later. Then:

```
make install
make dev
```

`make` lists everything else: `make check` (format, lint, types, tests), `make build`, `make ux` (install the shadcn
components).

## Licence

MIT for this code (see LICENSE). Stockfish, when it is added, is a separate GPL-3.0 program loaded at run time, never
bundled.
