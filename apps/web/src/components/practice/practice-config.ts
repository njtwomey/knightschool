import { Crosshair, MessageCircleQuestion, Puzzle, Repeat, Swords, Tag, Timer, type LucideIcon } from 'lucide-react';

/*
 * What a practice session is set up with, the same shape for every mode (docs/v2/components/practice-setup.md). The
 * page keeps the saved choice per mode (`knightschool.practice.<mode>`) and each session keeps its own copy.
 */

export type PracticeMode = 'review' | 'drill' | 'puzzles' | 'play-on' | 'speed' | 'name-it';

/** Where the items come from: `due`, `repertoire`, `everything`, `hardest`, or `opening:<id>`, `variation:<id>`, `rush:<id>`. */
export type PracticeSourceId = string;

export type PracticeConfig = {
  source: PracticeSourceId;
  weighting: 'random' | 'popular';
  /** Review: moves per question; 0 is the rest of the line. */
  movesPerQuestion: number;
  /** Drill: how the computer replies. */
  computerPlays: 'written' | 'level' | 'least-known' | 'engine';
  /** Puzzles. */
  puzzleCount: number;
  rating: [number, number];
  solver: 'you' | 'opponent' | 'both';
  /** Play on: how many moves, how much evaluation may be given away. */
  playOnMoves: number;
  playOnTolerance: 'inaccuracy' | 'mistake' | 'blunder';
  /** Speed: a set of lines (`lines:5`) or a timed run (`time:60`), and how deep (0 is the whole line). */
  run: string;
  depth: number;
  /** Name it. */
  positions: number;
};

export const DEFAULT_CONFIG: PracticeConfig = {
  source: 'repertoire',
  weighting: 'popular',
  movesPerQuestion: 1,
  computerPlays: 'level',
  puzzleCount: 10,
  rating: [900, 1300],
  solver: 'you',
  playOnMoves: 5,
  playOnTolerance: 'mistake',
  run: 'lines:5',
  depth: 10,
  positions: 10,
};

/** One opening or variation the learner can practise from, with what it holds. */
export type PracticeSource = {
  id: PracticeSourceId;
  name: string;
  group: 'opening' | 'variation';
  /** The opening a variation belongs to, for its label. */
  opening?: string;
  /** Items there are to practise from it in this mode; 0 disables Start. */
  count?: number;
};

export type ModeInfo = {
  name: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  /** Text and soft background in the mode's colour; modes without a colour are neutral. */
  text: string;
  soft: string;
};

/**
 * Every practice mode's tile: the set-up modes, and Questions (no set-up card of its own). Questions are review cards,
 * so they share Review's colour (only the counted modes have one, docs/v2/patterns/colours.md).
 */
export const MODE_INFO: Record<PracticeMode | 'questions', ModeInfo> = {
  review: {
    name: 'Review',
    title: 'Set up a review',
    blurb:
      'Moves you have learned come back on a spaced schedule. You play each one from its position, and your answer sets when it returns.',
    icon: Repeat,
    text: 'text-mode-review',
    soft: 'bg-mode-review/10',
  },
  drill: {
    name: 'Drill',
    title: 'Set up a drill',
    blurb:
      "Play an opening from the start while the computer picks the other side's replies, until every branch has been played once.",
    icon: Crosshair,
    text: 'text-mode-drill',
    soft: 'bg-mode-drill/10',
  },
  puzzles: {
    name: 'Puzzles',
    title: 'Set up puzzles',
    blurb:
      'Tactics puzzles from Lichess games that reached positions from your openings. Find the best moves for the side to play.',
    icon: Puzzle,
    text: 'text-mode-puzzle',
    soft: 'bg-mode-puzzle/10',
  },
  'play-on': {
    name: 'Play on',
    title: 'Set up Play on',
    blurb:
      'Continue from the end of a line against the engine. Each move you play is judged, and the aim is to keep the advantage the line gave you.',
    icon: Swords,
    text: 'text-mode-play-on',
    soft: 'bg-mode-play-on/10',
  },
  questions: {
    name: 'Questions',
    title: 'Questions',
    blurb: 'Written questions about why moves are played. You type an answer, and it is checked for the key idea.',
    icon: MessageCircleQuestion,
    text: 'text-mode-review',
    soft: 'bg-mode-review/10',
  },
  speed: {
    name: 'Speed',
    title: 'Set up a speed run',
    blurb:
      'Play a set of lines from memory as fast as you can. The other side replies instantly, and your time and mistakes are recorded.',
    icon: Timer,
    text: 'text-foreground',
    soft: 'bg-muted',
  },
  'name-it': {
    name: 'Name it',
    title: 'Set up Name it',
    blurb:
      'You see a position from your openings and type which opening and variation it is. The variation earns full credit, the opening half.',
    icon: Tag,
    text: 'text-foreground',
    soft: 'bg-muted',
  },
};

