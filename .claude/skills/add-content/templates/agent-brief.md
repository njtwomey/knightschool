Add one opening to Knight School, in the main checkout at the repo root, on branch `v2`. No worktree.

First read `CLAUDE.md`, under Content, and follow `.claude/skills/add-content/SKILL.md`, including **Working alongside
others**. The standard, including the size and link lines, is `docs/v2/making-openings.md`. Match
`content/openings/ruy-lopez-white.yaml` and its lines.

- **Opening:** id `<id>`, name "<name>", start `<moves>`, for <side>.
- **Folder:** `content/lines/<first move>/<opening>/`, line ids prefixed `<prefix>-`.
- **Size:** <number> lines, counting short links.
- **Scope:** <what to rank with the data, and what must be recognisably there>.
- **Sources:** <v1 folder under `.content/`, or none>. A starting point, not an authority.
- **Track:** `<track>` in `content/tracks.yaml`.

No browser checks of any kind; the user checks the browser. Never run `git add -A`, `git commit`, `git stash` or
`git checkout -- …`; the lead commits. Never read or print `.env`. Don't touch `apps/`, `packages/` or `scripts/` unless a
real bug blocks you; then keep it minimal and say so. Scratch files go in the session scratchpad.

Done means `content:build`, `make popularity`, the analysis, `content:build`, `content:check` and `make doctor` pass for
your opening. Report as step 7 of the procedure says, with coverage at moves 5, 8 and 10.
