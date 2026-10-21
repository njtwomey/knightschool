import {
  MOVES_PER_QUESTION,
  type MovesPerQuestion,
  type OpeningIndexEntry,
  SPEED_DEPTHS,
  type SpeedDepth,
  type Weighting,
} from '@knightschool/core';
import { whenStorageReady } from '@/data/storage';
import { getEnrolled } from '@/data/training-settings';
import { createPrefStore, oneOf, type PrefSchema, readPref, writePref } from '@/lib/local-prefs';

/**
 * How Quiz, Name it and Speed are set up: one saved choice per mode, all with a source and a weighting, each with its
 * own few fields. A session takes a copy when it starts, so changing the set-up never touches a session under way.
 */

export type PracticeMode = 'quiz' | 'name-it' | 'speed';

/**
 * Where practice draws from: the courses being learned, every course, or one course by id. Quiz adds "due" (the review
 * schedule) and Speed an opening rush (`rush:<course>`: the passed units of one course).
 */
export type PracticeSource = 'learning' | 'all' | (string & {});

/** The quiz's scheduled session; any other quiz source is free practice, never saved. */
export const DUE = 'due';

const RUSH = 'rush:';
/** The source for an opening rush on one course: lines made of the units of its path already passed. */
export const rushSource = (course: string) => `${RUSH}${course}`;
/** The course of an opening rush source, or undefined for any other source. */
export const rushCourse = (source: string) => (source.startsWith(RUSH) ? source.slice(RUSH.length) : undefined);

type Shared = { source: PracticeSource; weighting: Weighting };

export type QuizConfig = Shared & {
  /** How many of your moves a question runs for: after the answer the line carries on, up to this many (0: to its end). */
  moves: MovesPerQuestion;
};

export const NAME_IT_POSITIONS = [5, 10, 20] as const;
export type NameItConfig = Shared & { positions: (typeof NAME_IT_POSITIONS)[number] };

export const SPEED_LINES = [3, 5, 10] as const;
export const SPEED_SECONDS = [30, 60, 120] as const;
export type SpeedConfig = Shared & {
  /** A fixed number of lines, or as many moves as you can make before the time is up. */
  run: 'lines' | 'timed';
  lines: (typeof SPEED_LINES)[number];
  seconds: (typeof SPEED_SECONDS)[number];
  /** How deep each line goes: up to this move number, or the whole line (0). An opening rush ignores it. */
  depth: SpeedDepth;
};

export type PracticeConfigs = { quiz: QuizConfig; 'name-it': NameItConfig; speed: SpeedConfig };
export type PracticeConfig<M extends PracticeMode = PracticeMode> = PracticeConfigs[M];

export const PRACTICE_DEFAULTS: PracticeConfigs = {
  quiz: { source: DUE, weighting: 'random', moves: 1 },
  'name-it': { source: 'learning', weighting: 'random', positions: 10 },
  speed: { source: 'learning', weighting: 'random', run: 'lines', lines: 5, seconds: 60, depth: 10 },
};

const sourceOf =
  (...extra: ('due' | 'rush')[]) =>
  (value: unknown) =>
    typeof value === 'string' &&
    value !== '' &&
    (value !== DUE || extra.includes('due')) &&
    (!value.startsWith(RUSH) || extra.includes('rush'));
const weighting = oneOf<Weighting>(['random', 'popular']);

const SCHEMAS: { [M in PracticeMode]: PrefSchema<PracticeConfigs[M]> } = {
  quiz: { source: sourceOf('due'), weighting, moves: oneOf(MOVES_PER_QUESTION) },
  'name-it': { source: sourceOf(), weighting, positions: oneOf(NAME_IT_POSITIONS) },
  speed: {
    source: sourceOf('rush'),
    weighting,
    run: oneOf(['lines', 'timed']),
    lines: oneOf(SPEED_LINES),
    seconds: oneOf(SPEED_SECONDS),
    depth: oneOf(SPEED_DEPTHS),
  },
};

export const practiceKey = (mode: PracticeMode) => `knightschool.practice.${mode}`;

/** Where each mode kept its choices before they shared one shape, and how to read them into the new one. */
const OLD_KEYS: { [M in PracticeMode]: { keys: string[]; read: (raw: (key: string) => string | null) => object } } = {
  quiz: {
    keys: ['knightschool.quiz.source', 'knightschool.quiz.weighting', 'knightschool.quiz.moves'],
    read: (raw) => ({
      source: raw('knightschool.quiz.source'),
      weighting: raw('knightschool.quiz.weighting'),
      moves: Number(raw('knightschool.quiz.moves') ?? NaN),
    }),
  },
  'name-it': {
    keys: ['knightschool.guess.source', 'knightschool.guess.weighting'],
    read: (raw) => ({ source: raw('knightschool.guess.source'), weighting: raw('knightschool.guess.weighting') }),
  },
  speed: {
    keys: ['knightschool.speed'],
    read: (raw) => {
      let old: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(raw('knightschool.speed') ?? '{}');
        if (parsed && typeof parsed === 'object') old = parsed as Record<string, unknown>;
      } catch {
        // nothing to carry over
      }
      const { mode, ...rest } = old;
      return { ...rest, run: mode };
    },
  },
};

