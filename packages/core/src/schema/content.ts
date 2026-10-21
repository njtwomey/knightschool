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

/** How much a line matters, which decides whether it earns review cards. */
export const LineKind = z.enum(['main', 'sideline', 'rare', 'gambit']);
export type LineKind = z.infer<typeof LineKind>;
/** A trap is one we spring (for us) or one we must not fall for (against us). */
export const TrapKind = z.enum(['for-us', 'against-us']);
export type TrapKind = z.infer<typeof TrapKind>;
export const Tier = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type Tier = z.infer<typeof Tier>;

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
});
export type Variant = z.infer<typeof Variant>;

/** One entry of the `lines:` list in course.yaml. */
export const CourseLine = z.object({
  /** The file name under lines/, without .pgn. This is the line's id and ends up in learner history. */
  file: Slug,
  /**
   * Reuse a line of another course (its id) instead of keeping a copy: "from: e5-open-games". It must be a course for
   * the same side. The line is shown here but never drilled (its own course drills it), so it counts as an alternative.
   */
  from: Slug.optional(),
  /** A heading to group this under on the course page ("Playing the King's Gambit"). Sections show in course.yaml order. */
  section: z.string().min(1).optional(),
  /** What the opponent does to reach this line, in SAN with its move number: "3...Bc5" or "2...d5". */
  opponent: z.string().min(1),
  kind: LineKind,
  alternative: z.boolean().default(false),
});
export type CourseLine = z.infer<typeof CourseLine>;

/** One entry of the `traps:` list in course.yaml. */
export const CourseTrap = z.object({
  file: Slug,
  section: z.string().min(1).optional(),
  opponent: z.string().min(1),
  kind: TrapKind,
});
export type CourseTrap = z.infer<typeof CourseTrap>;

/**
 * The introduction to a course, for a beginner who has never heard of the opening: why it is played and what can go
 * wrong. The `summary` says what the opening is; these say what it is for. Each is a few plain sentences.
 */
export const CourseAbout = z.object({
  /** The main idea: why our side plays this, and what it hopes for. */
  idea: z.string().min(1),
  /** Its weaknesses and risks for our side, and the opponent's best try against it. */
  risks: z.string().min(1),
  /** Optional: where the opening comes from or who made it popular. Left out rather than guessed. */
  origin: z.string().min(1).optional(),
});
export type CourseAbout = z.infer<typeof CourseAbout>;

/** The contents of course.yaml, before the variants are read. */
export const OpeningManifest = z.object({
  name: z.string().min(1),
  eco: z
    .string()
    .regex(/^[A-E]\d\d$/)
    .optional(),
  side: Side, // the side the learner plays; it must match the white/ or black/ folder
  /** The opening this course is about, an id from content/openings.yaml. Courses that share one are shown together. */
  opening: Slug,
  /** 1: study first. 2: next. 3: alternatives and rare replies. */
  tier: Tier,
  /** SAN from the start to the position every line of the course passes through: "1. e4 e5 2. Nf3". Empty means the start. */
  trigger: z.string(),
  summary: z.string().min(1),
  /** The introduction: the main idea and the risks, shown at the top of the course page and on the play page. */
  about: CourseAbout,
  /** Short plan bullets a player can act on when the opponent leaves the book. */
  plans: z.array(z.string().min(1)).default([]),
  /** Ids from content/motifs.yaml. */
  motifs: z.array(Slug).default([]),
  tags: z.array(Slug).default([]),
  lines: z.array(CourseLine).min(1), // teaching order; the first is the main line
  traps: z.array(CourseTrap).default([]),
});
export type OpeningManifest = z.infer<typeof OpeningManifest>;

/**
 * One entry of `lines:` in course.yaml: a line of the book for the course's side, by id, optionally with what this
 * course says differently about it. Traps are listed here too; the chapter's [Kind] says which is which.
 */
export const CourseEntry = z.union([
  Slug,
  z.object({
    id: Slug,
    /** Overrides the chapter's [Kind] for this course: a main line elsewhere can be a sideline here. */
    kind: z.union([LineKind, TrapKind]).optional(),
    alternative: z.boolean().default(false),
    section: z.string().min(1).optional(),
    /** Overrides the chapter's [Opponent]. */
    opponent: z.string().min(1).optional(),
  }),
]);
export type CourseEntry = z.infer<typeof CourseEntry>;

/** course.yaml: the course-level material and the lines it takes from its side's book, in teaching order. */
export const CourseManifest = OpeningManifest.omit({ lines: true, traps: true }).extend({
  lines: z.array(CourseEntry).min(1),
});
export type CourseManifest = z.infer<typeof CourseManifest>;

export const Opening = OpeningManifest.omit({ lines: true, traps: true }).extend({
  id: Slug, // the folder name
  rootEpd: z.string(),
  /** The position after `trigger`. */
  triggerEpd: z.string(),
  variants: z.array(Variant), // lines then traps, each in teaching order
});
export type Opening = z.infer<typeof Opening>;

/** One row of public/content/index.json, for the Browse list. */
export const OpeningIndexEntry = Opening.pick({
  id: true,
  name: true,
  eco: true,
  side: true,
  opening: true,
  tier: true,
  trigger: true,
  summary: true,
  about: true,
  plans: true,
  motifs: true,
  tags: true,
}).extend({
  /** Position in content/curriculum.yaml: the order to study in. */
  order: z.number().int(),
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
      opponent: z.string(),
      weight: LineKind.optional(),
      whose: TrapKind.optional(),
      alternative: z.boolean(),
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

/**
 * One entry of content/openings.yaml: an opening that courses are grouped under, from either side. `side` is who
 * plays it, so a course on that side is "playing it" and a course on the other side is "playing against it".
 */
export const OpeningMeta = z.object({
  id: Slug,
  name: z.string().min(1),
  side: Side,
  eco: z.string().optional(), // 'B10' or 'B10-B19'
  summary: z.string().min(1),
  /** SAN that reaches the defining position, e.g. "1. e4 c6": its thumbnail. */
  moves: z.string().min(1),
});
export type OpeningMeta = z.infer<typeof OpeningMeta>;

/** An opening as built: its entry, its defining position, and the courses under it. */
export const OpeningGroup = OpeningMeta.extend({ epd: z.string(), courses: z.array(Slug).min(1) });
export type OpeningGroup = z.infer<typeof OpeningGroup>;

/** One entry of content/motifs.yaml: a tactical or structural idea, in plain words, for the glossary and for tagging. */
export const MotifEntry = z.object({
  id: Slug,
  name: z.string().min(1),
  summary: z.string().min(1),
  group: z.enum(['tactical', 'structural']),
});
export type MotifEntry = z.infer<typeof MotifEntry>;

/** A motif as built: its entry plus the courses that name it, for the glossary page. */
export const GlossaryEntry = MotifEntry.extend({ courses: z.array(Slug) });
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;

/** One entry of content/curriculum.yaml: the order to study courses in, and what to do first. */
export const CurriculumEntry = z.object({
  id: Slug,
  prerequisites: z.array(Slug).default([]),
});
export type CurriculumEntry = z.infer<typeof CurriculumEntry>;
