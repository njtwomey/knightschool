import { z } from 'zod';

const Instant = z.iso.datetime();

export const Card = z.object({
  id: z.string(), // `${openingId}:${epd}`: one card per (opening, position where it is our move)
  openingId: z.string(),
  epd: z.string(),
  expectedUci: z.string(),
  // FSRS state, stored as ts-fsrs produces it
  due: Instant,
  stability: z.number(),
  difficulty: z.number(),
  scheduledDays: z.number().int(),
  learningSteps: z.number().int(),
  reps: z.number().int(),
  lapses: z.number().int(),
  state: z.enum(['new', 'learning', 'review', 'relearning']),
  lastReview: Instant.nullable(),
  at: Instant, // last change; the newer copy wins when two devices are merged
});
export type Card = z.infer<typeof Card>;

/** Append-only log; this is the thing to reflect on later. */
export const Review = z.object({
  id: z.string(),
  cardId: z.string(),
  at: Instant,
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  playedUci: z.string().nullable(), // what the learner actually played
  msToAnswer: z.number().int(),
  hintUsed: z.boolean(),
  sessionId: z.string(),
});
export type Review = z.infer<typeof Review>;

export const QuizAttempt = z.object({
  id: z.string(),
  quizId: z.string(),
  at: Instant,
  answer: z.string(),
  matched: z.boolean(),
  msToAnswer: z.number().int(),
});
export type QuizAttempt = z.infer<typeof QuizAttempt>;

/** One answer in "Name That Opening": a position, what was typed, and how close it was. Append-only. */
export const GuessAttempt = z.object({
  id: z.string(),
  at: Instant,
  epd: z.string(),
  answer: z.string(),
  result: z.enum(['full', 'partial', 'miss']),
  msToAnswer: z.number().int(),
});
export type GuessAttempt = z.infer<typeof GuessAttempt>;

/** One line played in "Speed": how long your moves took and how many you got wrong on the way. Append-only. */
export const SpeedAttempt = z.object({
  id: z.string(),
  at: Instant,
  courseId: z.string(),
  lineId: z.string(),
  /** Your moves in the line. */
  moves: z.number().int(),
  /** Wrong moves tried before the right ones. */
  errors: z.number().int(),
  /** Hints asked for (each costs nothing on the clock, but is counted). */
  hints: z.number().int().default(0),
  /** Time from your turn starting to the right move, summed over your moves. */
  totalMs: z.number().int(),
  /** The slowest single move. */
  slowestMs: z.number().int(),
});
export type SpeedAttempt = z.infer<typeof SpeedAttempt>;

/** Engine results, so a line is measured once. cp and mate are from White's point of view. */
export const EvalCache = z.object({
  epd: z.string(),
  depth: z.number().int(),
  multipv: z.number().int(),
  cp: z.number().nullable(),
  mate: z.number().nullable(),
  pv: z.string(), // UCI moves, space separated
  engine: z.string(), // 'sf18-lite-single'
  at: Instant,
});
export type EvalCache = z.infer<typeof EvalCache>;

export const Setting = z.object({ key: z.string(), value: z.string(), at: Instant });
export type Setting = z.infer<typeof Setting>;

export const ExplorerMove = z.object({
  uci: z.string(),
  san: z.string(),
  white: z.number().int(),
  draws: z.number().int(),
  black: z.number().int(),
});
export type ExplorerMove = z.infer<typeof ExplorerMove>;

/** So a position is asked of Lichess at most once a month per device. */
export const ExplorerCache = z.object({
  key: z.string(), // `${epd}|${db}|${speeds}|${ratings}`
  epd: z.string(),
  db: z.enum(['lichess', 'masters']),
  speeds: z.string(), // 'blitz,rapid'
  ratings: z.string(), // '1000,1200,1400,1600'
  white: z.number().int(),
  draws: z.number().int(),
  black: z.number().int(),
  moves: z.array(ExplorerMove),
  openingName: z.string().nullable(),
  fetchedAt: Instant,
});
export type ExplorerCache = z.infer<typeof ExplorerCache>;
