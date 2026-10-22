import { z } from 'zod';
import { Opening } from './built';
import { LineKind, Side, Slug, TrapKind } from './tags';

// The catalog: the course list (index.json) and the openings, motifs and study order that frame it.

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
  /** True for a course written in the app (Create): the learner pages offer to edit it. */
  authored: z.boolean().optional(),
  /** The course's opening page on Lichess (`lichessUrlForCourse`). */
  lichess: z.string().optional(),
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
      /** The line's opening page on Lichess (`lichessUrlForLine`). */
      lichess: z.string().optional(),
      /** Other courses that list this line too ("also in"). */
      alsoIn: z.array(Slug).default([]),
      /** Where the line grows out of the tree: the chapter it branches from and the move it follows ("5.c3"). */
      branch: z.object({ parent: Slug, after: z.string() }).optional(),
    }),
  ),
});
export type OpeningIndexEntry = z.infer<typeof OpeningIndexEntry>;

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

/** public/content/chapters.json: the tree's chapters as written, so the app can merge authored chapters with them. */
export const ShippedChapters = z.array(z.object({ id: z.string(), source: z.string(), pgn: z.string() }));
export type ShippedChapters = z.infer<typeof ShippedChapters>;
