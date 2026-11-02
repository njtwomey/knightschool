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
    /** The stages every step, follow-up and line is taught through, in order (docs/v2/pages/step.md). */
    stages: z.array(z.enum(['learn', 'try', 'done'])),
    triesBeforeShown: z.number().int().positive(),
    gates: z.boolean(),
    testOut: z.boolean(),
    firstStepOpen: z.boolean(),
    checkpointTries: z.number().int().positive(),
    checkpointMark: share,
    /** How many of each kind a variation's checkpoint asks. */
    checkpointMix: z.object({
      positions: z.number().int().nonnegative(),
      mistakes: z.number().int().nonnegative(),
      questions: z.number().int().nonnegative(),
      puzzles: z.number().int().nonnegative(),
    }),
    /** What an opening's final test adds to every branch of the opening. */
    finalTest: z.object({ puzzles: z.number().int().nonnegative(), playOn: z.number().int().nonnegative() }),
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
    reviewsFirstAt: z.number().int().nonnegative(),
  }),
  timing: z.object({
    correctBadge: z.number().int().nonnegative(),
    wrongBadge: z.number().int().nonnegative(),
    wrongHold: z.number().int().nonnegative(),
    afterCorrect: z.number().int().nonnegative(),
    opponent: z.number().int().nonnegative(),
    nextCard: z.number().int().nonnegative(),
    pieceMove: z.number().int().nonnegative(),
  }),
  coverage: z.object({
    band: z.object({ ratings: z.array(z.number().int()), speeds: z.array(z.string()) }),
    minShare: share,
    analyseShare: share,
    punishShare: share,
    punishLossCp: z.number().int().positive(),
  }),
  puzzles: z.object({
    levels: z.array(z.enum(['through', 'after', 'variation', 'family', 'structure', 'idea'])),
    perStep: z.number().int().nonnegative(),
    perOpening: z.number().int().positive(),
    rating: z.tuple([z.number().int(), z.number().int()]),
    ratingFalloff: z.number().positive(),
    select: z.object({ minRating: z.number(), maxRating: z.number(), minPopularity: z.number(), minPlays: z.number() }),
  }),
  opponent: z.object({
    playOnMoves: z.number().int().positive(),
    playOnTolerance: z.enum(['inaccuracy', 'mistake', 'blunder']),
    deviationJudgeAfter: z.number().int().positive(),
  }),
  engine: z.object({ liveDepth: z.number().int().positive(), bakedDepth: z.number().int().positive() }),
  lichess: z.object({ pauseAfter429Ms: z.number().int().positive(), cacheDays: z.number().positive() }),
  practice: z.object({
    speedLines: z.number().int().positive(),
    speedSeconds: z.number().int().positive(),
    countdownSeconds: z.number().int().nonnegative(),
    nameItPositions: z.number().int().positive(),
  }),
  /** Defaults and ranges of learner settings that no key above sets (the registry reads them: settings/registry.ts). */
  settings: z.object({
    retention: z.object({ min: share, max: share }),
    feedbackSpeeds: z.object({
      slow: z.number().positive(),
      normal: z.number().positive(),
      fast: z.number().positive(),
    }),
    engineDepth: range,
    engineLines: range,
    explorerMinShare: share,
    gamesCount: range,
    boardSizeCapRem: range,
    previewDelayMs: range,
  }),
  /** Named bundles of learner setting values; each is checked against the registry by `checkPresets`. */
  presets: z.object({
    default: z.string(),
    list: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          for: z.string(),
          highlights: z.array(z.string()),
          values: z.record(z.string(), z.unknown()),
        }),
      )
      .min(1),
  }),
});
export type SiteConfig = z.infer<typeof SiteConfig>;
export type GradeCutoffs = SiteConfig['judge']['grades'];
export type EvalWordBands = SiteConfig['judge']['evalWords'];
