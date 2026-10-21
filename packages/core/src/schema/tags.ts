import { z } from 'zod';

// The vocabulary the content schemas share.

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

/** A kebab-case id: file names, course and line ids. */
export const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case only');

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
