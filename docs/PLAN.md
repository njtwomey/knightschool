# Knight School: architecture and build plan

Oct 13, 2026 · @NT

> Repo copy of the plan doc. Changed from the doc since it was written: `LineNode` is now a position with `moves` (edges), because a node keyed by EPD cannot carry one `san` when lines transpose; `Annotation` is declared before use and `datetime()` is `z.iso.datetime()` (Zod 4); openings are authored as one folder per opening
> with one PGN per variant, split into lines/ and refutations/, and structured variant tags (Data model, Opening content, Phase 2); versions actually pinned
> in Phase 1 are noted under Library choices; the CLAUDE.md starter now lives at the repo root.

## Answer

Build a static React site in four layers: a pure-TypeScript core (openings, line trees, scheduling, explanation), an engine package that runs Stockfish 19 in a Web Worker, a storage package that keeps a SQLite database inside the browser, and a thin shadcn/Tailwind UI that renders a react-chessboard board. Every part is open source and needs no server: Stockfish.js lite single-threaded (about 2 MB), chess.js for rules, @mliebelt/pgn-parser for PGN trees with variations, ts-fsrs for FSRS-6 scheduling, the Lichess chess-openings list (CC0) for names, the Lichess opening explorer (behind your own free token, cached) for what people at the learner's level play, and @sqlite.org/sqlite-wasm for persistence with one-click export.

The site's own code can be MIT. Board, rules and parser are MIT, BSD-2-Clause and Apache-2.0 respectively. Stockfish is GPL-3.0, and the usual way MIT apps ship it is the one used here: the engine files sit in public/engine/, are fetched at runtime into a Worker, and the app talks to them only over UCI text messages, never importing or bundling the code; the credits page links the source. That is the common reading of the GPL for a separate program, not legal advice. If you ever want the Lichess board (Chessground) or rules library (chessops), both GPL, the layering makes it a one-package swap and the site becomes GPL at that point.

No React library explains move quality. The explainer is built here: a rule-based motif detector on chess.js (hanging piece, fork, pin, skewer, mate threat), an engine-delta layer from Stockfish, and hand-written annotations in the opening files, all behind one interface so an LLM provider can be added later without touching the UI.

## Architecture

```
apps/web (UI)  React 19, Tailwind, shadcn/ui, lucide, react-chessboard, Zustand
   |               |                 |                       |
   v               v                 v                       |
packages/engine  packages/storage  content/ (data files)     |
Stockfish 19     sqlite-wasm       one folder per opening    |
UCI client       Drizzle schema    Lichess openings TSV      |
   |               |                 |                       |
   v               v                 v                       v
packages/core  chess.js rules, repertoire tree keyed by EPD, ts-fsrs,
               explainer, quiz matcher, Zod schemas. No React, no DOM, no I/O.
```

Arrows point from the importer to the imported package. The core knows nothing about React, the DOM, Workers or storage; engine and storage know the core's types; the UI is the only place the three meet.

Import rules, enforced with eslint-plugin-boundaries so Claude Code cannot drift:

| Package | May import | Must not import |
| --- | --- | --- |
| packages/core | chess.js, @mliebelt/pgn-parser, ts-fsrs, zod | react, any DOM API, engine, storage, ui |
| packages/engine | core (types only), stockfish | react, storage, ui |
| packages/storage | core (types only), @sqlite.org/sqlite-wasm, drizzle-orm | react, engine, ui |
| apps/web | core, engine, storage, react, shadcn, react-chessboard | nothing else is off limits |
| content/ | (data, not code) | validated at build by core's Zod schemas |

A pnpm workspace with four packages keeps the boundaries physical rather than conventional. If a single Vite app feels lighter, keep the same folder names under src/ and the same lint rule; the point is that core can be unit-tested with no browser and swapped into a server later unchanged.

## Library choices

Versions are what the npm registry served on 13 October 2026; pin them in package.json and let Claude Code bump deliberately.

