# Knight School

Learn what to play in the first moves of a chess game, why, and what to do when your opponent goes wrong. Free, open
source, and it runs entirely in your browser.

It is live at https://www.nialltwomey.com/knightschool/. This is version 2, built from its plan in
[docs/v2](docs/v2/README.md); version 1 is kept under the tag `v1`.

## Running it

You need Node 24 or later. Then:

```
make install
make dev
```

`make` lists everything else: `make check` (format, lint, types, tests), `make build`, `make ux` (install the shadcn
components).

## Adding openings

Openings are data: a file for each opening in `content/openings`, and a file for each line in `content/lines`.
[docs/v2/making-openings.md](docs/v2/making-openings.md) says what an opening must be, and the
[add-content skill](.claude/skills/add-content/SKILL.md) gives the steps.

## Licence

MIT for this code (see LICENSE). Stockfish is a separate GPL-3.0 program loaded at run time, never bundled.