/**
 * Carries a mode's choices over from its old keys, once: only while the new key is unset, and the old keys are removed
 * afterwards. Values the new shape does not accept fall back to the defaults when it is read.
 */
export function migratePracticePrefs(mode: PracticeMode): void {
  const raw = (key: string) => readPref<string | null>(key, (value) => value, null);
  if (raw(practiceKey(mode)) !== null) return;
  const old = OLD_KEYS[mode];
  if (old.keys.every((key) => raw(key) === null)) return;
  writePref(practiceKey(mode), JSON.stringify(old.read(raw)));
  for (const key of old.keys) writePref(key, null);
}

function practiceStore<M extends PracticeMode>(mode: M) {
  migratePracticePrefs(mode);
  return createPrefStore<PracticeConfigs[M]>(practiceKey(mode), SCHEMAS[mode], PRACTICE_DEFAULTS[mode]);
}

/** The saved set-up of each mode: what the set-up card opens with and what Start saves. */
export const practiceConfig = {
  quiz: practiceStore('quiz'),
  'name-it': practiceStore('name-it'),
  speed: practiceStore('speed'),
};

/** A mode's saved set-up, without the store's own functions. */
export function savedConfig<M extends PracticeMode>(mode: M): PracticeConfigs[M] {
  const state = practiceConfig[mode].getState() as unknown as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(SCHEMAS[mode]).map((field) => [field, state[field]]),
  ) as unknown as PracticeConfigs[M];
}

/** Saves a mode's set-up, as Start does. */
export const saveConfig = <M extends PracticeMode>(mode: M, config: PracticeConfigs[M]) =>
  (practiceConfig[mode].getState().set as (patch: Partial<PracticeConfigs[M]>) => void)(config);

/** The courses a source means. "Learning" is everything when nothing is enrolled yet, so it is never empty. */
export function coursesFor(source: PracticeSource, index: OpeningIndexEntry[], enrolled: string[]) {
  if (source === 'all') return index;
  if (source === 'learning') return enrolled.length ? index.filter((course) => enrolled.includes(course.id)) : index;
  return index.filter((course) => course.id === source);
}

/**
 * The courses practice draws from for a source, used by all three modes: the courses being learned (read from the
 * database; everything when none is), every course, or one course. A course that is no longer there means the courses
 * being learned.
 */
export async function resolvePool(source: PracticeSource, index: OpeningIndexEntry[]): Promise<OpeningIndexEntry[]> {
  const known = source === 'all' || source === 'learning' || index.some((course) => course.id === source);
  const chosen = known ? source : 'learning';
  const enrolled =
    chosen === 'learning'
      ? await whenStorageReady()
          .then(({ storage }) =>
            getEnrolled(
              storage,
              index.map((course) => course.id),
            ),
          )
          .catch(() => [] as string[])
      : [];
  return coursesFor(chosen, index, enrolled);
}

/** A source in words, as the set-up's summary line puts it. */
export function sourceText(source: PracticeSource, index: readonly OpeningIndexEntry[]): string {
  const name = (id: string) => index.find((course) => course.id === id)?.name ?? id;
  const rush = rushCourse(source);
  if (source === DUE) return 'Due today (your schedule)';
  if (rush) return `Opening rush on ${name(rush)}`;
  if (source === 'learning') return 'From the courses I am learning';
  if (source === 'all') return 'From everything';
  return `From ${name(source)}`;
}

export const movesText = (moves: MovesPerQuestion) =>
  moves === 0 ? 'the rest of the line' : moves === 1 ? '1 move' : `up to ${moves} moves`;
export const depthText = (depth: SpeedDepth) => (depth === 0 ? 'the whole line' : `to move ${depth}`);
export const secondsText = (seconds: number) =>
  seconds === 60 ? '1 minute' : seconds % 60 === 0 ? `${seconds / 60} minutes` : `${seconds} seconds`;

/** A set-up in one line, for the summary above the board: "From everything, favouring popular · 10 positions". */
export function describeConfig<M extends PracticeMode>(
  mode: M,
  config: PracticeConfigs[M],
  index: readonly OpeningIndexEntry[],
): string {
  const parts = [sourceText(config.source, index)];
  if (config.source !== DUE) parts[0] += config.weighting === 'popular' ? ', favouring popular' : ', at random';
  if (mode === 'quiz') {
    const quiz = config as QuizConfig;
    parts.push(`${movesText(quiz.moves)} per question`);
    if (quiz.source !== DUE) parts.push('free practice, not saved');
  } else if (mode === 'name-it') {
    parts.push(`${(config as NameItConfig).positions} positions`);
  } else {
    const speed = config as SpeedConfig;
    parts.push(speed.run === 'timed' ? `${secondsText(speed.seconds)} against the clock` : `${speed.lines} lines`);
    if (!rushCourse(speed.source)) parts.push(depthText(speed.depth));
  }
  return parts.join(' · ');
}
