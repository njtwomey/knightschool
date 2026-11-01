import { z } from 'zod';

const share = z.number().min(0).max(1);
const range = z.object({ default: z.number(), min: z.number(), max: z.number() });

/**
 * The site's config (content/config.yaml): how teaching, judging, scheduling and timing work, for everyone. Library
 * functions take the part they need as an argument; no defaults live in code.
 */
export const SiteConfig = z.object({
  teach: z.object({
    stepMoves: z.number().int().positive(),
    stages: z.array(z.enum(['read', 'watch', 'try', 'mistakes', 'done'])),
    hintFadeAfterRight: z.number().int().positive(),
    hintReturnAfterWrong: z.number().int().positive(),
    triesBeforeShown: z.number().int().positive(),
    gates: z.boolean(),
    testOut: z.boolean(),
    firstStepOpen: z.boolean(),
  }),
  judge: z.object({
    grades: z.object({ best: share, excellent: share, good: share, inaccuracy: share, mistake: share }),
    evalWords: z.object({ equal: share, littleBetter: share, clearlyBetter: share }),
    refutationPlies: z.number().int().positive(),
    knownAfterRight: z.number().int().positive(),
    masteredDays: z.number().positive(),
    easyWithinMs: z.number().int().positive(),
  }),
  schedule: z.object({
    retention: share,
    maxIntervalDays: z.number().int().positive(),
    newPerDay: range,
    sessionSize: range,
  }),
  timing: z.record(z.string(), z.number().int().nonnegative()),
  coverage: z.object({
    band: z.object({ ratings: z.array(z.number().int()), speeds: z.array(z.string()) }),
    minShare: share,
    punishShare: share,
    punishLossCp: z.number().int().positive(),
  }),
  puzzles: z.object({
    levels: z.array(z.enum(['through', 'after', 'variation', 'family', 'structure', 'idea'])),
    perStep: z.number().int().nonnegative(),
    perOpening: z.number().int().positive(),
    select: z.object({ minRating: z.number(), maxRating: z.number(), minPopularity: z.number(), minPlays: z.number() }),
  }),
  opponent: z.object({
    playOnMoves: z.number().int().positive(),
    playOnTolerance: z.enum(['inaccuracy', 'mistake', 'blunder']),
    deviationJudgeAfter: z.number().int().positive(),
  }),
  engine: z.object({ liveDepth: z.number().int().positive(), bakedDepth: z.number().int().positive() }),
  lichess: z.object({ pauseAfter429Ms: z.number().int().positive(), cacheDays: z.number().positive() }),
});
export type SiteConfig = z.infer<typeof SiteConfig>;
export type GradeCutoffs = SiteConfig['judge']['grades'];
export type EvalWordBands = SiteConfig['judge']['evalWords'];
