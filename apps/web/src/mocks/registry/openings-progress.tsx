import { replay } from '@knightschool/core';
import { useState } from 'react';
import { Board } from '@/components/board/board';
import type { Idea } from '@/components/chess/idea-badge';
import type { RunMove } from '@/components/chess/move-run';
import { LineRow, LineTable, type LineData } from '@/components/openings/line-row';
import { LineStory, type StoryMove } from '@/components/openings/line-story';
import { OpeningCard } from '@/components/openings/opening-card';
import { OpeningIntro } from '@/components/openings/opening-intro';
import { RepertoireSlots, type RepertoireSlot } from '@/components/openings/repertoire-slots';
import { SourcesList } from '@/components/openings/sources-list';
import { StepRow } from '@/components/openings/step-row';
import type { StepData } from '@/components/openings/steps';
import type { OpeningSummary, Source } from '@/components/openings/types';
import { VariationList, type VariationData } from '@/components/openings/variation-list';
import { ActivityCalendar, type ActivityDay } from '@/components/progress/activity-calendar';
import { CoverageMeter, type CoverageRow } from '@/components/progress/coverage-meter';
import { DueCard } from '@/components/progress/due-card';
import { GapLink, type Gap } from '@/components/progress/gap-link';
import type { ModeId } from '@/components/progress/modes';
import { ModeCounts } from '@/components/progress/mode-counts';
import { NextAction } from '@/components/progress/next-action';
import type { NextState } from '@/components/progress/next-action-pickers';
import { ProgressRing } from '@/components/progress/progress-ring';
import { StateBadge } from '@/components/progress/state-badge';
import { PROGRESS_STATES } from '@/components/progress/states';
import { Streak } from '@/components/progress/streak';
import { Button } from '@/components/ui/button';
import { example, explorerMoves, gamesAt, line, mainLine, scoreOf } from '../fixtures/example';
import type { MockItem } from './types';

/*
 * Data for these mocks. Moves, positions, comments, evaluations, explorer counts and puzzles come from the one example
 * (the Italian Game); progress, counts, dates and coverage are made up but believable, and say so in their notes.
 */

const m = mainLine.moves;
const d5Line = line('giuoco-piano-d5').moves;
const bg4Line = line('giuoco-piano-bg4').moves;
const legal = line('legal-mate').moves;
const START = m[0]!.before;

/** Moves from the start as chips' input, played with chess.js. */
const played = (sans: string[]): RunMove[] =>
  replay(START, sans).map((p) => ({ san: p.san, uci: p.uci, after: p.epd }));
const thumbAfter = (sans: string[], orientation: 'white' | 'black') => {
  const moves = replay(START, sans);
  const last = moves[moves.length - 1]!;
  return { epd: last.epd, lastMove: { from: last.from, to: last.to }, orientation };
};

// ---------------------------------------------------------------- progress basics

const italianProgress = { total: 42, known: 26, mastered: 9, learning: 6 };
const italianModes = {
  learn: { known: 9, total: 28, newToday: 4 },
  review: { due: 6 },
  drill: { clean: 4, total: 18 },
  puzzles: { solved: 3, total: 15 },
  playOn: { held: 1, total: 3 },
};
const href = '#';
const modeHrefs: Partial<Record<ModeId, string>> = {
  learn: href,
  review: href,
  drill: href,
  puzzles: href,
  playOn: href,
};

function RingThatGrows() {
  const [counts, setCounts] = useState({ total: 12, known: 3, mastered: 1, learning: 4 });
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ProgressRing counts={counts} size="md" label="long" />
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          setCounts((c) =>
            c.known >= c.total
              ? { total: 12, known: 3, mastered: 1, learning: 4 }
              : {
                  ...c,
                  known: c.known + 1,
                  mastered: Math.min(c.known, c.mastered + (c.known % 2)),
                  learning: Math.max(0, c.learning - 1),
                },
          )
        }
      >
        Answer one more right
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- coverage and gaps

const band = '1000 to 1600';
const whiteCoverage: CoverageRow = {
  label: 'As White',
  games: 'games with your 1.e4',
  depths: [
    { move: 5, known: 0.46, covered: 0.52 },
    { move: 10, known: 0.29, covered: 0.38 },
    { move: 15, known: 0.14, covered: 0.24 },
  ],
  gain: { name: 'Two Knights Defense', share: 0.05 },
  mapHref: '/map/white',
};
const e4Coverage: CoverageRow = {
  label: 'Against 1.e4',
  games: 'games where White plays 1.e4',
  depths: [
    { move: 5, known: 0.92, covered: 0.95 },
    { move: 10, known: 0.71, covered: 0.8 },
    { move: 15, known: 0.48, covered: 0.61 },
  ],
  gain: { name: 'Advance Variation', share: 0.09 },
  mapHref: '/map/e4',
};
const d4Coverage: CoverageRow = {
  label: 'Against 1.d4',
  games: 'games where White plays 1.d4',
  depths: [
    { move: 5, known: 0.31, covered: 0.83 },
    { move: 10, known: 0.12, covered: 0.6 },
    { move: 15, known: 0.04, covered: 0.39 },
  ],
  missingData: true,
  mapHref: '/map/d4',
};