export const FIXED_SOURCES = {
  due: 'Due today (your schedule)',
  repertoire: 'My repertoire',
  everything: 'Everything',
  hardest: 'The hardest moves',
  'due-all': 'Everything due, ticked or not',
} as const;

export function sourceName(id: PracticeSourceId, sources: readonly PracticeSource[]): string {
  if (id in FIXED_SOURCES) return FIXED_SOURCES[id as keyof typeof FIXED_SOURCES];
  const found = sources.find((source) => source.id === id || `rush:${source.id.split(':')[1]}` === id);
  if (!found) return id;
  return id.startsWith('rush:') ? `an opening rush through the ${found.name}` : `the ${found.name}`;
}

const RUNS: Record<string, string> = {
  'lines:3': '3 lines',
  'lines:5': '5 lines',
  'lines:10': '10 lines',
  'time:30': '30 seconds',
  'time:60': '1 minute',
  'time:120': '2 minutes',
};
export const runName = (run: string) => RUNS[run] ?? run;
export const depthName = (depth: number) => (depth === 0 ? 'the whole line' : `to move ${depth}`);
export const SOLVER_NAME = { you: 'you solve', opponent: 'the opponent solves', both: 'both sides solve' } as const;
export const COMPUTER_NAME = {
  written: 'the computer plays the lines as written',
  level: 'the computer plays as your level does',
  'least-known': 'the branches you know least first',
  engine: 'the engine replies',
} as const;

export const TOLERANCE_NAME = { inaccuracy: 'an inaccuracy', mistake: 'a mistake', blunder: 'a blunder' } as const;

/** The session's set-up in words, for the practice bar. */
export function describeConfig(mode: PracticeMode, config: PracticeConfig, sources: readonly PracticeSource[]): string {
  const scheduled = isDueSource(config.source);
  const from = scheduled ? FIXED_SOURCES[config.source as 'due'] : `From ${sourceName(config.source, sources)}`;
  const parts = [from];
  if (!scheduled && config.weighting === 'popular') parts.push('favouring popular');
  if (mode === 'review') {
    parts.push(
      config.movesPerQuestion === 0
        ? 'the rest of the line per question'
        : `${config.movesPerQuestion} ${config.movesPerQuestion === 1 ? 'move' : 'moves'} per question`,
    );
  }
  if (mode === 'drill') parts.push(COMPUTER_NAME[config.computerPlays]);
  if (mode === 'puzzles')
    parts.push(
      `${config.puzzleCount} puzzles, ${config.rating[0]} to ${config.rating[1]}, ${SOLVER_NAME[config.solver]}`,
    );
  if (mode === 'play-on')
    parts.push(`${config.playOnMoves} moves, giving away no more than ${TOLERANCE_NAME[config.playOnTolerance]}`);
  if (mode === 'speed') parts.push(`${runName(config.run)} ${depthName(config.depth)}`);
  if (mode === 'name-it') parts.push(`${config.positions} positions`);
  return parts.join(', ');
}

/** The sources that are the schedule, so answers are saved: what is due, in the repertoire or all of it. */
export const isDueSource = (id: PracticeSourceId) => id === 'due' || id === 'due-all';

/** Why Start cannot go ahead with this choice, or null. */
export function cannotStart(config: PracticeConfig, sources: readonly PracticeSource[], due: number): string | null {
  if (config.source === 'due' && due === 0) return 'Nothing due. Pick My repertoire for free practice.';
  const source = sources.find((s) => s.id === config.source);
  if (source && source.count === 0) return `Nothing to practise in the ${source.name} yet. Pick another source.`;
  return null;
}
