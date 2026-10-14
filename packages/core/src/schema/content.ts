import { z } from 'zod';

export const Side = z.enum(['white', 'black']);
export type Side = z.infer<typeof Side>;

export const Motif = z.enum([
  'trap',
  'fork',
  'pin',
  'skewer',
  'discovered-attack',
  'hanging-piece',
  'back-rank',
  'queen-trap',
  'smothered-mate',
  'early-queen',
  'pawn-grab',
  'castling-lost',
  'mate-threat',
]);
export type Motif = z.infer<typeof Motif>;

export const Character = z.enum(['solid', 'sharp', 'gambit', 'positional', 'tactical']);

const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case only');

/** The structured part of a variant's PGN header. content/README.md is the authoring reference. */
export const VariantTags = z.object({
  character: z.array(Character).min(1),
  risk: z.enum(['low', 'medium', 'high']), // how badly a beginner on our side can go wrong
  earlyMate: z.enum(['white', 'black', 'both', 'none']), // who has mating chances in the first 12 moves
  tricks: z.array(Motif), // [] when the PGN says "none"
  refutes: z.string().optional(), // SAN from the start: the opponent idea this line punishes
  refutedBy: z.string().optional(), // SAN from the start: the line that punishes this one
  themes: z.array(Slug),
});
export type VariantTags = z.infer<typeof VariantTags>;

export const Variant = z.object({
  id: Slug, // the file name
  kind: z.enum(['line', 'refutation']), // the folder: lines/ or refutations/
  name: z.string().min(1), // PGN [Variation]
  eco: z.string().regex(/^[A-E]\d\d$/),
  tags: VariantTags,
  mainLine: z.array(z.string()), // the variant's own main line, as UCI moves from the start
});
export type Variant = z.infer<typeof Variant>;

/** The contents of opening.yaml, before the variants are read. */
export const OpeningManifest = z.object({
  name: z.string().min(1),
  eco: z.string().regex(/^[A-E]\d\d$/),
  side: Side, // the side the learner plays
  level: z.enum(['beginner', 'club']),
  summary: z.string().min(1),
  tags: z.array(Slug),
  /** Courses about the same opening, from either side, share a family so they can be shown together. Defaults to the id. */
  family: Slug.optional(),
  /** Set when this course is a repertoire *against* an opening: its name, e.g. "Caro-Kann Defence". */
  against: z.string().min(1).optional(),
  /** Set by the loader for courses under content/motifs: a named position or idea that belongs to no opening. */
  motif: z.boolean().optional(),
  lines: z.array(Slug).min(1), // teaching order; the first is the main line
  refutations: z.array(Slug),
});
export type OpeningManifest = z.infer<typeof OpeningManifest>;

export const Opening = OpeningManifest.omit({ lines: true, refutations: true }).extend({
  id: Slug, // the folder name
  rootEpd: z.string(),
  variants: z.array(Variant), // lines then refutations, each in teaching order
});
export type Opening = z.infer<typeof Opening>;

/** One row of public/content/index.json, for the Browse list. */
export const OpeningIndexEntry = Opening.pick({
  id: true,
  name: true,
  eco: true,
  side: true,
  level: true,
  summary: true,
  tags: true,
  family: true,
  against: true,
  motif: true,
}).extend({
  variants: z.number().int(),
  /** How many cards the course produces, for progress bars. */
  cards: z.number().int(),
  /** A mid-line position (EPD) to draw as the course thumbnail. */
  keyEpd: z.string(),
  /** The lines, in teaching order, so the list can be shown without loading the whole course. */
  lines: z.array(
    z.object({
      id: Slug,
      name: z.string(),
      kind: z.enum(['line', 'refutation']),
      /** A position partway along the line, for its thumbnail. */
      epd: z.string(),
      /** The position after each of the first plies (from the second), for "Name That Opening". */
      epds: z.array(z.string()),
    }),
  ),
});
export type OpeningIndexEntry = z.infer<typeof OpeningIndexEntry>;

export const Annotation = z.object({
  text: z.string().optional(), // 'Develops with tempo on the knight'
  nag: z.array(z.number().int()).default([]), // 1 = !, 2 = ?, 4 = ??, ...
  motifs: z.array(Motif).default([]),
  arrows: z.array(z.string()).default([]), // colour letter + squares, as in PGN [%cal]: 'Ge2e4'
  circles: z.array(z.string()).default([]), // colour letter + square, as in PGN [%csl]: 'Ge4'
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

/** One quiz as authored in quizzes.yaml: the position is given as moves, and the answers can carry examples to check. */
export const QuizEntry = z.object({
  id: Slug,
  /** SAN from the start position to the position the question is about, e.g. "1. e4 e5 2. Nf3". */
  line: z.string().min(1),
  prompt: z.string().min(1),
  accept: z
    .array(
      z.object({
        keywords: z.array(z.array(z.string())),
        all: z.boolean().default(false),
        feedback: z.string().min(1),
        partial: z.boolean().default(false),
      }),
    )
    .min(1),
  reveal: z.string().min(1),
  /** SAN of the move to play on the board when revealing, from the quiz position. */
  showMove: z.string().optional(),
  /** Answers that must match an entry, and answers that must not, checked when the course is built. */
  examples: z
    .object({ match: z.array(z.string()).default([]), miss: z.array(z.string()).default([]) })
    .default({ match: [], miss: [] }),
});
export type QuizEntry = z.infer<typeof QuizEntry>;

/** One entry of content/families.yaml: an opening that courses are grouped under, from either side. */
export const FamilyMeta = z.object({
  id: Slug,
  name: z.string().min(1),
  eco: z.string().optional(), // 'B10' or 'B10-B19'
  summary: z.string().min(1),
  /** SAN that reaches the defining position, e.g. "1. e4 c6": drawn on the card and used as its thumbnail. */
  moves: z.string().min(1),
});
export type FamilyMeta = z.infer<typeof FamilyMeta>;

/** A family as built: its metadata, its defining position, and the courses under it (playing it first). */
export const Family = FamilyMeta.extend({ epd: z.string(), courses: z.array(Slug).min(1) });
export type Family = z.infer<typeof Family>;