/** A reply's share of games after 1.e4, from the example's explorer counts (1000 to 1600, blitz and rapid). */
function shareAfterE4(sans: string[]): number {
  const before = replay(START, sans.slice(0, -1));
  const parent = before.length ? before[before.length - 1]!.epd : START;
  const games = explorerMoves(parent).find((move) => move.san === sans[sans.length - 1])?.games ?? 0;
  return games / (gamesAt(m[0]!.after) ?? 1);
}
const gap = (sans: string[], fill: Gap['fill']): Gap => ({ moves: played(sans), share: shareAfterE4(sans), fill });
const sicilianGap = gap(['e4', 'c5'], { kind: 'unanswered', opening: 'Alapin Sicilian', href });
const frenchGap = gap(['e4', 'e6'], { kind: 'unanswered', opening: 'Advance French', href });
const scandiGap = gap(['e4', 'd5'], { kind: 'none', mapHref: '/map/white' });
const caroGap = gap(['e4', 'c6'], { kind: 'unanswered', opening: 'Advance Caro-Kann', href });
const philidorGap = gap(['e4', 'e5', 'Nf3', 'd6'], {
  kind: 'unlearned',
  opening: 'Italian Game',
  step: 7,
  stepName: 'Philidor Defense',
  href,
});
const twoKnightsGap = gap(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], {
  kind: 'unlearned',
  opening: 'Italian Game',
  step: 9,
  stepName: 'Two Knights Defense',
  href,
});

// ---------------------------------------------------------------- activity

/** A seeded random number, so the made-up calendar is the same on every visit. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TODAY = '2026-11-01';
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MODES: ModeId[] = ['review', 'review', 'review', 'learn', 'learn', 'drill', 'puzzles'];

/** A made-up year of practice: most days, some gaps, a six-day streak ending today. */
function madeUpYear(days: number, startOffset = 0): ActivityDay[] {
  const random = seeded(7);
  const out: ActivityDay[] = [];
  const today = new Date(2026, 10, 1, 12);
  for (let back = days - 1; back >= startOffset; back--) {
    const date = new Date(today.getTime() - back * 86_400_000);
    const inStreak = back < 6;
    const breakDay = back === 6;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const practises = inStreak || (!breakDay && random() < (weekend ? 0.55 : 0.78));
    if (!practises) {
      random();
      continue;
    }
    const answers = Math.round(4 + random() ** 1.6 * 70);
    out.push({
      date: dayKey(date),
      answers,
      right: Math.round(answers * (0.72 + random() * 0.22)),
      stepsKnown: random() < 0.15 ? 1 + Math.floor(random() * 2) : undefined,
      topMode: MODES[Math.floor(random() * MODES.length)],
    });
  }
  return out;
}
const year = madeUpYear(364);
const recent = madeUpYear(40);

// ---------------------------------------------------------------- next action

const baseNext: NextState = { hasRepertoire: true, due: 0, dueHref: '/review#start=due', newLeftToday: 0 };
const alternatives = [
  { label: 'a puzzle from your openings', href, hint: 'One Lichess puzzle from the Giuoco Piano, at your level.' },
  { label: 'your biggest gap', href, hint: 'Learn the reply to 1...c5, about 1 game in 7 at your level.' },
  { label: 'a Speed run', href, hint: 'Five lines from memory against the clock; never changes your schedule.' },
];

// ---------------------------------------------------------------- openings

const italian: OpeningSummary = {
  id: 'italian-white',
  name: example.opening.name,
  eco: example.opening.eco,
  side: 'white',
  trigger: 'As White',
  suits: example.opening.about.suits,
  style: ['classical', 'trap-heavy'],
  level: 'beginners',
  thumb: { epd: m[4]!.after, lastMove: { from: 'f1', to: 'c4' }, orientation: 'white' },
  size: { variations: 6, steps: 28, hours: 3 },
  started: { progress: italianProgress, modes: italianModes, due: 6 },
  href,
};
const caroKann: OpeningSummary = {
  id: 'caro-kann',
  name: 'Caro-Kann Defense',
  eco: 'B10',
  side: 'black',
  trigger: 'Against 1.e4',
  suits: 'Players who like a solid pawn chain and few early tactics.',
  style: ['solid'],
  level: 'beginners',
  thumb: thumbAfter(['e4', 'c6'], 'black'),
  size: { variations: 5, steps: 22, hours: 2 },
  href,
};
const caroStarted: OpeningSummary = {
  ...caroKann,
  started: {
    progress: { total: 30, known: 11, mastered: 2, learning: 5 },
    modes: { learn: { known: 4, total: 22 }, review: { due: 5 }, puzzles: { solved: 1, total: 9 } },
    due: 5,
  },
};
const qgd: OpeningSummary = {
  id: 'qgd',
  name: "Queen's Gambit Declined",
  eco: 'D30',
  side: 'black',
  trigger: 'Against 1.d4',
  suits: 'Patient players happy to defend a little and hit back in the centre.',
  style: ['solid', 'classical'],
  level: 'improvers',
  thumb: thumbAfter(['d4', 'd5', 'c4', 'e6'], 'black'),
  size: { variations: 4, steps: 19, hours: 2 },
  href,
};
const slav: OpeningSummary = {
  id: 'slav',
  name: 'Slav Defense',
  eco: 'D10',
  side: 'black',
  trigger: 'Against 1.d4',
  suits: 'A solid answer that keeps the light-squared bishop free.',
  style: ['solid'],
  level: 'beginners',
  thumb: thumbAfter(['d4', 'd5', 'c4', 'c6'], 'black'),
  size: { variations: 4, steps: 17, hours: 2 },
  href,
};
const ruy: OpeningSummary = {
  id: 'ruy-lopez',
  name: 'Ruy Lopez',
  eco: 'C60',
  side: 'white',
  trigger: 'As White',
  suits: 'Players ready for longer plans and a slow squeeze.',
  style: ['classical'],
  level: 'improvers',
  thumb: thumbAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'white'),
  size: { variations: 7, steps: 34, hours: 4 },
  started: {
    progress: { total: 55, known: 4, mastered: 0, learning: 3 },
    modes: { learn: { known: 1, total: 34 }, review: { due: 0 } },
  },
  href,
};
const scotch: OpeningSummary = {
  id: 'my-scotch',
  name: 'Scotch Game',
  eco: 'C44',
  side: 'white',
  trigger: 'As White',
  suits: 'My own notes on the Scotch: open lines and quick development.',
  style: ['attacking'],
  level: 'improvers',
  thumb: thumbAfter(['e4', 'e5', 'Nf3', 'Nc6', 'd4'], 'white'),
  size: { variations: 2, steps: 6, hours: 1 },
  authored: true,
  editHref: '/create/my-scotch',
  href,
};