| Role | Package | Version | Licence | Why this one |
| --- | --- | --- | --- | --- |
| Board | [react-chessboard](https://www.npmjs.com/package/react-chessboard) | 5.1.0 | MIT | Native React component on dnd-kit: drag and drop, click moves, arrows, custom pieces and square styles, responsive, TypeScript. About 4,600 weekly downloads. |
| Rules, SAN/UCI, legality | [chess.js](https://github.com/jhlywa/chess.js) | 1.4.0 | BSD-2-Clause | Move generation and validation, isAttacked, FEN, bundled types. Reads PGN comments but discards variations, so the parser below carries the tree. |
| PGN tree parser | [@mliebelt/pgn-parser](https://github.com/mliebelt/pgn-parser) | 1.4.19 | Apache-2.0 | PEG parser that keeps variations, comments, NAGs and the \[%cal\]/\[%csl\] arrow and circle comments; the grammar PgnViewerJS and cm-pgn are built on. Runs at build time and in the browser for user imports. |
| PGN parser (alternative) | [@echecs/pgn](https://github.com/echecsjs/pgn) | 5.0.0 | MIT | Newer, zero dependencies, strict TypeScript, no-throw API. Swap in if pgn-parser's UMD build fights Vite. |
| Board and rules (GPL option, not used) | [@lichess-org/chessground](https://github.com/lichess-org/chessground) + [chessops](https://github.com/niklasf/chessops) | 10.4.2 / 0.15.x | GPL-3.0-or-later | The Lichess board and rules library. Only if GPL becomes acceptable later. |
| Engine | [stockfish](https://github.com/nmrugg/stockfish.js) (nmrugg) | 19.x | GPL-3.0 | Five builds; use stockfish-19-lite-single (about 2 MB, no special headers). Loaded at runtime as a separate Worker asset, never imported. The lite multi-threaded build needs COOP/COEP; the full build is over 100 MB. |
| Spaced repetition | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | 5.4.2 | MIT | FSRS-6 scheduler, pure TypeScript, Card and ReviewLog types you can store directly. Last push April 2026. |
| Database | [@sqlite.org/sqlite-wasm](https://sqlite.org/wasm/doc/trunk/persistence.md) | 3.53.4 (npm: 3.53.4-build2) | Apache-2.0 | The SQLite project's own WASM build. opfs-sahpool VFS persists in OPFS from a Worker with no special headers. |
| Database (Postgres option) | [@electric-sql/pglite](https://github.com/electric-sql/pglite) | current | Apache-2.0 | Postgres in WASM with idb:// and opfs-ahp:// storage, live queries and React hooks. Choose it only if the later "bigger piece" will be Postgres. |
| Query layer | drizzle-orm (sqlite-core + sqlite-proxy driver) | latest | Apache-2.0 | Schema in TypeScript, drizzle-kit generates SQL migrations; the proxy driver is a 20-line adapter to the SQLite worker. |
| Opening statistics | [Lichess opening explorer](https://github.com/lichess-org/lila-openingexplorer) | API | AGPL server, CC0 game data | Per-position move popularity and results, filterable by speed and rating band. Used at build time for the seed openings and, behind the learner's own token, at runtime. |
| Validation | zod | 4.x | MIT | One schema per content and storage type; the same schema validates content at build time and imports at runtime. |
| UI state | zustand | 5.x | MIT | Small stores per screen; keeps engine and storage out of React trees. |
| UI kit | shadcn/ui, Tailwind 4, lucide-react | latest | MIT | What you asked for; shadcn is copied into the repo so it can be themed freely. |
| Opening names | [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) | TSV, updated continuously | CC0 | About 3,500 named positions with ECO, PGN, UCI and EPD. The EPD column is the key that makes transposition lookup trivial. |
| Opening metadata | [yaml](https://github.com/eemeli/yaml) | 2.x | ISC | Parses each opening's `opening.yaml` at build time. Added with the per-variant layout. |
| Build | Vite 7, TypeScript 5 strict, Vitest, pnpm workspaces, eslint-plugin-boundaries | latest | MIT | Standard; nothing exotic for Claude Code to learn. |

Storage notes from Phase 4: Drizzle's proxy driver only honours `casing` when a batch callback is also passed, so `db.batch` is disabled and atomic writes use `exec.transaction`; engine and storage may import `@knightschool/core/schema` (Zod schemas) as values to validate rows; `Card` and `Setting` gained `at` so imports can merge by newest.

Training notes from Phase 5: a session is one card at a time (the position before our move, opponent's last move highlighted) rather than replaying a whole line with the opponent choosing among sibling replies; that variant is still to do. `Card` gained `scheduledDays` and `learningSteps` for ts-fsrs. Enrolment and the daily new-card limit are settings rows.

Engine notes from Phase 6: the registry serves Stockfish 19 (`stockfish@19.0.1`), so the build used is `stockfish-19-lite-single` and the cache engine id is `sf19-lite-single`; the browse analysis uses depth 14 with MultiPV 3, shared by the eval bar, the engine panel and "measure this line", so they hit the same cache rows.

Courses and families: a course has one learner side and one repertoire move per position, so alternative systems against an opening are separate courses (`caro-kann-two-knights`, `-advance`, `-panov`), tied to the opening's own course by a shared `family` and an `against` name in opening.yaml. `refutations/` is for punishing a specific mistake (a trap); a strong line against an opening goes in `lines/` of an against course. Positions after a mistake the learner themselves is shown making are never cards. Practising every branch (`#/play/<course>/all/branches`) walks the tree with the computer choosing among its known replies (the main line three times as likely), so every variation gets practised.

UX notes after the redesign: courses are the unit of discovery (grid with board thumbnails and progress, search and filters, board search); a line is shown as a move table with its branches listed separately; modes are Learn, Practice and Review; no step requires an acknowledgement; the second browser tab takes the database over instead of being refused.

Pinned in Phase 1: Vite 7.3.7, TypeScript 5.9.3, Vitest 4.1.11, ESLint 9.39.5 with typescript-eslint 8.71.2, eslint-plugin-boundaries 7.2.0, React 19.3.0, Tailwind 4.3.3, pnpm 12.11.2. Newer majors existed (Vite 8, TypeScript 7, ESLint 10) but typescript-eslint did not yet support TypeScript 7. react-chessboard is at 5.12.1 on the registry, not 5.1.0; take the latest 5.x when Phase 3 adds it.

On the explorer's access rules: its old host explorer.lichess.ovh stopped answering in the February 2026 outage, current client libraries default to explorer.lichess.org, and two third-party integrations from 2026 report that calls now need a personal API token (free, no scopes, from lichess.org/account/oauth/token). The app never ships a token; the author uses theirs at build time and a learner may paste their own in Settings. How it is used is under Opening content.

## Data model

Two kinds of data, kept apart: content (what the author writes, shipped with the site, read-only) and user state (what the learner does, written by the app, exportable). Both are defined once as Zod schemas in packages/core; the Drizzle tables in packages/storage mirror the user-state schemas column for column.

Positions are keyed by EPD (FEN without the move counters). Two lines that transpose into the same position share one node, so a move learned in the Italian is also known when it is reached through a Bishop's Opening move order. The Lichess TSV uses the same key, which is how a node gets its name for free.

```typescript
// packages/core/src/schema/content.ts
export const Opening = z.object({
  id: z.string(),                 // 'italian-game' (the folder name)
  name: z.string(),               // 'Italian Game'
  eco: z.string(),                // 'C50'
  side: z.enum(['white', 'black']),
  level: z.enum(['beginner', 'club']),
  summary: z.string(),            // two sentences, plain language
  rootEpd: z.string(),
  tags: z.array(z.string()),      // 'open', 'e4', 'tactical'
  variants: z.array(Variant),     // lines then refutations, each in teaching order; the first line is the main line
});

export const Motif = z.enum(['trap', 'fork', 'pin', 'skewer', 'discovered-attack', 'hanging-piece', 'back-rank',
  'queen-trap', 'smothered-mate', 'early-queen', 'pawn-grab', 'castling-lost', 'mate-threat']);

export const VariantTags = z.object({ // from the PGN header; content/README.md is the authoring reference
  character: z.array(z.enum(['solid', 'sharp', 'gambit', 'positional', 'tactical'])).min(1),
  risk: z.enum(['low', 'medium', 'high']),          // how badly a beginner on our side can go wrong
  earlyMate: z.enum(['white', 'black', 'both', 'none']), // who has mating chances in the first 12 moves
  tricks: z.array(Motif),                           // [] when the PGN says "none"
  refutes: z.string().optional(),                   // SAN from the start: the opponent idea this line punishes
  refutedBy: z.string().optional(),                 // SAN from the start: the line that punishes this one
  themes: z.array(z.string()),                      // 'd4-break', 'minority-attack'
});

export const Variant = z.object({
  id: z.string(),                 // 'giuoco-pianissimo' (the file name)
  kind: z.enum(['line', 'refutation']), // the folder: lines/ or refutations/
  name: z.string(),               // PGN [Variation]
  eco: z.string(),                // PGN [ECO]
  tags: VariantTags,
});

export const Annotation = z.object({
  text: z.string().optional(),        // 'Develops with tempo on the knight'
  nag: z.array(z.number().int()),     // 1 = !, 2 = ?, 4 = ?? ...
  motifs: z.array(Motif),
  arrows: z.array(z.string()),        // colour letter + squares, as in PGN [%cal]: 'Ge2e4'
  circles: z.array(z.string()),       // colour letter + square, as in PGN [%csl]: 'Ge4'
});

/** A position, keyed by EPD, so move orders that transpose share one node. */
export const LineNode = z.object({
  epd: z.string(),
  ply: z.number().int(),          // shortest distance from the root
  sideToMove: Side,
  isOurTurn: z.boolean(),
  moves: z.array(LineEdge),       // moves out of this position
  name: z.string().optional(),    // from the Lichess openings list, by EPD
  popularity: z.number().min(0).max(1).optional(), // share of games at the seed band reaching this position (explorer, build time)
});

/** A move out of a position. Moves carry the annotation because two paths can reach the same position by different moves. */
export const LineEdge = z.object({
  san: z.string(),
  uci: z.string(),
  to: z.string(),                 // EPD after the move
  isMainLine: z.boolean(),        // on the main line of the opening's first line
  isRepertoire: z.boolean(),      // at our turn: the one move we want played (never a ?, ?? or ?! move)
  variants: z.array(z.string()),  // ids of the variants this move appears in
  annotation: Annotation.optional(),
});

export const Quiz = z.object({
  id: z.string(),
  epd: z.string(),                // position the question is about
  prompt: z.string(),             // 'Why is 4...Nxe4 a mistake here?'
  accept: z.array(z.object({
    keywords: z.array(z.string()),   // any-of groups: ['rook', 'rh8'], ['hang', 'drop', 'lose']
    all: z.boolean().default(false), // require every group or any group
    feedback: z.string(),
  })),
  reveal: z.string(),             // the full answer shown afterwards
  showMove: z.string().optional(),// move to animate when revealing
});
```

A tree is a map from EPD to LineNode plus a root; moves are edges between nodes. An Opening owns one tree, merged from its variant files (`content/openings/<opening>/{lines,refutations}/<variant>.pgn`); a build script turns them into this JSON so the browser never parses PGN on the hot path. Merging by EPD is what makes shared moves one node and transpositions between variants land on the same node.

```typescript
// packages/core/src/schema/user.ts
export const Card = z.object({          // one card per (opening, our-move node)
  id: z.string(),                       // `${openingId}:${parentEpd}`
  openingId: z.string(),
  epd: z.string(),                      // position where we must move
  expectedUci: z.string(),
  // FSRS state, stored as ts-fsrs produces it
  due: z.iso.datetime(),
  stability: z.number(),
  difficulty: z.number(),
  reps: z.number().int(),
  lapses: z.number().int(),
  state: z.enum(['new', 'learning', 'review', 'relearning']),
  lastReview: z.iso.datetime().nullable(),
  at: z.iso.datetime(),                 // last change; the newer copy wins when two devices are merged
});

export const Review = z.object({        // append-only log; this is the thing you reflect on later
  id: z.string(),
  cardId: z.string(),
  at: z.iso.datetime(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  playedUci: z.string().nullable(),     // what the learner actually played
  msToAnswer: z.number().int(),
  hintUsed: z.boolean(),
  sessionId: z.string(),
});

export const QuizAttempt = z.object({
  id: z.string(), quizId: z.string(), at: z.iso.datetime(),
  answer: z.string(), matched: z.boolean(), msToAnswer: z.number().int(),
});

export const EvalCache = z.object({     // engine results, so a line is measured once
  epd: z.string(), depth: z.number().int(), multipv: z.number().int(),
  cp: z.number().nullable(), mate: z.number().nullable(),
  pv: z.string(),                       // UCI moves, space separated
  engine: z.string(),                   // 'sf19-lite-single'
  at: z.iso.datetime(),
});

export const Setting = z.object({ key: z.string(), value: z.string(), at: z.iso.datetime() });
```

One more user-state table for the explorer, so a position is asked of Lichess at most once a month per device:

```typescript
export const ExplorerCache = z.object({
  key: z.string(),                      // `${epd}|${db}|${speeds}|${ratings}`
  epd: z.string(),
  db: z.enum(['lichess', 'masters']),
  speeds: z.string(),                   // 'blitz,rapid'
  ratings: z.string(),                  // '1000,1200,1400,1600'
  white: z.number().int(), draws: z.number().int(), black: z.number().int(),
  moves: z.array(z.object({ uci: z.string(), san: z.string(), white: z.number().int(), draws: z.number().int(), black: z.number().int() })),
  openingName: z.string().nullable(),
  fetchedAt: z.iso.datetime(),
});
```

Three rules keep this extensible:

1. Content never references user state, and user state references content only by stable ids (openingId, epd, quizId). Re-authoring an opening does not corrupt a learner's history.
2. Every user-state table has an `at` timestamp and an id generated client-side (ULID), so a dump from two devices can be merged later by union.
3. The explainer and quiz matcher take plain LineNode and Annotation values; they never read the database. Anything that wants to "reflect" (weak openings, moves most forgotten, time-of-day effects) is a query over Review, which is why Review is append-only and never updated in place.

## Stockfish in the browser

Use stockfish-19-lite-single from the nmrugg build, loaded as a Web Worker from your own origin, and talk UCI over postMessage. Its author's own recommendation is that build for most projects: about 2 MB, far stronger than any human, and no header requirements. Copy the .js and .wasm into public/engine/ at build time rather than importing them through the bundler, so the Worker URL is stable and the files are cacheable.

packages/engine exposes one class and hides UCI entirely:

```typescript
interface Engine {
  ready(): Promise<void>;
  evaluate(epd: string, opts: { depth?: number; movetimeMs?: number; multipv?: number }, signal?: AbortSignal): Promise<Evaluation>;
  measureLine(epds: string[], opts): AsyncIterable<Evaluation>;   // yields as each node finishes
  stop(): void;
  dispose(): void;
}
interface Evaluation { epd: string; depth: number; lines: { cp?: number; mate?: number; pv: string[] }[]; engine: string }
```

Details that matter in practice:

- One Worker, one search at a time. Queue requests; a new evaluate() with a different EPD sends `stop` first and resolves the old promise with whatever depth was reached, flagged partial.
- Normalise scores to White's point of view before they leave the package, so the UI and the explainer never think about side to move.
- Cache by (epd, depth, engine) in the EvalCache table. Measuring a 12-move line at depth 18 is about 24 searches, roughly 1 to 2 s each on a laptop and slower on a phone; do it once and store it. Show a progress bar, and never measure on the main thread's critical path.
- Use `setoption name MultiPV value 3` for the "what else was good here" view; the second and third lines are what the explainer compares against.
- Load the engine lazily on first use (the Browse screen does not need it) and show a one-time download notice.

Multi-threaded builds need the page to be cross-origin isolated, which means the host must send `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`. Cloudflare Pages, Netlify and Vercel do this with a `_headers` or config file; GitHub Pages cannot set headers, and the usual workaround is coi-serviceworker, a script that registers a service worker to inject the headers and reloads the page once. This same decision affects the database (next section but one), so it is listed as an open question at the end rather than decided here. The single-threaded lite build works everywhere and is the default.

## Explaining moves

Nothing on npm does this as a React or TypeScript library. What exists is prior art to copy from: [blitzr](https://github.com/franverona/blitzr) (React, chess.js, Stockfish WASM) produces plain-English lines such as "saves the rook on h6, which was hanging" from a handful of checks, and counts a blunder as a swing of 200 centipawns or more; [chess-detect](https://pypi.org/project/chess-detect/) (Python) detects fork, pin, skewer, discovered check, trapped piece and hanging capture, each as a small function over board-before, board-after and the move. Both confirm the shape of the work: a dozen rules, each cheap, each producing one sentence.

The design is one interface and several providers, combined in order of trust:

```typescript
interface Explanation { kind: 'why-good' | 'why-bad' | 'what-it-does'; text: string; motifs: string[]; confidence: number; source: 'author' | 'motif' | 'engine' | 'llm'; shapes?: string[] }
interface Explainer { explain(before: Position, move: Move, ctx: { node?: LineNode; evalBefore?: Evaluation; evalAfter?: Evaluation }): Explanation[] }
```

1. AuthorExplainer: returns the Annotation text written in the PGN comment. Always first, highest confidence, and the only provider in Phase 1.
2. MotifExplainer: pure chess.js (isAttacked, moves per square) plus small ray helpers of our own for pins and skewers. Checks after the move: a piece left undefended and attacked (hanging), a piece attacking two targets of higher value (fork), a ray piece attacking through a lesser piece to a greater one (pin, skewer), mate in one threatened, a capture that wins material by simple exchange count, a move that gives up castling rights, a pawn move that leaves a hole on a square the opponent's knight can reach. Each rule is a 20 to 40 line function with a table-driven test.
3. EngineExplainer: needs the eval cache. Reports the swing in centipawns, names the engine's preferred move, and plays the first two moves of the refutation line through MotifExplainer to say what the punishment was ("after Qxf7+ the king is forked"). This turns a bare number into the sentence a beginner can use.
4. LlmExplainer: not built now; the interface leaves the slot. When added it would receive the motif and engine outputs as grounding and be asked only to rephrase, never to assert tactics.

Two scope limits keep this honest for beginners. The motif detector explains tactics; it does not explain plans ("this prepares d4"), which stay in the author's annotations. And every generated sentence carries the shapes that justify it (an arrow from attacker to target), so the learner can see the claim on the board rather than take it on trust.

The quiz feature reuses the same vocabulary: a Quiz's accept groups use the motif ids and the piece and square names, so "it drops the rook" and "the rook on h8 hangs" match the same answer.

## Spaced repetition and quizzes

A card is a position where it is our move plus the move the repertoire expects; the opponent's moves are never cards. Cards are generated from the tree when an opening is enrolled, with new cards introduced in main-line order and capped per day (a setting, default 10), which is how Chessable-style trainers keep a beginner from drowning in sidelines on day one.

ts-fsrs does the scheduling. Its Card and ReviewLog shapes map one-to-one onto the Card and Review tables above, so a review is: load card, `scheduler.next(card, now, rating)`, write the new card and the log row, done.

Grading is automatic by default, because beginners do not grade themselves well:

| What happened | Rating sent to FSRS |
| --- | --- |
| Correct move, under 5 s, no hint | Easy |
| Correct move, no hint | Good |
| Correct move after a hint, or after one wrong try | Hard |
| Wrong move twice, or move shown | Again |

A Settings toggle switches to manual Again/Hard/Good/Easy buttons for people who prefer Anki-style control. The thresholds are constants in core, not scattered in the UI.

A training session plays through a line: the app makes the opponent's moves (choosing among sibling replies in the tree, weighted toward the main line), stops at each card, waits for the learner's move, and continues. A wrong move shows the explanation for the expected move and, if the wrong move itself is annotated or the motif detector has something to say, why that was worse. Transpositions are handled by the EPD key: if the learner reaches a known position by another order, the card for that position is the one that fires.

Pop quizzes are a second card type scheduled by the same FSRS instance (ts-fsrs does not care what is on the card). A quiz shows a position and a prompt, the learner types, and the matcher scores it:

1. Lowercase, strip punctuation, expand a small synonym table (hangs, drops, loses, en prise; forks, attacks two).
2. Each accept entry has keyword groups; a group matches if any of its words appears; the entry matches if all groups do (or any, per its flag).
3. First matching entry wins and returns its feedback; no match shows the reveal text and the move animation.

This is deliberately not fuzzy search. String containment over a curated synonym list is predictable, testable and explainable to a child; fuse.js can be added later if real answers show it is needed, and the QuizAttempt log is where that evidence will come from.

Reflection, later, is queries over Review and QuizAttempt: lapses by opening, time to answer by ply, the ten positions most often wrong, retention by weekday. None of that needs new tables; it needs the log to be complete, which is why msToAnswer, playedUci and hintUsed are recorded from day one.

## Storage: SQLite in the browser

Yes to SQLite, from Phase 1, for the reason you gave: the schema, migrations and queries you write now move unchanged to a server later, and reflection queries (joins over Review, Card and Opening) are SQL's home ground. IndexedDB via Dexie would be less setup but would mean rewriting every query at the point the project grows.

Recommended stack: @sqlite.org/sqlite-wasm in a dedicated Worker using the opfs-sahpool VFS, Drizzle for the schema and migrations through its sqlite-proxy driver, and a thin message protocol between the main thread and the Worker. The three OPFS options and why sahpool wins for this app:

| VFS | Needs COOP/COEP headers | Multi-tab | Speed | Notes |
| --- | --- | --- | --- | --- |
| opfs-sahpool | No | One tab at a time (second instance fails to initialise) | Fastest of the three per SQLite's own docs | Works on Safari 16.4+. Paths must be absolute. The SQLite docs recommend it for clients who cannot set headers. |
| opfs | Yes (SharedArrayBuffer) | Yes, with SQLITE\_BUSY handling | Good | Broken on Safari below 17. |
| opfs-wl | Yes | Yes, fairer locking | Same as opfs | Needs Atomics.waitAsync, widespread only since 2025. |

A trainer is used in one tab, so the single-tab limit costs nothing; guard it with the Web Locks API so a second tab shows "already open elsewhere" instead of an error. localStorage keeps only the handful of settings the UI needs before the Worker is up (theme, board colours, last opening).

Two alternatives, each right under a different plan:

- SQLocal (MIT) wraps the same SQLite build with a `sql` tagged template, a Vite plugin, and ready-made Kysely and Drizzle drivers. It is less code, but its OPFS mode requires the COOP/COEP headers, so it is the better choice only if you host somewhere that sets headers (which also unlocks multi-threaded Stockfish). If the answer to the hosting question below is Cloudflare Pages or Netlify, use SQLocal and stop writing the Worker yourself.
- PGlite (Apache-2.0) is Postgres 17 in WASM with `idb://` and `opfs-ahp://` storage, a Drizzle driver, live queries and React hooks. It is the right call only if the later server will be Postgres; the WASM download is larger than SQLite's, and the OPFS mode does not run on Safari.

Export and import are a feature, not an afterthought:

- Export: `poolUtil.exportFile('/trainer.db')` gives the raw .sqlite bytes; also write a JSON dump (every table as an array) so a human can read it. Offer both from Settings.
- Import: Zod-validate each row, then union by id into the existing tables, newest `at` wins on conflict. This is what makes two-device use possible without a server.
- Schema version lives in a `meta` table; drizzle-kit generates numbered SQL migrations that run on startup inside the Worker before any query is answered.

The Storage interface the UI and core see is repository-shaped (`cards.due(now)`, `reviews.append(r)`, `evals.get(epd, depth)`), not SQL-shaped. That is the seam that lets a server implement the same interface over HTTP later, and lets tests run against an in-memory SQLite in Node.

## Opening content

Each opening is a folder: `content/openings/<opening-id>/opening.yaml` holds the Opening fields and the variant order, and each variant is its own PGN file with comments, sub-variations and NAGs. Variants live in `lines/` (the repertoire against sensible play) or `refutations/` (how to punish an opponent's mistake or trap attempt, always with a `Refutes` tag); lines are taught first and refutations are the main source of quizzes. PGN is the format every chess tool reads and writes, which means lines can be drafted in a Lichess study and exported, and it is what pgn-parser turns into the tree. Every variant PGN carries a header of structured tags (Character, Risk, EarlyMate, Tricks, and optionally Refutes, RefutedBy, Themes) in a fixed vocabulary; [content/README.md](../content/README.md) is the authoring reference and the build rejects unknown values. A build step (`pnpm content:build`) parses every file, validates it against the Zod schemas, merges each opening's variants into one EPD-keyed tree, checks that no position where it is our move has two different repertoire moves, resolves names and ECO codes from the Lichess TSV by EPD, and writes `public/content/<id>.json`. A broken file fails the build, not the learner.

```
content/openings/italian-game/
  opening.yaml                         # name, eco, side, level, summary, tags, lines: [...], refutations: [...]
  lines/giuoco-pianissimo.pgn          # main line (first in lines)
  lines/two-knights.pgn
  refutations/blackburne-shilling.pgn  # [Refutes "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4"]

content/openings/italian-game/lines/giuoco-pianissimo.pgn
---
[Event "Knight School"]
[Opening "Italian Game"]
[Variation "Giuoco Pianissimo"]
[ECO "C50"]
[Character "solid,positional"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "pin"]
[Themes "d4-break,f7-pressure"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 { Points at f7, the weakest square in Black's camp. } 3... Bc5 4. c3 { Prepares d4 to take
the centre. } 4... Nf6 5. d3 ...
```

Free sources to draw on, with the licence that governs reuse:

| Source | What it gives | Licence |
| --- | --- | --- |
| [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) | 3,500 named positions: ECO, name, PGN, UCI, EPD | CC0 |
| [Lichess puzzle database](https://database.lichess.org/) | Millions of puzzles as CSV with FEN, solution, themes and opening tags; filter by opening tag to seed tactic quizzes inside each opening | CC0 |
| [Lichess studies](https://lichess.org/study) | Draft lines on a real board with a friend, export PGN with comments | Your own content |
| [Wikibooks: Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory) | Beginner-level prose on the main lines | CC BY-SA 4.0, attribution required and derived text must carry the same licence |
| Lichess opening explorer | Move popularity and win rates at a rating band, for choosing which sidelines are worth a card | API, free personal token, cached locally; see below |

**Using the explorer.** The endpoints are `GET https://explorer.lichess.org/lichess?fen=...&speeds=blitz,rapid&ratings=1000,1200,1400,1600` for community games (filterable by speed and rating band) and `/masters` for over-the-board games above 2200. Each response lists, per next move, the counts of white wins, draws and black wins, plus the opening name. The client follows the Lichess API tips to the letter: `Authorization: Bearer` with the token from Settings, one request in flight at a time, a descriptive User-Agent, every response written to ExplorerCache with a 30-day TTL, and after any 429 no calls to that host for 60 s. No token means no calls and the panel stays hidden; the trainer never degrades.

Three uses, in the order they pay off:

1. Build time, not runtime. The `content:build` script, run with the author's token, asks the explorer about every node of the six seed openings at the 1000 to 1600 band once, and writes each node's `popularity` into the content JSON. Most learners never call Lichess; the trainer's opponent still chooses replies in proportion to what people at their level play.
2. Card weighting, the layer that is ours. A sideline earns a card only when the position the card is asked in is reached in at least 5 % of games at the band (a constant in core, `MIN_POPULARITY_FOR_CARD`). The day-one queue is then the moves the learner will meet in their own games, not the author's favourites, and a rarely seen trap can still be kept as a quiz rather than a card.
3. A "what people play here" panel on Browse and after a miss in Train, for learners who paste a token. It reads through ExplorerCache, so repeat visits cost nothing.

A beginner seed set of six openings is enough for the first release and small enough to annotate properly: three for White (Italian Game, London System, Scotch Game) and three for Black (Caro-Kann, Scandinavian against e4, Queen's Gambit Declined against d4). Each line stops around move 10 to 12; the point is reaching a playable middlegame with the ideas understood, not depth.

User-authored openings come later as PGN import through the same build pipeline run in the browser (pgn-parser runs in the browser too); the schema does not change, only where the file comes from.

## Build plan for Claude Code

Eight phases, each one session or a few, each ending in something you can click and a test that proves it. Give Claude Code one phase at a time with its definition of done; it should not start the next phase until the current one's checks pass.

1. Scaffold. pnpm workspace with apps/web and packages/core, engine, storage; Vite 7, React 19, TypeScript strict, Tailwind 4, shadcn init, lucide, Vitest, eslint-plugin-boundaries with the import table from Architecture, Prettier, a GitHub Actions workflow that runs lint, test and build. Done when: `pnpm build` and `pnpm test` pass, and a deliberate `import react` inside packages/core fails lint.
2. Core domain. Zod schemas for content and user state, including Variant and VariantTags; chess.js wrappers (position from EPD, legal moves per square, SAN and UCI both ways); PGN parsing with @mliebelt/pgn-parser; PGN to tree import, merging each opening's variant files into one tree; tree helpers (path to node, children, main line, our-move nodes, transposition map). The `content:build` script over the seed openings already in content/openings (six openings, 18 variant PGNs across lines/ and refutations/; comments are first drafts); the explorer step of the build (popularity per node) with a fixture-based test, so the build also runs offline. Done when: round-trip tests pass (PGN to tree to PGN preserves moves, comments and NAGs), `content:build` emits six JSON files, and a variant with an unknown tag value, a refutation without a Refutes tag, or a second repertoire move for an existing position fails the build.
3. Board and browse. react-chessboard wired to chess.js legality, with arrows and last-move highlights; move list with variations; keyboard navigation; Browse screen listing openings by side and ECO with the summary; clicking any node shows its position, annotation text, arrows and circles. Done when: every line of every seed opening can be walked on a phone screen without the layout breaking.
4. Storage. SQLite Worker, Drizzle schema for Card, Review, QuizAttempt, EvalCache, Setting and meta, numbered migrations, repository interface, export to .sqlite and JSON, import with validation and union-merge, Web Locks single-tab guard. Done when: a review written before a reload is readable after it; an exported file imports into a wiped database and yields identical row counts.
5. Training. Card generation on enrol with the new-cards-per-day cap; ts-fsrs scheduling; Train screen playing the opponent's moves, stopping at cards, auto-grading per the table above, showing the explanation on a miss; Today screen with due counts per opening; Review log written on every answer. Done when: a ten-card session schedules ten cards with FSRS state and ten Review rows, and the due count after a simulated day matches what ts-fsrs predicts.
6. Engine. Stockfish Worker and the Engine interface; eval bar on Browse; "measure this line" with progress and EvalCache writes; MultiPV 3 panel. Done when: the starting position evaluates within 1 s of ready() on a laptop, and measuring a line twice makes zero engine calls the second time.
7. Quizzes and explainer. Annotation, Quiz and Explanation types wired through the UI; AuthorExplainer; MotifExplainer with hanging, fork, pin, skewer and mate-in-one, each with table-driven tests; EngineExplainer using the cache; quiz matcher with the synonym table; a Quiz screen scheduled through the same FSRS instance. Done when: the three phrasings "it drops the rook", "rook on h8 hangs" and "loses the exchange on h8" all pass one accept entry, and the MotifExplainer names the hanging piece in ten hand-picked positions.
8. Finish. PWA with offline cache of the engine and content (vite-plugin-pwa); Settings (grading mode, cards per day, board theme, explorer token); the explorer panel through ExplorerCache with the 429 back-off; PGN import of a user's own opening; Stats screen over the Review log; MIT LICENSE file and a credits page listing every library, with Stockfish's GPL-3.0 notice and a link to its source. Done when: the site loads and trains with the network off after one online visit.

Two working rules for every phase: core changes come with tests in the same commit, and no phase adds a dependency not in the Library choices table without saying why in the commit message.

## CLAUDE.md

The starter from the plan doc is now [CLAUDE.md](../CLAUDE.md) at the repo root, updated for the per-variant content layout and the Makefile.

## Name and icon

Working name: Knight School; identifier everywhere (repo, package, PWA, data directory): knightschool.

The icon is a chess knight, horse-head silhouette facing right, wearing a mortarboard tipped slightly back with a gold tassel swinging off the left edge, and one round eye that makes it look keen rather than solemn. Flat two-tone: a chalk-white piece on a chalkboard-green rounded square (about #2F5D50), the tassel the only other colour. At 16 px it reduces to horse head plus cap and still reads. As an SVG it is one path for the knight, one for the cap, a short line and a dot for the tassel, so Claude Code can draw it in Phase 1 (public/icon.svg) and reuse it as favicon, PWA icon and the empty-state illustration on the Browse screen.

## Open questions

- [ ] Hosting. Cloudflare Pages or Netlify (free, can set COOP/COEP headers) unlocks SQLocal and multi-threaded Stockfish; GitHub Pages cannot set headers and means the hand-written SQLite Worker with opfs-sahpool plus the single-threaded engine. Both work; the first is less code.
- [ ] Decided: MIT stack (react-chessboard, chess.js, @mliebelt/pgn-parser). Stockfish stays a separately loaded GPL asset, credited on the credits page.
- [ ] SQLite or Postgres. SQLite is the recommendation; choose PGlite only if the later server is already known to be Postgres.
- [ ] Grading. Automatic by default as proposed, or manual Anki-style buttons by default.
- [ ] Seed openings. The six proposed (Italian, London, Scotch; Caro-Kann, Scandinavian, Queen's Gambit Declined) or a different set; and whether lines stop at move 10 to 12.
- [ ] Decided: explorer in, three ways (build-time popularity per node, card weighting at 5 %, optional panel behind the learner's own token). Still open: the rating band baked into the seed content (1000 to 1600 proposed) and whether the 5 % threshold feels right once the first six openings are built.

## Sources

Pages opened on 13 October 2026. Version numbers come from each package's registry page or published package.json; PGlite, zod, zustand and Vite versions were not checked and are listed as ranges.

- [lichess-org/chessground](https://github.com/lichess-org/chessground) and its [package.json](https://cdn.jsdelivr.net/npm/@lichess-org/chessground/package.json): package name, GPL terms, wrappers, 10.4.2
- [react-chessboard on npm](https://www.npmjs.com/package/react-chessboard): 5.1.0, MIT
- [niklasf/chessops](https://github.com/niklasf/chessops) and [README at 0.15.0](https://cdn.jsdelivr.net/npm/chessops@0.15.0/README.md): PGN game tree, GPL-3.0-or-later
- [chess.js package.json](https://cdn.jsdelivr.net/npm/chess.js/package.json): 1.4.0, BSD-2-Clause
- [nmrugg/stockfish.js](https://github.com/nmrugg/Stockfish.js): Stockfish 19 builds, sizes, header requirement, recommendation
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs), [docs](https://open-spaced-repetition.github.io/ts-fsrs) and [package.json](https://cdn.jsdelivr.net/npm/ts-fsrs/package.json): FSRS-6, 5.4.2, MIT
- [SQLite WASM persistence docs](https://sqlite.org/wasm/doc/trunk/persistence.md) and [package.json](https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm/package.json): VFS comparison, header and Worker requirements, 3.53.4
- [SQLocal setup](https://sqlocal.dev/guide/setup) and [introduction](https://sqlocal.dev/guide/introduction): COOP/COEP requirement, Drizzle and Kysely drivers
- [PGlite](https://github.com/electric-sql/pglite): idb and opfs-ahp storage, live queries
- [Drizzle SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite): drivers
- [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings): TSV columns, CC0
- [lichess-org/lila-openingexplorer](https://github.com/lichess-org/lila-openingexplorer): endpoints, response shape; [lila issue 19610](https://github.com/lichess-org/lila/issues/19610) on the February 2026 outage; [third-party notes](https://glama.ai/mcp/connectors/io.github.pipeworx-io/lichess/tools/opening_explorer) reporting the token requirement
- [franverona/blitzr](https://github.com/franverona/blitzr) and [chess-detect](https://pypi.org/project/chess-detect/): prior art for rule-based move explanation
- [coi-serviceworker guide](https://docs.wasmer.io/javascript-sdk/how-to/coop-coep-headers): headers on GitHub Pages
- [Chessreps on the App Store](https://apps.apple.com/app/id6744000612): the product being adapted (Lichess-derived lines, "Reps" spaced repetition, Learn and Practice modes)
- [@mliebelt/pgn-parser package.json](https://cdn.jsdelivr.net/npm/@mliebelt/pgn-parser/package.json) and [repository](https://github.com/mliebelt/pgn-parser): 1.4.19, Apache-2.0, variations, NAGs, arrow and circle comments
- [@echecs/pgn package.json](https://cdn.jsdelivr.net/npm/@echecs/pgn/package.json): 5.0.0, MIT
- [Lichess API reference mirror](https://github.com/api-evangelist/lichess) and [lichess-mcp notes](https://glama.ai/mcp/servers/frogr/lichess-mcp/tree): personal token page, one request at a time, 60 s back-off after a 429
