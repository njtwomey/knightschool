import { z } from 'zod';
import { LineKind, Side, Slug, Tier, TrapKind } from './tags';

// course.yaml as authored.

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
  /** Shown and playable but not drilled: a trap to avoid kept as a bonus, its avoiding move earning no card. */
  alternative: z.boolean().optional(),
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
  /** Who it suits: the kind of player and game it fits, and when to choose it over the alternatives. */
  suits: z.string().min(1),
  /** Optional: where the opening comes from or who made it popular. Left out rather than guessed. */
  origin: z.string().min(1).optional(),
});
export type CourseAbout = z.infer<typeof CourseAbout>;

/** A unit of a course's study path: `<line>:<n>`, the n-th unit of that line. */
export const UnitId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*:[1-9]\d*$/, 'a unit id, <line>:<n>');

/**
 * course.yaml `units:`: changes to the study path the build cuts (docs/STUDY-PLAN.md), by unit id. Ids are those of the
 * default card settings; the build checks them.
 */
export const UnitOverrides = z
  .object({
    /** These units come as early as their prerequisites allow, in this order, before the others. */
    order: z.array(UnitId).default([]),
    /** More prerequisites: the unit waits for these too. */
    after: z.record(UnitId, z.array(UnitId)).default({}),
    /** Prerequisites to remove from a unit (it no longer waits for these). */
    drop: z.record(UnitId, z.array(UnitId)).default({}),
    /**
     * Where a trap or a quiz (by its id) is shown: with this unit rather than the first one whose stretch reaches it.
     * Never an earlier unit than that one.
     */
    place: z.record(z.string().min(1), UnitId).optional(),
  })
  .strict();
export type UnitOverrides = z.infer<typeof UnitOverrides>;

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
  /** Optional changes to the order of the study path and to what each unit waits for. */
  units: UnitOverrides.optional(),
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