const e4Why = 'Half your games as Black start with 1.e4: choose what to play against it.';
const d4Why = 'About a quarter of your games as Black start with 1.d4: choose what to play against it.';
const whiteWhy = 'Every game as White starts with your first move: choose an opening to play.';

function slotsOf(filled: boolean): RepertoireSlot[] {
  return [
    {
      id: 'white',
      label: 'As White',
      why: whiteWhy,
      openings: filled ? [italian, ruy] : [],
      coverage: whiteCoverage.depths[1],
      games: whiteCoverage.games,
    },
    {
      id: 'e4',
      label: 'Against 1.e4',
      why: e4Why,
      openings: filled ? [caroStarted] : [],
      coverage: e4Coverage.depths[1],
      games: e4Coverage.games,
    },
    { id: 'd4', label: 'Against 1.d4', why: d4Why, openings: [] },
  ];
}
const choices = { white: [italian, ruy, scotch], e4: [caroKann], d4: [qgd, slav] };

/** The slots with Choose, Change, Remove and Make main working on local state. */
function EditableSlots() {
  const [slots, setSlots] = useState(() => slotsOf(true));
  const update = (id: string, change: (openings: OpeningSummary[]) => OpeningSummary[]) =>
    setSlots((all) => all.map((slot) => (slot.id === id ? { ...slot, openings: change(slot.openings) } : slot)));
  return (
    <RepertoireSlots
      slots={slots}
      editable
      band={band}
      choices={choices}
      onChoose={(id, opening) => update(id, (openings) => [opening, ...openings.filter((o) => o.id !== opening.id)])}
      onRemove={(id, opening) => update(id, (openings) => openings.filter((o) => o.id !== opening.id))}
      onMakeMain={(id, opening) => update(id, (openings) => [opening, ...openings.filter((o) => o.id !== opening.id)])}
    />
  );
}

// ---------------------------------------------------------------- the intro

const ideas: Idea[] = [
  {
    id: 'italian-bishop',
    name: 'Italian bishop',
    kind: 'plan',
    summary: 'The bishop on c4 aims at f7, the square only the king defends.',
  },
  {
    id: 'f7-weakness',
    name: 'f7 weakness',
    kind: 'tactic',
    summary: 'Early on, f7 is guarded only by the king: a bishop and a knight or queen can hit it together.',
    example: { epd: legal[13]!.after, orientation: 'white' },
  },
  {
    id: 'castle-early',
    name: 'Castle early',
    kind: 'principle',
    summary: 'Get the king to safety before opening the centre.',
  },
  {
    id: 'd4-break',
    name: 'd4 break',
    kind: 'plan',
    summary: 'Prepared by c3, the pawn push to d4 claims the centre once the pieces are out.',
  },
];
const sources: Source[] = [
  {
    kind: 'video',
    title: 'The Italian Game, a complete guide',
    author: 'A chess channel (placeholder)',
    url: 'https://example.org/italian-video',
    note: 'the plan with c3 and d3',
  },
  {
    kind: 'study',
    title: 'Giuoco Piano model games',
    author: 'Lichess study (placeholder)',
    url: 'https://lichess.org/study',
    note: 'the knight route Nbd2, Nf1, Ng3',
  },
  {
    kind: 'book',
    title: 'An opening book for club players',
    author: 'An author (placeholder)',
    url: 'https://example.org/book',
  },
];
const about = {
  ...example.opening.about,
  idea: 'Develop quickly and aim the bishop at f7 with {3. Bc4}, then castle and prepare the [[the d4 break|idea:d4-break]] with {4. c3}.',
  origin:
    'One of the oldest openings in chess. Gioachino Greco’s games from the 1620s already show the attack on f7, and the name Giuoco Piano is Italian for “the quiet game”: the slow plan with c3 and d3 that most club players meet today.',
};
const introContext = { startEpd: START, moves: m };

// ---------------------------------------------------------------- steps and variations

const step1: StepData = {
  id: 'giuoco-piano-main:1',
  number: 1,
  title: 'Bishop to c4, aiming at f7',
  state: 'mastered',
  side: 'white',
  stretches: [{ moves: m.slice(0, 7), firstPly: 0 }],
  known: [0, 2, 4, 6],
  counts: { mine: 4, known: 4, inReviews: 4 },
  stage: 2,
};
const step2: StepData = {
  id: 'giuoco-piano-main:2',
  number: 2,
  title: 'Castle, then Re1 and Bb3',
  state: 'learning',
  side: 'white',
  lead: { moves: m.slice(5, 7), firstPly: 5 },
  stretches: [{ moves: m.slice(7, 15), firstPly: 7 }],
  known: [8, 10],
  counts: { mine: 4, known: 2, inReviews: 3 },
  stage: 1,
};
const step3: StepData = {
  id: 'giuoco-piano-side:1',
  number: 3,
  title: 'Black’s other tries: ...d5 and ...Bg4',
  state: 'open',
  side: 'white',
  lead: { moves: d5Line.slice(7, 9), firstPly: 7 },
  stretches: [
    { moves: d5Line.slice(9, 13), firstPly: 9 },
    { moves: bg4Line.slice(11, 15), firstPly: 11 },
  ],
  counts: { mine: 4, known: 0, inReviews: 0 },
};
const step4: StepData = {
  id: 'legal-mate:1',
  number: 4,
  state: 'locked',
  side: 'white',
  lead: { moves: legal.slice(3, 5), firstPly: 3 },
  stretches: [{ moves: legal.slice(5, 15), firstPly: 5 }],
  counts: { mine: 5, known: 0, inReviews: 0 },
  opensWhen: { number: 2, name: 'Castle, then Re1 and Bb3', href },
  extras: [{ kind: 'trap', label: 'Spring the Legal Mate in a quiz', href }],
};
const puzzleExtras = example.puzzles.slice(0, 2).map((puzzle) => ({
  kind: 'puzzle' as const,
  label: `Lichess puzzle ${puzzle.id}`,
  detail: `rated ${puzzle.rating}, ${puzzle.themes.filter((t) => !['opening', 'short', 'advantage'].includes(t)).join(', ')}`,
  href: `https://lichess.org/training/${puzzle.id}`,
}));
const variations: VariationData[] = [
  {
    id: 'giuoco-piano',
    number: 1,
    name: 'Giuoco Piano',
    decision: 'When Black copies with 3...Bc5',
    state: 'learning',
    progress: { total: 12, known: 6, mastered: 4, learning: 2 },
    intro: example.opening.variations[0]!.intro,
    steps: [step1, step2, step3],
    checkpoint: { positions: 12, state: 'open' },
    extras: puzzleExtras,
  },
  {
    id: 'traps',
    number: 2,
    name: 'Traps to know',
    decision: 'When Black plays 3...d6 and pins with ...Bg4',
    state: 'locked',
    progress: { total: 5, known: 0, mastered: 0 },
    intro: example.opening.variations[1]!.intro,
    steps: [step4],
    checkpoint: { positions: 5, state: 'locked' },
  },
];
const finalTest = { positions: 20, state: 'locked' as const };

