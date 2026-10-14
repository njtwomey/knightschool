import type {
  Card,
  EvalCache,
  ExplorerCache,
  GuessAttempt,
  QuizAttempt,
  Review,
  SpeedAttempt,
} from '@knightschool/core/schema';

export const T0 = '2026-10-13T10:00:00.000Z';
export const at = (minutes: number) => new Date(Date.parse(T0) + minutes * 60_000).toISOString();

export const card = (id: string, over: Partial<Card> = {}): Card => ({
  id,
  openingId: 'italian-game',
  epd: `epd-${id}`,
  expectedUci: 'e2e4',
  due: T0,
  stability: 0,
  difficulty: 0,
  scheduledDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  state: 'new',
  lastReview: null,
  at: T0,
  ...over,
});

export const review = (id: string, cardId: string, over: Partial<Review> = {}): Review => ({
  id,
  cardId,
  at: T0,
  rating: 'good',
  playedUci: 'e2e4',
  msToAnswer: 2400,
  hintUsed: false,
  sessionId: 'session-1',
  ...over,
});

export const attempt = (id: string, over: Partial<QuizAttempt> = {}): QuizAttempt => ({
  id,
  quizId: 'quiz-1',
  at: T0,
  answer: 'it drops the rook',
  matched: true,
  msToAnswer: 5000,
  ...over,
});

export const guess = (id: string, over: Partial<GuessAttempt> = {}): GuessAttempt => ({
  id,
  at: T0,
  epd: 'epd-1',
  answer: 'caro kann',
  result: 'partial',
  msToAnswer: 4000,
  ...over,
});

export const speed = (id: string, over: Partial<SpeedAttempt> = {}): SpeedAttempt => ({
  id,
  at: T0,
  courseId: 'italian-game',
  lineId: 'giuoco-pianissimo',
  moves: 10,
  errors: 1,
  totalMs: 14000,
  slowestMs: 3200,
  ...over,
});

export const evalLine = (multipv: number, over: Partial<EvalCache> = {}): EvalCache => ({
  epd: 'epd-1',
  depth: 18,
  multipv,
  cp: 25 - multipv * 10,
  mate: null,
  pv: 'e2e4 e7e5',
  engine: 'sf18-lite-single',
  at: T0,
  ...over,
});

export const explorerEntry = (over: Partial<ExplorerCache> = {}): ExplorerCache => ({
  key: 'epd-1|lichess|blitz,rapid|1000,1200,1400,1600',
  epd: 'epd-1',
  db: 'lichess',
  speeds: 'blitz,rapid',
  ratings: '1000,1200,1400,1600',
  white: 10,
  draws: 5,
  black: 8,
  moves: [{ uci: 'e2e4', san: 'e4', white: 6, draws: 3, black: 4 }],
  openingName: "King's Pawn Game",
  fetchedAt: T0,
  ...over,
});
