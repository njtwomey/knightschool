import { z } from 'zod';
import { OpeningManifest } from './course';
import { LineKind, Motif, Side, Slug, TrapKind, VariantTags } from './tags';

// What the build makes of the content: each course as a tree of positions, and the theory tree to draw.

export const Variant = z.object({
  id: Slug, // the file name
  kind: z.enum(['line', 'refutation']), // the folder: lines/ or traps/ (a trap is called a refutation inside the code)
  name: z.string().min(1), // PGN [Variation]
  eco: z.string().regex(/^[A-E]\d\d$/),
  tags: VariantTags,
  mainLine: z.array(z.string()), // the variant's own main line, as UCI moves from the start
  /** What the opponent does to arrive here, as written in course.yaml: "3...Bc5". */
  opponent: z.string().default(''),
  /** Lines only: main, sideline, rare or gambit. */
  weight: LineKind.optional(),
  /** Traps only: for-us or against-us. */
  whose: TrapKind.optional(),
  /** Shown and playable but never drilled: a second answer to a position the main line already answers. */
  alternative: z.boolean().default(false),
  /** A heading the course page groups this under, instead of the usual main / sideline / trap groups. */
  section: z.string().optional(),
  /** PGN [Description]: what the line is and why it matters. */
  description: z.string().optional(),
  /** PGN [Snapshot]: the ply (from the start) of the position that pictures the line. */
  snapshot: z.number().int().nonnegative().optional(),
});
export type Variant = z.infer<typeof Variant>;

export const Opening = OpeningManifest.omit({ lines: true, traps: true }).extend({
  id: Slug, // the folder name
  rootEpd: z.string(),
  /** The position after `trigger`. */
  triggerEpd: z.string(),
  variants: z.array(Variant), // lines then traps, each in teaching order
});
export type Opening = z.infer<typeof Opening>;

export const Annotation = z.object({
  text: z.string().optional(), // 'Develops with tempo on the knight'
  nag: z.array(z.number().int()).default([]), // 1 = !, 2 = ?, 4 = ??, ...
  motifs: z.array(Motif).default([]),
  arrows: z.array(z.string()).default([]), // colour letter + squares, as in PGN [%cal]: 'Ge2e4'
  circles: z.array(z.string()).default([]), // colour letter + square, as in PGN [%csl]: 'Ge4'
  /** Supplementary notes, PGN [%tag]: tip, trap, blunder or another word. Shown while studying, never asked. */
  tags: z.array(z.string()).optional(),
});
export type Annotation = z.infer<typeof Annotation>;

/** A move out of a position. Annotations belong here, not on the position, because transpositions share positions. */
export const LineEdge = z.object({
  san: z.string(),
  uci: z.string(),
  to: z.string(), // EPD after the move
  isMainLine: z.boolean(), // on the main line of the opening's first line
  isRepertoire: z.boolean(), // at a position where it is our move: the move we want played. Always false otherwise.
  variants: z.array(Slug), // ids of the variants this move appears in
  annotation: Annotation.optional(),
});
export type LineEdge = z.infer<typeof LineEdge>;

/** A position in an opening's tree, keyed by EPD, so move orders that transpose share one node. */
export const LineNode = z.object({
  epd: z.string(),
  ply: z.number().int(), // shortest distance from the root
  sideToMove: Side,
  isOurTurn: z.boolean(),
  moves: z.array(LineEdge),
  name: z.string().optional(), // from the Lichess openings list
  popularity: z.number().min(0).max(1).optional(), // share of games at the seed band that reach it (build time)
});
export type LineNode = z.infer<typeof LineNode>;

export const Quiz = z.object({
  id: z.string(),
  epd: z.string(), // position the question is about
  prompt: z.string(), // 'Why is 4...Nxe4 a mistake here?'
  accept: z.array(
    z.object({
      keywords: z.array(z.array(z.string())), // groups of any-of words: [['rook', 'rh8'], ['hang', 'drop', 'lose']]
      all: z.boolean().default(false), // require every group, or any group
      feedback: z.string(),
      /** A close but incomplete answer: shown its feedback, but graded as a miss. */
      partial: z.boolean().default(false),
    }),
  ),
  reveal: z.string(), // the full answer shown afterwards
  showMove: z.string().optional(), // move to animate when revealing
});
export type Quiz = z.infer<typeof Quiz>;

export const OpeningContent = z.object({
  opening: Opening,
  nodes: z.record(z.string(), LineNode), // keyed by epd; nodes[opening.rootEpd] is the start
  quizzes: z.array(Quiz).default([]),
});
export type OpeningContent = z.infer<typeof OpeningContent>;

/**
 * public/content/tree.json, written by `treeGraph`: the theory tree as data to draw. Chapters are the branches (which
 * grows out of which, after which move) and moves join positions, named by `positionId(epd)`.
 */
export const TreeGraph = z.object({
  /** Position id of the initial position. */
  root: z.string(),
  chapters: z.array(
    z.object({
      id: Slug,
      /** Its [Variation], which may leave out the opening ("Short Variation"), and its [Opening]. */
      name: z.string(),
      opening: z.string(),
      side: Side,
      /** The chapter it branches from, and the move of that chapter it follows ("6.d4"); null from the start. */
      parent: Slug.nullable(),
      after: z.string().nullable(),
      /** Position id where its own moves begin, and how many plies lead there. */
      from: z.string(),
      ply: z.number().int().nonnegative(),
      /** The whole line in UCI from the initial position: the moves that lead to `from`, then its own main line. */
      moves: z.array(z.string()),
      /** The courses that list it, in the order they were built (none is possible). */
      courses: z.array(Slug),
      source: z.string(),
    }),
  ),
  /** Every move once, between position ids, with the chapters that write it. */
  moves: z.array(z.object({ from: z.string(), to: z.string(), san: z.string(), chapters: z.array(Slug) })),
});
export type TreeGraph = z.infer<typeof TreeGraph>;