// ---------------------------------------------------------------- lines

const lineData: LineData[] = [
  {
    id: 'giuoco-piano-main',
    name: 'Giuoco Piano: the quiet main line',
    kind: 'main',
    opponent: { ply: 5, move: m[5]! },
    moves: m,
    firstPly: 0,
    side: 'white',
    known: { total: 8, known: 6, mastered: 4 },
    thumb: { epd: m[5]!.after, lastMove: { from: 'f8', to: 'c5' }, orientation: 'white' },
    href,
    learnHref: href,
    drillHref: href,
  },
  {
    id: 'giuoco-piano-d5',
    name: 'Black strikes with ...d5',
    kind: 'sideline',
    opponent: { ply: 9, move: d5Line[9]! },
    moves: d5Line.slice(9),
    firstPly: 9,
    side: 'white',
    known: { total: 2, known: 0, mastered: 0 },
    thumb: { epd: d5Line[9]!.after, lastMove: { from: 'd7', to: 'd5' }, orientation: 'white' },
    href,
    learnHref: href,
    drillHref: href,
  },
  {
    id: 'giuoco-piano-bg4',
    name: 'The pin with ...Bg4',
    kind: 'sideline',
    opponent: { ply: 11, move: bg4Line[11]! },
    moves: bg4Line.slice(11),
    firstPly: 11,
    side: 'white',
    known: { total: 2, known: 1, mastered: 0 },
    thumb: { epd: bg4Line[11]!.after, lastMove: { from: 'c8', to: 'g4' }, orientation: 'white' },
    href,
    learnHref: href,
    drillHref: href,
  },
  {
    id: 'legal-mate',
    name: 'Legal Mate',
    kind: 'for-us',
    writtenFor: 'white',
    risk: 'low',
    opponent: { ply: 5, move: legal[5]! },
    moves: legal.slice(5),
    firstPly: 5,
    side: 'white',
    known: { total: 5, known: 0, mastered: 0 },
    thumb: { epd: legal[14]!.after, lastMove: { from: 'c3', to: 'd5' }, orientation: 'white' },
    href,
    learnHref: href,
    drillHref: href,
  },
];
const alternativeLine: LineData = {
  ...lineData[0]!,
  id: 'giuoco-piano-d4',
  name: 'Giuoco Piano with 5.d4',
  alternative: true,
  moves: played(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4']).slice(8),
  firstPly: 8,
  known: { total: 3, known: 0, mastered: 0 },
};

// ---------------------------------------------------------------- stories

const toStory = (moves: typeof m, ideasAt: Record<number, Idea[]> = {}): StoryMove[] =>
  moves.map((move, i) => ({
    san: move.san,
    uci: move.uci,
    after: move.after,
    nag: move.nag,
    note: move.note?.text || ideasAt[i] ? { text: move.note?.text, ideas: ideasAt[i] } : undefined,
  }));

const mainStory = toStory(m, { 4: [ideas[0]!], 6: [ideas[3]!], 10: [ideas[2]!] });
const legalStory = toStory(legal);
// 5...Bh5? is punished by 6.Nxe5 even when Black does not take the queen: 6...dxe5 7.Qxh5 and White is a pawn up.
legalStory[9] = {
  ...legalStory[9]!,
  refutation: {
    moves: replay(legal[9]!.after, ['Nxe5', 'dxe5', 'Qxh5']).map((p) => ({ san: p.san, uci: p.uci, after: p.epd })),
    text: 'Even if Black does not take the queen, White wins a pawn and keeps the better position.',
  },
};
const growsFromMain = [lineData[1]!, lineData[2]!];

/** The story beside a small board, bound to its cursor through the chips and two step buttons. */
function StoryWithBoard() {
  const [current, setCurrent] = useState(6);
  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <Board
        positions={[
          { epd: START },
          ...m.map((move) => ({ epd: move.after, lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) } })),
        ]}
        index={current + 1}
        onIndex={(index) => setCurrent(Math.max(0, index - 1))}
        flippable={false}
        settings={false}
      />
      <div className="max-h-[28rem] overflow-y-auto pr-2">
        <LineStory
          moves={mainStory}
          side="white"
          current={current}
          onSelect={setCurrent}
          end={{
            score: scoreOf(m[m.length - 1]!.after),
            plan: 'White keeps the bishop on the a2 to g8 diagonal and brings the queen’s knight round to g3 by Nbd2 and Nf1.',
          }}
          grows={growsFromMain}
          others={[
            { name: 'Giuoco Piano', eco: 'C50', side: 'as Black' },
            { name: 'Italian Game: Giuoco Pianissimo', eco: 'C50', side: 'as White' },
          ]}
        />
      </div>
    </div>
  );
}

/** Step rows that select on click, as in a list. */
function SelectableSteps({ steps }: { steps: StepData[] }) {
  const [selected, setSelected] = useState<string | undefined>(steps[0]?.id);
  return (
    <div className="grid gap-2">
      {steps.map((step) => (
        <StepRow key={step.id} step={step} selected={selected === step.id} onSelect={(s) => setSelected(s.id)} />
      ))}
    </div>
  );
}

function SelectableVariations(props: Omit<Parameters<typeof VariationList>[0], 'selected' | 'onSelect'>) {
  const [selected, setSelected] = useState<string | undefined>(step2.id);
  return <VariationList {...props} selected={selected} onSelect={(step) => setSelected(step.id)} />;
}

// ---------------------------------------------------------------- the mocks

export const openingsProgressMocks: MockItem[] = [
  {
    id: 'repertoire-slots',
    variants: [
      {
        name: 'The repertoire page, editable',
        note: 'Two openings As White (the Ruy Lopez under the Italian, with Make main), one against 1.e4, 1.d4 empty. Choose, Change and Remove work here. Progress and coverage are made up.',
        render: () => <EditableSlots />,
      },
      {
        name: 'Compact, on Today',
        note: 'One line per slot: name, ring and due count. Not editable on Today.',
        render: () => (
          <div className="max-w-md">
            <RepertoireSlots slots={slotsOf(true)} layout="compact" />
          </div>
        ),
      },
      {
        name: 'Before onboarding',
        note: 'All three empty, with a link to the three questions.',
        render: () => (
          <RepertoireSlots slots={slotsOf(false)} editable choices={choices} onboardingHref="/start" band={band} />
        ),
      },
      { name: 'Loading', render: () => <RepertoireSlots loading /> },
    ],
  },
  {
    id: 'opening-card',
    variants: [
      {
        name: 'Started',
        note: 'Mode counts and the ring once started; each pill is its own link. Progress is made up.',
        render: () => (
          <div className="max-w-xl">
            <OpeningCard opening={italian} modeHrefs={modeHrefs} />
          </div>
        ),
      },
      {
        name: 'Not started',
        note: 'Its size instead of progress. Hover a style tag for what it means.',
        render: () => (
          <div className="max-w-xl">
            <OpeningCard opening={caroKann} />
          </div>
        ),
      },
      {
        name: 'In your repertoire, with an action',
        note: 'The marker, and a page action (Choose, in onboarding) that keeps its own click.',
        render: () => (
          <div className="grid max-w-xl gap-3">
            <OpeningCard opening={{ ...italian, inRepertoire: 'as White' }} />
            <OpeningCard opening={qgd} action={<Button size="sm">Choose</Button>} />
          </div>
        ),
      },
      {
        name: 'A search result',
        note: 'The "why it matched" line from the search box, under the name.',
        render: () => (
          <div className="max-w-xl">
            <OpeningCard opening={italian} match="Matched “giuco”: the Giuoco Piano variation" />
          </div>
        ),
      },
      {
        name: 'Yours, written in Create',
        note: 'An authored opening shows Yours and an Edit icon.',
        render: () => (
          <div className="max-w-xl">
            <OpeningCard opening={scotch} />
          </div>
        ),
      },
      {
        name: 'Small, in a picker',
        note: 'Thumb, name, side and ring.',
        render: () => (
          <div className="grid max-w-md gap-2">
            <OpeningCard opening={italian} size="small" />
            <OpeningCard opening={caroKann} size="small" action={<Button size="sm">Choose</Button>} />
            <OpeningCard opening={scotch} size="small" />
          </div>
        ),
      },
      {
        name: 'Loading',
        render: () => (
          <div className="grid max-w-xl gap-3">
            <OpeningCard loading />
            <OpeningCard loading size="small" />
          </div>
        ),
      },
    ],
  },
  {
    id: 'opening-intro',
    variants: [
      {
        name: 'Full, on the opening page',
        note: 'Summary, then the idea, the risks and who it suits; origin folded; ideas; sources (placeholders). Moves in the text are chips.',
        render: () => (
          <OpeningIntro
            summary={example.opening.summary}
            about={about}
            ideas={ideas}
            sources={sources}
            context={introContext}
            side="white"
          />
        ),
      },
      {
        name: 'Short, in onboarding',
        note: 'Summary and "Who it suits" only.',
        render: () => (
          <div className="max-w-md">
            <OpeningIntro summary={example.opening.summary} about={about} variant="short" />
          </div>
        ),
      },
    ],
  },
  {
    id: 'variation-list',
    variants: [
      {
        name: 'In progress, folded automatically',
        note: 'The variation in progress is open, the locked one folded but readable. Click a step to select it; Up and Down move between rows. Progress is made up.',
        render: () => <SelectableVariations variations={variations} finalTest={finalTest} />,
      },
      {
        name: 'All open, as in Create’s preview',
        render: () => <SelectableVariations variations={variations} finalTest={finalTest} fold="all-open" />,
      },
      {
        name: 'Gates off',
        note: 'With gates off (or relaxed by the learner) nothing reads as locked: only suggested later.',
        render: () => <SelectableVariations variations={variations} fold="all-open" gates={false} />,
      },
      {
        name: 'An authored opening with no steps yet',
        render: () => (
          <VariationList variations={[{ ...variations[0]!, steps: [], extras: [] }]} createHref="/create/my-scotch" />
        ),
      },
    ],
  },
  {
    id: 'step-row',
    variants: [
      {
        name: 'Every state',
        note: 'Mastered, learning (in the Try stage), open with two short branches, and locked with what opens it. Known moves are ticked; the moves leading in are greyed.',
        render: () => <SelectableSteps steps={[step1, step2, step3, step4]} />,
      },
      {
        name: 'Known',
        note: 'Every move right in its last two answers: quieter, with Try as the filled button.',
        render: () => (
          <StepRow
            step={{
              ...step2,
              state: 'known',
              known: [8, 10, 12, 14],
              stage: 2,
              counts: { mine: 4, known: 4, inReviews: 4 },
            }}
          />
        ),
      },
      {
        name: 'An automatic step, untitled',
        note: 'A headline from its first move. Learn on a locked step asks once.',
        render: () => <StepRow step={step4} />,
      },
      {
        name: 'Compact, on Today',
        note: 'Number, title, badge and buttons only.',
        render: () => (
          <div className="grid max-w-xl gap-2">
            <StepRow step={step2} compact />
            <StepRow step={step3} compact />
          </div>
        ),
      },
    ],
  },
  {
    id: 'line-row',
    variants: [
      {
        name: 'Every line, as a table',
        note: 'The row is a link; the icons keep their own clicks. A line has no state, only how much of it you know (made up).',
        render: () => <LineTable lines={lineData} onShow={() => {}} />,
      },
      {
        name: 'Cards',
        note: 'With the board that names the line: search results, "what grows from it".',
        render: () => (
          <div className="grid gap-2 md:grid-cols-2">
            {lineData.map((data) => (
              <LineRow key={data.id} line={data} form="card" onShow={() => {}} />
            ))}
          </div>
        ),
      },
      {
        name: 'An alternative, in a list of mixed openings',
        note: 'A second answer is shown, not drilled: no Drill icon.',
        render: () => (
          <LineTable
            lines={[
              { ...alternativeLine, opening: 'Italian Game' },
              { ...lineData[3]!, opening: 'Italian Game' },
            ]}
            columns={['kind', 'moves', 'known']}
          />
        ),
      },
    ],
  },
  {
    id: 'line-story',
    variants: [
      {
        name: 'The main line, bound to a board',
        note: 'Click a move or step with the buttons: the mark moves through the text. Ideas follow their comments.',
        render: () => <StoryWithBoard />,
      },
      {
        name: 'A sideline, where it starts',
        note: 'Branches off the main line; the shared moves greyed.',
        render: () => (
          <LineStory
            moves={toStory(d5Line.slice(9))}
            firstPly={9}
            side="white"
            start={{ parent: 'Giuoco Piano: the quiet main line', href, shared: d5Line.slice(0, 9) }}
            end={{ score: scoreOf(d5Line[d5Line.length - 1]!.after) }}
            evalAfter="words"
          />
        ),
      },
      {
        name: 'A trap, with symbols and a refutation',
        note: '5...Bh5? carries the fix under it: 6.Nxe5 wins a pawn even when Black does not take the queen.',
        render: () => (
          <LineStory moves={legalStory} side="white" end={{ score: scoreOf(legal[legal.length - 1]!.after) }} />
        ),
      },
      {
        name: 'Learn: the introduction, then the moves',
        note: 'The Learn stage of a step, follow-up or line: what it is for first, then every move with its reason. The board’s arrow keys move the mark.',
        render: () => (
          <LineStory
            moves={mainStory.slice(0, 8)}
            side="white"
            current={3}
            intro={
              <p className="max-w-prose">
                White develops the bishop to its most active square, aiming at f7, the one square only the king guards.
                Step through the moves with the reason for each, then play them without help.
              </p>
            }
            parts={['intro', 'moves']}
          />
        ),
      },
      { name: 'Loading', render: () => <LineStory moves={[]} side="white" loading /> },
    ],
  },
  {
    id: 'sources-list',
    variants: [
      {
        name: 'At the foot of the opening page',
        note: 'Placeholders: titles and links are not real sources. Hover a title for where it goes.',
        render: () => <SourcesList sources={sources} />,
      },
      {
        name: 'Inline',
        note: 'For the opening card and the line page.',
        render: () => <SourcesList sources={sources} layout="inline" />,
      },
      {
        name: 'No sources',
        note: 'Draws nothing, not an empty heading.',
        render: () => (
          <div className="text-sm text-muted-foreground">
            [<SourcesList sources={[]} />] (nothing between the brackets)
          </div>
        ),
      },
    ],
  },
  {
    id: 'state-badge',
    variants: [
      {
        name: 'All five, for a step',
        note: 'Hover for what each means. The icon carries the colour; the word is always there.',
        render: () => (
          <div className="flex flex-wrap gap-2">
            {PROGRESS_STATES.map((state) => (
              <StateBadge key={state} state={state} />
            ))}
          </div>
        ),
      },
      {
        name: 'As dots',
        note: 'Icon only, for the map, move chips and stage dots.',
        render: () => (
          <div className="flex flex-wrap gap-3">
            {PROGRESS_STATES.map((state) => (
              <StateBadge key={state} state={state} size="dot" of="move" />
            ))}
          </div>
        ),
      },
      {
        name: 'Locked, naming what opens it',
        render: () => <StateBadge state="locked" reason="Opens when step 3 (Giuoco Piano) is known, or test out." />,
      },
      {
        name: 'Gates off',
        note: 'Locked is drawn as open, with "suggested later" on hover; never a padlock.',
        render: () => <StateBadge state="locked" gates={false} reason="Opens when step 3 (Giuoco Piano) is known." />,
      },
      {
        name: 'A variation, and an idea',
        note: 'A variation is known once its checkpoint is cleared; an idea is open, seen or practised.',
        render: () => (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <StateBadge state="known" of="variation" />
              <StateBadge state="mastered" of="variation" />
            </div>
            <div className="flex flex-wrap gap-2">
              <StateBadge state="open" of="idea" />
              <StateBadge state="learning" of="idea" />
              <StateBadge state="known" of="idea" />
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'progress-ring',
    variants: [
      {
        name: 'Three sizes',
        note: 'Mastered solid, known lighter, the rest a faint track. Hover for the breakdown. Counts made up.',
        render: () => (
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing counts={italianProgress} size="xs" />
            <ProgressRing counts={italianProgress} size="sm" />
            <ProgressRing counts={italianProgress} size="md" />
          </div>
        ),
      },
      {
        name: 'With labels',
        render: () => (
          <div className="grid gap-3">
            <ProgressRing counts={italianProgress} size="xs" label="short" />
            <ProgressRing counts={italianProgress} size="sm" label="long" />
          </div>
        ),
      },
      {
        name: 'Not started, all mastered, test cleared',
        note: 'An empty track with 0%; a tick once everything is mastered; a flag once the final test is cleared.',
        render: () => (
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing counts={{ total: 30, known: 0, mastered: 0 }} label="long" />
            <ProgressRing counts={{ total: 12, known: 12, mastered: 12 }} label="long" noun="moves" />
            <ProgressRing counts={{ total: 42, known: 40, mastered: 31 }} size="md" cleared />
          </div>
        ),
      },
      {
        name: 'Rising after an answer',
        note: 'It animates from its last value; not under reduced motion.',
        render: () => <RingThatGrows />,
      },
      {
        name: 'Loading',
        render: () => (
          <div className="flex items-center gap-4">
            <ProgressRing loading size="sm" />
            <ProgressRing loading size="md" />
          </div>
        ),
      },
    ],
  },
  {
    id: 'mode-counts',
    variants: [
      {
        name: 'Every mode',
        note: 'Each in its mode’s colour, in a fixed order; each pill is a link. Counts made up.',
        render: () => <ModeCounts counts={italianModes} hrefs={modeHrefs} />,
      },
      {
        name: 'Compact',
        note: 'Icon and count; the name is in the hint.',
        render: () => <ModeCounts counts={italianModes} size="compact" hrefs={modeHrefs} />,
      },
      {
        name: 'Today: Learn and Review only',
        render: () => <ModeCounts counts={italianModes} modes={['learn', 'review']} hrefs={modeHrefs} />,
      },
      {
        name: 'Nothing due, no puzzles yet',
        note: 'Review is quiet when nothing is due (good news); a mode with nothing to count is left out.',
        render: () => (
          <ModeCounts
            counts={{ learn: { known: 1, total: 34, newToday: 0 }, review: { due: 0 }, drill: { clean: 0, total: 2 } }}
          />
        ),
      },
      { name: 'Loading', render: () => <ModeCounts loading /> },
    ],
  },
  {
    id: 'coverage-meter',
    variants: [
      {
        name: 'One side, with a target',
        note: 'Solid is what you know, the dashed outline what your opening covers but you have not learned. Figures made up for a whole opening.',
        render: () => <CoverageMeter rows={[e4Coverage]} band={band} target={0.6} />,
      },
      {
        name: 'The whole repertoire',
        note: 'One row per slot. 1.d4 has some replies with no data yet (see its hint).',
        render: () => <CoverageMeter rows={[whiteCoverage, e4Coverage, d4Coverage]} band={band} />,
      },
      {
        name: 'Compact',
        note: 'For the header, slot tiles and opening cards.',
        render: () => (
          <div className="grid gap-3">
            <CoverageMeter rows={[e4Coverage]} band={band} form="compact" />
            <CoverageMeter rows={[whiteCoverage, e4Coverage, d4Coverage]} band={band} form="compact" />
          </div>
        ),
      },
      {
        name: 'A band with no data',
        render: () => <CoverageMeter rows={[]} band="1800 to 2200" noData={{ settingsHref: '/settings' }} />,
      },
    ],
  },
  {
    id: 'gap-link',
    variants: [
      {
        name: 'The biggest gap, on Today',
        note: 'An Italian-only White repertoire does not answer 1...c5. The share is real: the explorer, 1000 to 1600.',
        render: () => <GapLink gaps={[sicilianGap]} band={band} target={0.05} />,
      },
      {
        name: 'One your opening covers',
        note: 'Your Italian answers it in a later step (the step is made up).',
        render: () => <GapLink gaps={[twoKnightsGap]} band={band} target={0.02} />,
      },
      {
        name: 'Nothing here answers it',
        render: () => <GapLink gaps={[scandiGap]} band={band} target={0.05} />,
      },
      {
        name: 'The top five, on the repertoire page',
        note: 'Shares from the explorer; what fills each is made up.',
        render: () => (
          <GapLink
            gaps={[sicilianGap, frenchGap, scandiGap, caroGap, philidorGap, twoKnightsGap]}
            form="list"
            band={band}
            target={0.02}
          />
        ),
      },
      {
        name: 'No gaps above the target',
        render: () => <GapLink gaps={[twoKnightsGap]} band={band} target={0.05} settingsHref="/settings" />,
      },
    ],
  },
  {
    id: 'streak',
    variants: [
      {
        name: 'Header chip',
        note: 'Done today (the flame lit), then not yet today. Hover for what keeps it going.',
        render: () => (
          <div className="flex items-center gap-4">
            <Streak days={6} longest={21} doneToday href="/stats#activity" />
            <Streak days={6} longest={21} doneToday={false} href="/stats#activity" />
          </div>
        ),
      },
      {
        name: 'Zero in the header',
        note: 'Shows nothing: a "0 days" chip nags.',
        render: () => (
          <div className="text-sm text-muted-foreground">
            [<Streak days={0} longest={21} doneToday={false} />] (nothing between the brackets)
          </div>
        ),
      },
      {
        name: 'Full, on Today',
        render: () => (
          <div className="flex flex-wrap gap-10">
            <Streak days={6} longest={21} doneToday since="Monday" form="full" />
            <Streak days={6} longest={21} doneToday={false} since="Monday" form="full" />
          </div>
        ),
      },
      {
        name: 'Full, no streak yet',
        render: () => <Streak days={0} longest={21} doneToday={false} form="full" />,
      },
    ],
  },
  {
    id: 'activity-calendar',
    variants: [
      {
        name: 'Six months, on Stats',
        note: 'Made-up practice, darker for more answers, in Review’s colour. Hover a square; focus the grid and use the arrow keys.',
        render: () => <ActivityCalendar days={year} today={TODAY} weeks={26} streak={{ days: 6, longest: 21 }} />,
      },
      {
        name: 'A year, on a wide screen',
        render: () => <ActivityCalendar days={year} today={TODAY} weeks={52} streak={{ days: 6, longest: 21 }} />,
      },
      {
        name: 'Thirteen weeks, split by mode',
        note: 'Each square takes the colour of the mode answered most that day.',
        render: () => (
          <div className="max-w-sm">
            <ActivityCalendar days={year} today={TODAY} weeks={13} split streak={{ days: 6, longest: 21 }} />
          </div>
        ),
      },
      {
        name: 'Started recently',
        note: 'Days before the first answer are faint, not misses.',
        render: () => <ActivityCalendar days={recent} today={TODAY} weeks={26} streak={{ days: 6, longest: 6 }} />,
      },
      {
        name: 'Before any practice',
        render: () => <ActivityCalendar days={[]} today={TODAY} weeks={26} />,
      },
    ],
  },
  {
    id: 'next-action',
    variants: [
      {
        name: 'Reviews come first',
        note: 'Five or more due puts review first.',
        render: () => (
          <NextAction
            state={{
              ...baseNext,
              due: 14,
              stepInProgress: { number: 2, title: 'Castle, then Re1 and Bb3', stage: 'Try', href },
            }}
          />
        ),
      },
      {
        name: 'Continue a step, with alternatives',
        note: 'The main button is a suggestion, never a cage.',
        render: () => (
          <NextAction
            form="with-alternatives"
            alternatives={alternatives}
            state={{ ...baseNext, due: 2, stepInProgress: { number: 4, title: 'Bishop to c4', stage: 'Try', href } }}
          />
        ),
      },
      {
        name: 'Start the opening',
        render: () => (
          <NextAction
            state={{
              ...baseNext,
              newLeftToday: 10,
              nextOpenStep: {
                number: 1,
                title: 'Bishop to c4',
                opening: 'Italian Game',
                side: 'White',
                href,
                first: true,
              },
            }}
          />
        ),
      },
      {
        name: 'A checkpoint is ready',
        render: () => <NextAction state={{ ...baseNext, checkpoint: { variation: 'Giuoco Piano', href } }} />,
      },
      {
        name: 'An empty slot',
        render: () => <NextAction state={{ ...baseNext, emptySlot: { against: 'against 1.d4', why: d4Why, href } }} />,
      },
      {
        name: 'New moves used: a puzzle',
        render: () => (
          <NextAction
            state={{
              ...baseNext,
              nextOpenStep: { number: 5, title: 'The pin with ...Bg4', opening: 'Italian Game', side: 'White', href },
              puzzleHref: href,
            }}
          />
        ),
      },
      {
        name: 'All done for today',
        note: 'The alternatives are still offered.',
        render: () => (
          <NextAction
            form="with-alternatives"
            alternatives={alternatives
              .slice(0, 1)
              .concat({ label: 'the map', href, hint: 'Every line of your repertoire as one tree.' })}
            state={{ ...baseNext, nextReview: 'tomorrow at about 9:00' }}
          />
        ),
      },
      {
        name: 'No repertoire yet',
        render: () => <NextAction state={{ ...baseNext, hasRepertoire: false, onboardingHref: '/start' }} />,
      },
    ],
  },
  {
    id: 'due-card',
    variants: [
      {
        name: 'Due now',
        note: 'By opening and by kind; each opening’s count starts the session for that opening alone. Counts made up.',
        render: () => (
          <div className="max-w-sm">
            <DueCard
              due={14}
              minutes={6}
              byOpening={[
                { name: 'Italian Game', count: 9, href },
                { name: 'Caro-Kann Defense', count: 5, href },
              ]}
              byKind={{ moves: 12, questions: 2 }}
              newToday={4}
              href="/review#start=due"
            />
          </div>
        ),
      },
      {
        name: 'More than one session',
        render: () => (
          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <DueCard due={34} minutes={14} href="/review#start=due" />
            <DueCard due={75} minutes={31} byKind={{ moves: 66, questions: 6, puzzles: 3 }} href="/review#start=due" />
          </div>
        ),
      },
      {
        name: 'Nothing due',
        note: 'Quiet, with free practice offered (it never changes the schedule).',
        render: () => (
          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <DueCard due={0} minutes={0} nextDue="tomorrow morning" practiseHref="/practice" href="/review#start=due" />
            <DueCard due={0} minutes={0} nextDue="in 3 hours" newToday={4} href="/review#start=due" />
          </div>
        ),
      },
      {
        name: 'Inline',
        note: 'One line, for the header menu and the opening card.',
        render: () => (
          <div className="grid gap-2">
            <DueCard form="inline" due={14} minutes={6} href="/review#start=due" />
            <DueCard form="inline" due={0} minutes={0} nextDue="tomorrow morning" href="/review#start=due" />
          </div>
        ),
      },
      {
        name: 'Loading',
        render: () => (
          <div className="max-w-sm">
            <DueCard loading due={0} minutes={0} href="/review#start=due" />
          </div>
        ),
      },
    ],
  },
];
