import { playMove, type Grade } from '@knightschool/core';
import { BookOpen, Eye, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Board } from '@/components/board/board';
import { BoardThumb } from '@/components/board/board-thumb';
import { KindBadge, type LineKind } from '@/components/chess/kind-badge';
import { OpeningName } from '@/components/chess/opening-name';
import { VerdictNote } from '@/components/chess/verdict-note';
import { Button } from '@/components/ui/button';
import { BoardSearch, type PositionLine } from '@/components/finding/board-search';
import { FilterToggle } from '@/components/finding/filter-toggle';
import { KIND_OPTIONS, SIDE_OPTIONS, WEIGHTING_OPTIONS } from '@/components/finding/filter-options';
import { SearchBox } from '@/components/finding/search-box';
import type { SearchItem } from '@/components/finding/search';
import { SortableTable, type Column } from '@/components/finding/sortable-table';
import { ABOVE_ROW_LINK } from '@/components/shared/card-link';
import { keyOf, layoutLines, type MapLine, type MapNode } from '@/components/map/lane-layout';
import { MapIndex, type MapIndexLine } from '@/components/map/map-index';
import { MapLegend } from '@/components/map/map-legend';
import { MapTree, type MapFocus } from '@/components/map/map-tree';
import type { MapGap, MapOverlay, MapOverlayData, MoveState } from '@/components/map/map-types';
import { AnswerInput, type AnswerVerdict } from '@/components/practice/answer-input';
import { Countdown } from '@/components/practice/countdown';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { PracticeBar } from '@/components/practice/practice-bar';
import {
  DEFAULT_CONFIG,
  type PracticeConfig,
  type PracticeMode,
  type PracticeSource,
} from '@/components/practice/practice-config';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { SessionSummary } from '@/components/practice/session-summary';
import type { NextState } from '@/components/progress/next-action-pickers';
import {
  example,
  explorerMoves,
  gamesAt,
  judgeAgainstLine,
  line,
  mainLine,
  positionsOf,
  scoreOf,
  squares,
} from '../fixtures/example';
import { OPENING_IDEAS, PUZZLE_IDEAS } from '../fixtures/ideas';
import { sampleTries } from '../fixtures/tries';
import type { MockItem } from './types';

/* The example's four lines, in the opening's order: the main line first. */

const LINE_IDS = ['giuoco-piano-main', 'giuoco-piano-d5', 'giuoco-piano-bg4', 'legal-mate'];
const MAP_LINES: MapLine[] = LINE_IDS.map((id) => line(id));
/** The opening's trigger, 1. e4 e5 2. Nf3 Nc6 3. Bc4, is in the JSON though not in the fixture's type. */
const TRIGGER = (example.opening as unknown as { start: string[] }).start.length;

const share = (epd: string, uci: string) => {
  const moves = explorerMoves(epd);
  const total = moves.reduce((sum, move) => sum + move.games, 0);
  const found = moves.find((move) => move.uci === uci);
  return total && found ? found.games / total : 0;
};

/** Made-up progress, believable: the main line known early on, the branches less so. */
function stateFor(lineId: string, ply: number): MoveState {
  if (lineId === 'giuoco-piano-main') return ply < 8 ? 'mastered' : ply < 12 ? 'known' : 'learning';
  if (lineId === 'giuoco-piano-d5') return ply < 12 ? 'learning' : 'open';
  if (lineId === 'giuoco-piano-bg4') return ply < 12 ? 'known' : 'open';
  return ply < 8 ? 'learning' : 'open';
}

function overlayData(): MapOverlayData {
  const states: Record<string, MoveState> = {};
  const gaps: Record<string, MapGap[]> = {};
  const games: Record<string, number> = {};
  const answered = new Set<string>();
  for (const l of MAP_LINES) l.moves.forEach((_, ply) => answered.add(keyOf(l.moves, ply + 1)));
  for (const l of MAP_LINES) {
    l.moves.forEach((move, ply) => {
      const key = keyOf(l.moves, ply + 1);
      games[key] = gamesAt(move.after) ?? 0;
      if (ply % 2 === 0 && ply >= TRIGGER) states[key] ??= stateFor(l.id, ply);
      // A gap: a reply players at the band make after the learner's move that no line answers.
      if (ply % 2 === 0 && !gaps[key]) {
        const replies = explorerMoves(move.after);
        const total = replies.reduce((sum, reply) => sum + reply.games, 0);
        const missing = replies
          .filter((reply) => !answered.has(`${key} ${reply.uci}`) && total && reply.games / total >= 0.05)
          .map((reply) => ({ san: reply.san, share: reply.games / total }));
        if (missing.length) gaps[key] = missing;
      }
    });
  }
  const legal = line('legal-mate').moves;
  const mistakes = {
    [keyOf(legal, 10)]: { share: share(legal[9]!.before, legal[9]!.uci), practised: true },
    [keyOf(legal, 12)]: { share: share(legal[11]!.before, legal[11]!.uci), practised: false },
  };
  const puzzles = {
    [keyOf(mainLine.moves, 6)]: 3,
    [keyOf(mainLine.moves, 7)]: 2,
    [keyOf(mainLine.moves, 9)]: 3,
  };
  return { states, gaps, games, mistakes, puzzles };
}

const DATA = overlayData();
const LAYOUT = layoutLines(MAP_LINES, { trigger: TRIGGER });
const laneOf = (id: string) => LAYOUT.lanes.find((lane) => lane.line.id === id)?.lane ?? 0;
const COUNTS = Object.values(DATA.states!).reduce<Partial<Record<MoveState, number>>>(
  (counts, state) => ({ ...counts, [state]: (counts[state] ?? 0) + 1 }),
  {},
);

const knownShare = (id: string) => {
  const moves = line(id).moves;
  const mine = moves.map((_, ply) => keyOf(moves, ply + 1)).filter((_key, ply) => ply % 2 === 0 && ply >= TRIGGER);
  const known = mine.filter((key) => ['known', 'mastered'].includes(DATA.states![key] ?? ''));
  return mine.length ? known.length / mine.length : 0;
};

/** The example's kinds as content writes them: its trap is one White springs. */
const lineKind = (kind: string): LineKind => (kind === 'trap' ? 'for-us' : (kind as LineKind));

const INDEX_LINES: MapIndexLine[] = MAP_LINES.map((l) => ({
  id: l.id,
  name: l.name,
  kind: lineKind(l.kind),
  writtenFor: 'white',
  parent: LAYOUT.parents.get(l.id) ?? null,
  lane: laneOf(l.id),
  group: 'e4e5',
  opening: example.opening.name,
  known: knownShare(l.id),
  moves: l.moves,
}));

/* Practice sources and set-up. */

const NEXT_BASE: NextState = { hasRepertoire: true, due: 0, dueHref: '#review', newLeftToday: 6 };
const NEXT_STEP = { number: 3, title: 'Prepare d4 with c3', opening: 'Italian Game', side: 'White', href: '#step-3' };

const SOURCES: PracticeSource[] = [
  { id: 'opening:italian-white', name: 'Italian Game', group: 'opening', count: 24 },
  { id: 'opening:caro-kann', name: 'Caro-Kann Defense', group: 'opening', count: 0 },
  { id: 'variation:giuoco-piano', name: 'Giuoco Piano', group: 'variation', opening: 'Italian Game', count: 18 },
  { id: 'variation:traps', name: 'Traps to know', group: 'variation', opening: 'Italian Game', count: 6 },
];
const MODE_DEFAULTS: Record<PracticeMode, Partial<PracticeConfig>> = {
  review: { source: 'due' },
  drill: { source: 'opening:italian-white' },
  puzzles: { source: 'opening:italian-white', weighting: 'random' },
  'play-on': { source: 'variation:giuoco-piano' },
  speed: { source: 'repertoire', run: 'lines:5', depth: 10 },
  'name-it': { source: 'everything', weighting: 'random' },
};
const configFor = (mode: PracticeMode, extra: Partial<PracticeConfig> = {}): PracticeConfig => ({
  ...DEFAULT_CONFIG,
  ...MODE_DEFAULTS[mode],
  ...extra,
});

function Started({ config, label = 'Started with' }: { config: PracticeConfig | null; label?: string }) {
  if (!config) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {label}: <code>{JSON.stringify(config)}</code>
    </p>
  );
}

function SetupMock({ mode, ...props }: { mode: PracticeMode } & Partial<Parameters<typeof PracticeSetup>[0]>) {
  const [started, setStarted] = useState<PracticeConfig | null>(null);
  return (
    <div className="grid gap-2">
      <PracticeSetup mode={mode} initial={configFor(mode)} sources={SOURCES} due={12} onStart={setStarted} {...props} />
      <Started config={started} />
    </div>
  );
}

function BarMock({ mode, ...props }: { mode: PracticeMode } & Partial<Parameters<typeof PracticeBar>[0]>) {
  const [config, setConfig] = useState(configFor(mode, props.config));
  const [restarts, setRestarts] = useState(0);
  return (
    <div className="grid gap-2">
      <PracticeBar
        mode={mode}
        sources={SOURCES}
        due={12}
        {...props}
        config={config}
        onStart={(next) => {
          setConfig(next);
          setRestarts((n) => n + 1);
        }}
      />
      {restarts > 0 ? <p className="text-xs text-muted-foreground">Started again {restarts} times.</p> : null}
    </div>
  );
}

/* Exercises on the main line. */

const MAIN = positionsOf('giuoco-piano-main');
const wrongAt = mainLine.moves[8]!; // 5.d3: the learner plays 5.d4 instead
const wrongAfter = playMove(wrongAt.before, 'd2d4')!;
const wrongJudged = judgeAgainstLine(wrongAt, { uci: 'd2d4', after: wrongAfter.epd });
const wrongGrade: Grade = wrongJudged?.grade ?? 'inaccuracy';
const wrongNote = (
  <VerdictNote
    grade={wrongGrade}
    ply={8}
    san="d4"
    costCp={wrongJudged ? Math.round(wrongJudged.cost.cp) : undefined}
    because="Opens the centre before White has castled; after 5...exd4 6.cxd4 Bb4+ Black gets easy play."
    lineMove={wrongAt.san}
  />
);
const CONTEXT = (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <OpeningName name="Italian Game: Giuoco Piano" />
    <span>, step 2</span>
  </span>
);

function ExerciseWithBoard() {
  const [phase, setPhase] = useState<'ask' | 'wrong' | 'right'>('ask');
  const index = phase === 'right' ? 9 : 8;
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <Board
        positions={MAIN}
        index={index}
        reveal={phase === 'ask' ? 'test' : 'answered'}
        flippable={false}
        arrows={phase === 'wrong' ? [{ from: 'd2', to: 'd4', kind: 'wrong' }] : []}
        badge={
          phase === 'wrong'
            ? { square: 'd4', kind: 'grade', grade: wrongGrade }
            : phase === 'right'
              ? { square: 'd3', kind: 'right' }
              : undefined
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setPhase('wrong')}>
              Play 5.d4
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPhase('right')}>
              Play 5.d3
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Again" onClick={() => setPhase('ask')}>
              <RotateCcw aria-hidden />
            </Button>
          </>
        }
      />
      <ExercisePanel
        mode="drill"
        prompt="Your move as White"
        context={CONTEXT}
        tries={{ left: phase === 'wrong' ? 1 : 2, total: 2 }}
        help={{ hint: false, shown: false }}
        progress={{ done: 3, total: 12 }}
        result={phase === 'right' ? 'right' : null}
        verdict={phase === 'wrong' ? wrongNote : null}
        explanation={phase === 'right' ? mainLine.moves[8]!.note?.text : null}
        className="self-start"
      />
    </div>
  );
}

/* Typed answers. */

const NAMES = [
  'Italian Game',
  'Italian Game: Giuoco Piano',
  'Italian Game: Giuoco Pianissimo',
  'Italian Game: Two Knights Defense',
  'Italian Game: Two Knights Defense, Fried Liver Attack',
  'Italian Game: Evans Gambit',
  'Ruy Lopez',
  'Scotch Game',
  'Petrov’s Defense',
  'Philidor Defense',
  'Caro-Kann Defense',
  'Caro-Kann Defense: Advance Variation',
  'Caro-Kann Defense: Exchange Variation',
  'Sicilian Defense',
  'Scandinavian Defense',
];

function AnswerMock({ suggestions = NAMES, right = 'Italian Game: Giuoco Pianissimo' }) {
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [typed, setTyped] = useState('');
  return (
    <div className="grid max-w-xl gap-3">
      <AnswerInput
        key={verdict ? 'answered' : 'asking'}
        suggestions={suggestions}
        autoFocus={false}
        verdict={verdict}
        answered={typed}
        onAnswer={(text) => {
          setTyped(text);
          const t = text.toLowerCase();
          setVerdict(
            t.includes('pianissimo')
              ? { credit: 'full', message: 'the Giuoco Pianissimo.' }
              : t.includes('italian') || t.includes('piano')
                ? {
                    credit: 'half',
                    message: 'Right opening; the variation is the Giuoco Pianissimo.',
                    accepted: [right],
                  }
                : { credit: 'none', message: 'This is the Italian Game.', accepted: [right] },
          );
        }}
        onGiveUp={() => {
          setTyped('');
          setVerdict({ credit: 'none', message: 'This is the Italian Game.', accepted: [right] });
        }}
      />
      {verdict ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setVerdict(null)}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/* A finished session. */

const TRIES = sampleTries();
const firstTime = TRIES.filter((t, i) => t.grade === 'book' && TRIES[i - 1]?.ply !== t.ply).length;
const withHelp = TRIES.filter((t) => t.hint).length;
const missed = new Set(TRIES.filter((t) => t.grade !== 'book').map((t) => t.ply)).size;

function SummaryWithBoard() {
  const [picked, setPicked] = useState(0);
  const attempt = TRIES[picked]!;
  const move = mainLine.moves[attempt.ply]!;
  const played = attempt.played === move.san ? null : playMove(move.before, attempt.played);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Board
        positions={MAIN}
        index={attempt.ply + 1}
        reveal="answered"
        flippable={false}
        arrows={played ? [{ from: played.from, to: played.to, kind: 'wrong' }] : []}
        badge={
          played
            ? { square: played.to, kind: 'grade', grade: attempt.grade }
            : { square: squares(move.uci).to, kind: 'right' }
        }
        caption={move.note?.text}
      />
      <SessionSummary
        mode="drill"
        headline="Drill done: the Giuoco Piano main line"
        sentence={`${firstTime} right first time, ${withHelp} with a hint, ${missed} times a sound move that is not the line's.`}
        figures={[
          { value: String(firstTime), label: 'right first time' },
          { value: String(withHelp), label: 'with help' },
          { value: String(missed), label: 'not the line’s move' },
        ]}
        tries={TRIES}
        onSelectTry={setPicked}
        again={{ config: configFor('drill'), sources: SOURCES, onStart: () => {} }}
      />
    </div>
  );
}

/* Puzzles. */

const FROM: Record<string, string> = {
  Italian_Game_Giuoco_Pianissimo: 'From a game that passed through step 2 of your Italian Game',
  Italian_Game_Giuoco_Piano: 'After the Giuoco Piano main line',
  Italian_Game_Classical_Variation: 'From the Giuoco Piano',
};
const fromOf = (tags: string[]) => FROM[tags[1] ?? ''] ?? 'Practises the fork';
const PUZZLES = example.puzzles;

function LiveCountdown() {
  const [run, setRun] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <div className="relative w-80">
        <BoardThumb epd={MAIN[5]!.epd} className="w-80" />
        {done ? null : (
          <Countdown
            key={run}
            next={{ opening: 'Italian Game', variation: 'Giuoco Piano', side: 'white' }}
            onDone={() => setDone('The line started.')}
            onStop={() => setDone('The run stopped.')}
          />
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {done}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDone(null);
            setRun((n) => n + 1);
          }}
        >
          <RotateCcw aria-hidden />
          Count again
        </Button>
      </div>
    </div>
  );
}

function FrozenCountdown(props: Partial<Parameters<typeof Countdown>[0]>) {
  return (
    <div className="relative w-80">
      <BoardThumb epd={MAIN[9]!.epd} className="w-80" />
      <Countdown
        next={{ opening: 'Italian Game', variation: 'Legal Mate trap', side: 'white' }}
        onDone={() => {}}
        frozenAt={3}
        {...props}
      />
    </div>
  );
}

/* The map. */

function MapMock({
  overlays,
  ...props
}: { overlays: MapOverlay[] } & Omit<Partial<Parameters<typeof MapTree>[0]>, 'overlays'>) {
  const [focus, setFocus] = useState<MapFocus | null>({ line: 'giuoco-piano-main', ply: 8 });
  return (
    <MapTree
      lines={MAP_LINES}
      side="white"
      trigger={TRIGGER}
      overlays={new Set(overlays)}
      data={DATA}
      focus={focus}
      onPick={setFocus}
      {...props}
    />
  );
}

function MapPlayground() {
  const [overlays, setOverlays] = useState<Set<MapOverlay>>(new Set(['progress', 'gaps']));
  const [focus, setFocus] = useState<MapFocus>({ line: 'giuoco-piano-main', ply: 8 });
  const [subtree, setSubtree] = useState<string | null>(null);
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<MapNode | null>(null);
  const [pulse, setPulse] = useState<MoveState | null>(null);
  const [isolate, setIsolate] = useState<MoveState | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const positions = positionsOf(focus.line);
  const moves = line(focus.line).moves;
  const move = moves[focus.ply];
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <MapIndex
          lines={INDEX_LINES}
          picked={focus.line}
          subtree={subtree}
          folded={folded}
          showProgress={overlays.has('progress')}
          side="white"
          onPick={(id) =>
            setFocus({
              line: id,
              ply: Math.max(TRIGGER, LAYOUT.lanes.find((l) => l.line.id === id)?.startPly ?? TRIGGER),
            })
          }
          onSubtree={setSubtree}
          onFold={(id, fold) =>
            setFolded((current) => {
              const next = new Set(current);
              if (fold) next.add(id);
              else next.delete(id);
              return next;
            })
          }
          onOpenAll={() => setFolded(new Set())}
        />
        <MapTree
          lines={MAP_LINES}
          side="white"
          trigger={TRIGGER}
          overlays={overlays}
          data={DATA}
          focus={focus}
          subtree={subtree}
          folded={folded}
          onPick={(next) => {
            setFocus(next);
            setNote(null);
          }}
          onSubtree={setSubtree}
          onUnfold={(id) => setFolded((current) => new Set([...current].filter((f) => f !== id)))}
          onHover={setHover}
          onGap={(node, gap) =>
            setNote(
              `After ${node.move.san}, ${gap.san} (${Math.round(gap.share * 100)}% of games) has no answer yet. Learn the step that answers it.`,
            )
          }
          onMistake={(node) => setNote(`${node.move.san} is a common mistake. Practise the punishment.`)}
          pulse={pulse}
          isolate={isolate}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,17rem)]">
        <Board
          positions={positions}
          index={focus.ply + 1}
          onIndex={(index) => setFocus({ ...focus, ply: Math.max(0, index - 1) })}
          lit={hover ? [hover.move.uci.slice(0, 2), hover.move.uci.slice(2, 4)] : undefined}
        />
        <div className="grid content-start gap-3">
          <p className="font-medium">{line(focus.line).name}</p>
          <p className="text-sm">
            {move?.note?.text ?? <span className="text-muted-foreground">No comment on this move.</span>}
          </p>
          {note ? <p className="rounded-md border border-dashed p-2 text-sm">{note}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm">
              <BookOpen aria-hidden />
              Learn
            </Button>
            <Button size="sm" variant="outline">
              <Play aria-hidden />
              Try
            </Button>
            <Button size="sm" variant="outline">
              <RotateCcw aria-hidden />
              Review
            </Button>
            <Button size="sm" variant="ghost">
              Open line
            </Button>
          </div>
        </div>
        <MapLegend
          on={overlays}
          onToggle={(overlay, value) =>
            setOverlays((current) => {
              const next = new Set(current);
              if (value) next.add(overlay);
              else next.delete(overlay);
              return next;
            })
          }
          counts={COUNTS}
          lines={INDEX_LINES}
          onPulse={setPulse}
          isolated={isolate}
          onIsolate={setIsolate}
        />
      </div>
    </div>
  );
}

function IndexMock(props: Partial<Parameters<typeof MapIndex>[0]>) {
  const [picked, setPicked] = useState<string | null>('giuoco-piano-main');
  const [subtree, setSubtree] = useState<string | null>(props.subtree ?? null);
  const [folded, setFolded] = useState<Set<string>>(new Set(props.folded ?? []));
  return (
    <div className="max-w-sm">
      <MapIndex
        lines={INDEX_LINES}
        side="white"
        {...props}
        picked={picked}
        subtree={subtree}
        folded={folded}
        onPick={setPicked}
        onSubtree={setSubtree}
        onFold={(id, fold) =>
          setFolded((current) => {
            const next = new Set(current);
            if (fold) next.add(id);
            else next.delete(id);
            return next;
          })
        }
        onOpenAll={() => setFolded(new Set())}
      />
    </div>
  );
}

function LegendMock(props: Partial<Parameters<typeof MapLegend>[0]> & { initial: MapOverlay[] }) {
  const [on, setOn] = useState(new Set(props.initial));
  const [isolated, setIsolated] = useState<MoveState | null>(null);
  return (
    <div className="max-w-sm">
      <MapLegend
        counts={COUNTS}
        lines={INDEX_LINES}
        {...props}
        on={on}
        isolated={isolated}
        onIsolate={setIsolated}
        onToggle={(overlay, value) =>
          setOn((current) => {
            const next = new Set(current);
            if (value) next.add(overlay);
            else next.delete(overlay);
            return next;
          })
        }
      />
    </div>
  );
}

/* Finding. */

const lineMeta = (id: string) => {
  const moves = line(id).moves;
  return `${line(id).kind}, ${moves.length} moves, ends ${moves.at(-1)!.san}`;
};
const SEARCH_ITEMS: SearchItem[] = [
  {
    id: 'italian-white',
    kind: 'opening',
    name: 'Italian Game',
    href: '#opening',
    inside: MAP_LINES.map((l) => l.name),
    description: example.opening.summary,
    meta: 'As White, 1. e4 e5 2. Nf3 Nc6 3. Bc4',
  },
  ...example.opening.variations.map<SearchItem>((v) => ({
    id: v.id,
    kind: 'variation',
    name: v.name,
    href: `#${v.id}`,
    opening: 'Italian Game',
    inside: v.lines.map((id) => line(id).name),
    description: v.intro,
    meta: `In the Italian Game, ${v.lines.length} ${v.lines.length === 1 ? 'line' : 'lines'}`,
  })),
  ...MAP_LINES.map<SearchItem>((l) => ({
    id: l.id,
    kind: 'line',
    name: l.name,
    href: `#${l.id}`,
    opening: 'Italian Game',
    description: line(l.id)
      .moves.map((m) => m.note?.text ?? '')
      .join(' '),
    meta: lineMeta(l.id),
  })),
  { id: 'fork', kind: 'idea', name: 'Fork', href: '#fork', description: 'One piece attacks two at once.' },
  {
    id: 'pin',
    kind: 'idea',
    name: 'Pin',
    href: '#pin',
    description: 'A piece cannot move without exposing a bigger one behind it.',
  },
  // Named only so the search has something to forgive: not in the example.
  {
    id: 'caro-kann',
    kind: 'opening',
    name: 'Caro-Kann Defense',
    href: '#caro',
    meta: 'As Black, against 1.e4',
    yours: true,
  },
  {
    id: 'two-knights',
    kind: 'opening',
    name: 'Two Knights Defense',
    href: '#two-knights',
    inside: ['Fried Liver Attack', 'Traxler Counterattack'],
    meta: 'As Black, against the Italian',
  },
  {
    id: 'scandinavian',
    kind: 'opening',
    name: 'Scandinavian Defense',
    href: '#scandi',
    meta: 'As Black, against 1.e4',
  },
];

/** Which side each searchable opening is played by, for the Side filter; ideas belong to both. */
const SIDE_OF: Record<string, 'white' | 'black' | undefined> = Object.fromEntries(
  SEARCH_ITEMS.map((item) => [
    item.id,
    item.kind === 'idea'
      ? undefined
      : ['caro-kann', 'two-knights', 'scandinavian'].includes(item.id)
        ? 'black'
        : 'white',
  ]),
);

const POSITION_LINES: PositionLine[] = MAP_LINES.map((l) => ({
  id: l.id,
  name: l.name,
  opening: 'Italian Game',
  kind: lineKind(l.kind),
  writtenFor: 'white',
  moves: l.moves,
  href: (ply) => `#${l.id}:${ply}`,
}));

function SearchMock(props: Partial<Parameters<typeof SearchBox>[0]> & { initial?: string }) {
  const [query, setQuery] = useState(props.initial ?? '');
  const [side, setSide] = useState<'all' | 'white' | 'black'>('all');
  const [byPosition, setByPosition] = useState(false);
  return (
    <div className="max-w-2xl">
      <SearchBox
        items={
          side === 'all' ? SEARCH_ITEMS : SEARCH_ITEMS.filter((item) => [side, undefined].includes(SIDE_OF[item.id]))
        }
        query={query}
        onQuery={setQuery}
        onOpen={() => {}}
        onSearchByPosition={() => setByPosition(true)}
        slashKey={false}
        filters={
          <FilterToggle label="Side" value={side} options={SIDE_OPTIONS} allValue="all" onChange={setSide} size="sm" />
        }
        {...props}
      />
      <BoardSearch
        lines={POSITION_LINES}
        form="dialog"
        open={byPosition}
        onOpenChange={setByPosition}
        start={['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']}
      />
    </div>
  );
}

function FilterMock<T extends string>(
  props: Omit<Parameters<typeof FilterToggle<T>>[0], 'value' | 'onChange'> & { initial: T },
) {
  const [value, setValue] = useState<T>(props.initial);
  return (
    <div className="grid gap-1">
      <FilterToggle {...props} value={value} onChange={setValue} />
      <p className="text-xs text-muted-foreground">Chosen: {value}</p>
    </div>
  );
}

type Row = {
  id: string;
  name: string;
  kind: string;
  variation: string;
  moves: number;
  games: number;
  known: number;
  order: number;
};
const ROWS: Row[] = MAP_LINES.map((l, order) => ({
  id: l.id,
  name: l.name,
  kind: l.kind,
  variation: example.opening.variations.find((v) => v.lines.includes(l.id))?.name ?? '',
  moves: l.moves.length,
  games: gamesAt(l.moves.at(-1)!.after) ?? 0,
  known: knownShare(l.id),
  order,
}));
const COLUMNS: Column<Row, 'name' | 'kind' | 'variation' | 'moves' | 'games' | 'known'>[] = [
  { key: 'name', heading: 'Line', compare: (a, b) => a.name.localeCompare(b.name), cell: (r) => r.name },
  {
    key: 'kind',
    heading: 'Kind',
    compare: (a, b) => a.kind.localeCompare(b.kind),
    cell: (r) => <KindBadge kind={lineKind(r.kind)} writtenFor="white" learner="white" />,
  },
  {
    key: 'variation',
    heading: 'Variation',
    compare: (a, b) => a.variation.localeCompare(b.variation),
    cell: (r) => r.variation,
  },
  { key: 'moves', heading: 'Moves', align: 'right', compare: (a, b) => a.moves - b.moves, cell: (r) => r.moves },
  {
    key: 'games',
    heading: 'Games at the end',
    align: 'right',
    compare: (a, b) => a.games - b.games,
    cell: (r) => (r.games ? r.games.toLocaleString('en-GB') : 'no data'),
  },
  {
    key: 'known',
    heading: 'Known',
    align: 'right',
    compare: (a, b) => a.known - b.known,
    cell: (r) => `${Math.round(r.known * 100)}%`,
  },
];
const rowActions = (row: Row) => (
  <>
    <Button variant="ghost" size="icon-xs" aria-label={`Show ${row.name}`} className={ABOVE_ROW_LINK}>
      <Eye aria-hidden />
    </Button>
    <Button variant="ghost" size="icon-xs" aria-label={`Try ${row.name}`} className={ABOVE_ROW_LINK}>
      <Play aria-hidden />
    </Button>
  </>
);

function TableWithFilters() {
  const [kind, setKind] = useState<(typeof KIND_OPTIONS)[number]['value']>('all');
  const [query, setQuery] = useState('');
  const rows = ROWS.filter(
    (row) =>
      (kind === 'all' || (kind === 'trap' ? row.kind.startsWith('trap') : row.kind === kind)) &&
      (!query || row.name.toLowerCase().includes(query.toLowerCase())),
  );
  return (
    <SortableTable
      label="Lines of the Italian Game"
      columns={COLUMNS}
      rows={rows}
      rowKey={(r) => r.id}
      rowHref={(r) => `#${r.id}`}
      titleColumn="name"
      actions={rowActions}
      empty="No lines match these filters."
      filters={
        <>
          <FilterToggle label="Kind" value={kind} options={KIND_OPTIONS} allValue="all" onChange={setKind} size="sm" />
          <SearchBox
            form="filter"
            items={[]}
            query={query}
            onQuery={setQuery}
            placeholder="Find a line"
            slashKey={false}
            className="w-56"
          />
        </>
      }
    />
  );
}

export const practiceMapFindingMocks: MockItem[] = [
  {
    id: 'practice-setup',
    variants: [
      {
        name: 'Review',
        note: 'Due today is the default; Weighting hides, since the schedule decides the order. Change From to see it.',
        render: () => <SetupMock mode="review" />,
      },
      {
        name: 'Drill',
        note: 'How the computer replies: as written, as your level plays, or the engine.',
        render: () => <SetupMock mode="drill" />,
      },
      {
        name: 'Puzzles',
        note: 'How many, a rating range, and who solves.',
        render: () => <SetupMock mode="puzzles" />,
      },
      {
        name: 'Play on',
        note: 'How long to keep going past the line, and how much may be given away.',
        render: () => <SetupMock mode="play-on" />,
      },
      {
        name: 'Speed',
        note: 'The run and the depth; From adds an opening rush for each opening.',
        render: () => <SetupMock mode="speed" />,
      },
      { name: 'Name it', note: 'How many positions.', render: () => <SetupMock mode="name-it" /> },
      {
        name: 'Nothing to practise',
        note: 'Due today with nothing due: Start is disabled and the card says what to pick instead.',
        render: () => <SetupMock mode="review" due={0} />,
      },
      {
        name: 'An opening with nothing in it yet',
        note: 'A source with nothing to practise disables Start.',
        render: () => <SetupMock mode="drill" initial={configFor('drill', { source: 'opening:caro-kann' })} />,
      },
      {
        name: 'Free practice',
        note: 'Any source but Due today: the card says nothing changes your schedule.',
        render: () => <SetupMock mode="review" initial={configFor('review', { source: 'variation:traps' })} />,
      },
      {
        name: 'Defaults from a preset',
        note: 'Each field says where its default came from.',
        render: () => (
          <SetupMock
            mode="drill"
            origins={{ computerPlays: 'from the Exam preset', weighting: 'from the Club player preset' }}
          />
        ),
      },
      {
        name: 'A line’s quiz',
        note: 'Only moves per question (`only`).',
        render: () => <SetupMock mode="review" only={['movesPerQuestion']} title="Quiz the Legal Mate trap" />,
      },
      {
        name: 'A checkpoint',
        note: 'No fields at all; just Start.',
        render: () => (
          <SetupMock mode="drill" only={[]} title="Checkpoint: the Giuoco Piano" startLabel="Start the checkpoint" />
        ),
      },
      {
        name: 'Opened from a session',
        note: 'Start again and Cancel; Escape cancels too.',
        render: () => <SetupMock mode="speed" startLabel="Start again" onCancel={() => {}} />,
      },
    ],
  },
  {
    id: 'practice-bar',
    variants: [
      {
        name: 'Review, due today',
        note: 'Press Change: the card replaces the bar in place; Cancel puts it back.',
        render: () => <BarMock mode="review" progress={{ done: 7, total: 20 }} />,
      },
      {
        name: 'Drill',
        render: () => <BarMock mode="drill" progress={{ done: 3, total: 12 }} />,
      },
      {
        name: 'Puzzles',
        render: () => <BarMock mode="puzzles" progress={{ done: 2, total: 10 }} />,
      },
      {
        name: 'Speed, against the clock',
        note: 'No counter on a timed run: the clock already says it.',
        render: () => <BarMock mode="speed" config={configFor('speed', { run: 'time:60', depth: 0 })} />,
      },
      {
        name: 'Name it',
        render: () => <BarMock mode="name-it" progress={{ done: 4, total: 10 }} />,
      },
      {
        name: 'A line’s quiz',
        note: 'Its own words instead of the generated ones.',
        render: () => (
          <BarMock
            mode="review"
            summary="Every question of the Legal Mate trap"
            only={['movesPerQuestion']}
            progress={{ done: 2, total: 6 }}
          />
        ),
      },
      {
        name: 'A checkpoint',
        note: 'The set-up is fixed: no Change.',
        render: () => (
          <BarMock
            mode="drill"
            summary="Checkpoint: the Giuoco Piano, 12 moves"
            fixed
            progress={{ done: 5, total: 12 }}
          />
        ),
      },
    ],
  },
  {
    id: 'exercise-panel',
    variants: [
      {
        name: 'Your move',
        note: 'The prompt in the mode’s colour, two tries, help unused, progress.',
        render: () => (
          <ExercisePanel
            mode="drill"
            prompt="Your move as White"
            context={CONTEXT}
            tries={{ left: 2, total: 2 }}
            help={{ hint: false, shown: false }}
            progress={{ done: 3, total: 12 }}
            className="max-w-md"
          />
        ),
      },
      {
        name: 'A wrong try',
        note: '5.d4 instead of 5.d3, judged from the stored evaluations: a try marker empties.',
        render: () => (
          <ExercisePanel
            mode="drill"
            prompt="Your move as White"
            context={CONTEXT}
            tries={{ left: 1, total: 2 }}
            help={{ hint: false, shown: false }}
            progress={{ done: 3, total: 12 }}
            verdict={wrongNote}
            className="max-w-md"
          />
        ),
      },
      {
        name: 'Shown',
        note: 'Out of tries, or Show me: the move and why stay up with Next (Enter or the right arrow).',
        render: () => (
          <ExercisePanel
            mode="review"
            prompt="Your move as White"
            context={CONTEXT}
            tries={{ left: 0, total: 2 }}
            help={{ hint: true, shown: true }}
            progress={{ done: 8, total: 20 }}
            result="shown"
            explanation={
              <>
                <span className="font-mono font-semibold">5.d3</span>:{' '}
                {wrongAt.note?.text ?? 'Keeps the centre closed.'}
              </>
            }
            onNext={() => {}}
            className="max-w-md"
          />
        ),
      },
      {
        name: 'Right',
        note: 'A tick, the move’s comment, and play carries on by itself: no Next.',
        render: () => (
          <ExercisePanel
            mode="drill"
            prompt="Your move as White"
            context={CONTEXT}
            tries={{ left: 2, total: 2 }}
            help={{ hint: false, shown: false }}
            progress={{ done: 4, total: 12 }}
            result="right"
            explanation={mainLine.moves[6]!.note?.text}
            className="max-w-md"
          />
        ),
      },
      {
        name: 'Right with a hint',
        note: 'The hint marker is lit, since it counts.',
        render: () => (
          <ExercisePanel
            mode="review"
            prompt="Your move as White"
            context={CONTEXT}
            tries={{ left: 2, total: 2 }}
            help={{ hint: true, shown: false }}
            progress={{ done: 9, total: 20 }}
            result="right-hint"
            className="max-w-md"
          />
        ),
      },
      {
        name: 'Their mistakes',
        note: 'A step’s punishment stage: how often the mistake is made at your level.',
        render: () => (
          <ExercisePanel
            mode="step"
            prompt="Find the punishment: Black has just played 5...Bh5?"
            context="Legal Mate trap, played in about 1 game in 4 at your level"
            tries={{ left: 2, total: 2 }}
            help={{ hint: false, shown: false }}
            className="max-w-md"
          />
        ),
      },
      {
        name: 'Name it, with the answer box',
        note: 'The page puts the answer input under the prompt.',
        render: () => (
          <ExercisePanel
            mode="name-it"
            prompt="Name this opening"
            progress={{ done: 4, total: 10 }}
            className="max-w-xl"
          >
            <AnswerInput suggestions={NAMES} onAnswer={() => {}} onGiveUp={() => {}} autoFocus={false} />
          </ExercisePanel>
        ),
      },
      {
        name: 'Speed, against the clock',
        note: 'The clock replaces the counter.',
        render: () => (
          <ExercisePanel
            mode="speed"
            prompt="Your move as White"
            context={<OpeningName name="Italian Game: Giuoco Piano" />}
            help={{ hint: false, shown: false }}
            clock={<span className="text-2xl font-semibold">0:42</span>}
            className="max-w-md"
          />
        ),
      },
      {
        name: 'Beside the board',
        note: 'Play the wrong move or the right one with the buttons under the board.',
        render: () => <ExerciseWithBoard />,
      },
    ],
  },
  {
    id: 'answer-input',
    variants: [
      {
        name: 'Name it',
        note: 'Type "carokan" or "giuoco pianisimo": slips are forgiven. Up and Down move, Enter or Tab fills, Enter answers.',
        render: () => <AnswerMock />,
      },
      {
        name: 'Full credit',
        render: () => (
          <AnswerInput
            suggestions={NAMES}
            autoFocus={false}
            answered="Giuoco Pianissimo"
            verdict={{ credit: 'full', message: 'the Giuoco Pianissimo.' }}
            onAnswer={() => {}}
            onGiveUp={() => {}}
            className="max-w-xl"
          />
        ),
      },
      {
        name: 'Half credit',
        note: 'The right opening, not the variation.',
        render: () => (
          <AnswerInput
            suggestions={NAMES}
            autoFocus={false}
            answered="Italian Game"
            verdict={{
              credit: 'half',
              message: 'Right opening; the variation is the Giuoco Pianissimo.',
              accepted: ['Italian Game: Giuoco Pianissimo'],
            }}
            onAnswer={() => {}}
            onGiveUp={() => {}}
            className="max-w-xl"
          />
        ),
      },
      {
        name: 'Missed',
        note: 'I don’t know, or a wrong name: the accepted answers are listed.',
        render: () => (
          <AnswerInput
            suggestions={NAMES}
            autoFocus={false}
            answered="Ruy Lopez"
            verdict={{
              credit: 'none',
              message: 'This is the Italian Game.',
              accepted: ['Italian Game: Giuoco Pianissimo'],
            }}
            onAnswer={() => {}}
            onGiveUp={() => {}}
            className="max-w-xl"
          />
        ),
      },
      {
        name: 'A question in words',
        note: 'No suggestions: they would give the answer away.',
        render: () => (
          <div className="grid max-w-xl gap-2">
            <p className="text-sm">Why does White play 4.c3 here?</p>
            <AnswerInput
              placeholder="Name the idea in a few words"
              autoFocus={false}
              onAnswer={() => {}}
              onGiveUp={() => {}}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: 'session-summary',
    variants: [
      {
        name: 'Review done',
        note: 'Every try, not only the last, each costed against the line’s move; the Again card under it.',
        render: () => (
          <SessionSummary
            mode="review"
            headline="Review done: 20 moves"
            sentence="15 right first time, 3 with help, 2 to see again soon."
            figures={[
              { value: '15', label: 'right first time' },
              { value: '3', label: 'with help' },
              { value: '2', label: 'to see again soon' },
            ]}
            tries={TRIES}
            ideas={[OPENING_IDEAS.development!, OPENING_IDEAS.centre!, OPENING_IDEAS.pin!]}
            next={{ state: { ...NEXT_BASE, nextOpenStep: NEXT_STEP } }}
            again={{ config: configFor('review'), sources: SOURCES, due: 12, onStart: () => {} }}
          />
        ),
      },
      {
        name: 'With the board',
        note: 'Pick a row: the board goes to that position with what you played and the line’s move.',
        render: () => <SummaryWithBoard />,
      },
      {
        name: 'Free practice, table folded',
        note: 'With feedback.triesTable off, the table waits behind See every try.',
        render: () => (
          <SessionSummary
            mode="review"
            headline="Practice done: 12 moves"
            sentence="10 right first time, 2 missed."
            free
            figures={[
              { value: '10', label: 'right first time' },
              { value: '0', label: 'with help' },
              { value: '2', label: 'missed' },
            ]}
            tries={TRIES}
            triesTable="off"
          />
        ),
      },
      {
        name: 'Puzzles',
        render: () => (
          <SessionSummary
            mode="puzzles"
            headline="Puzzles done: 8 from the Italian Game"
            sentence="6 solved, 1 with a hint, 1 missed."
            figures={[
              { value: '6 of 8', label: 'solved' },
              { value: '1414 to 1485', label: 'rating range' },
            ]}
            ideas={[PUZZLE_IDEAS.fork!, PUZZLE_IDEAS.discoveredAttack!, PUZZLE_IDEAS.deflection!]}
            again={{ config: configFor('puzzles'), sources: SOURCES, onStart: () => {} }}
          />
        ),
      },
      {
        name: 'Speed',
        render: () => (
          <SessionSummary
            mode="speed"
            headline="Run done: 5 lines to move 10"
            figures={[
              { value: '1.8 s', label: 'a move, on average' },
              { value: '38', label: 'moves' },
              { value: '2', label: 'hints and shows' },
            ]}
            again={{ config: configFor('speed'), sources: SOURCES, onStart: () => {} }}
          />
        ),
      },
      {
        name: 'Name it',
        note: 'No tries table: its own list of names, with full, half or no credit.',
        render: () => (
          <SessionSummary
            mode="name-it"
            headline="Name it done: 5 positions"
            figures={[{ value: '3.5', label: 'points of 5' }]}
            named={[
              { ply: 5, san: 'Bc5', typed: 'Giuoco Piano', right: 'Italian Game: Giuoco Piano', credit: 'full' },
              { ply: 8, san: 'd3', typed: 'Italian Game', right: 'Italian Game: Giuoco Pianissimo', credit: 'half' },
              { ply: 5, san: 'd6', typed: 'Philidor', right: 'Italian Game: Paris Defense', credit: 'none' },
              {
                ply: 9,
                san: 'd5',
                typed: 'Giuoco Pianissimo',
                right: 'Italian Game: Giuoco Pianissimo',
                credit: 'full',
              },
              { ply: 11, san: 'Bg4', typed: '', right: 'Italian Game: Giuoco Pianissimo', credit: 'none' },
            ]}
            again={{ config: configFor('name-it'), sources: SOURCES, onStart: () => {} }}
          />
        ),
      },
      {
        name: 'Play on',
        render: () => (
          <SessionSummary
            mode="play-on"
            headline="Play on done: you kept your advantage"
            sentence="Five moves past the end of the Giuoco Piano, giving away no more than a mistake."
            figures={[
              { value: '+0.4 → +0.6', label: 'evaluation, start to end' },
              { value: '5 of 5', label: 'moves kept' },
            ]}
            tries={TRIES.slice(-4)}
            evalAfter={scoreOf(mainLine.moves.at(-1)!.after)}
          />
        ),
      },
      {
        name: 'A step’s Done stage',
        note: 'Where the line leaves you and the ideas met; no Again card.',
        render: () => (
          <SessionSummary
            mode="step"
            headline="Step known. 4 moves join your reviews."
            ideas={[OPENING_IDEAS.development!, OPENING_IDEAS.centre!]}
            evalAfter={scoreOf(mainLine.moves[11]!.after)}
            next={{ state: { ...NEXT_BASE, nextOpenStep: { ...NEXT_STEP, number: 4, title: 'Castle, then Re1' } } }}
          />
        ),
      },
      {
        name: 'Nothing to review',
        note: 'An empty session: the reason and the ways on.',
        render: () => (
          <SessionSummary
            mode="review"
            headline="Nothing to review right now"
            empty={{
              reason: 'Every move you know is scheduled for later. The next ones are due tomorrow.',
              action: { label: 'Practise My repertoire', href: '#practice' },
              secondary: { label: 'Raise new moves a day', href: '#settings' },
            }}
            next={{ state: { ...NEXT_BASE, nextOpenStep: NEXT_STEP } }}
          />
        ),
      },
    ],
  },
  {
    id: 'puzzle-card',
    variants: [
      {
        name: 'Cards',
        note: 'The eight Lichess puzzles from the Giuoco Piano: after the move that sets each up, turned for the side that solves.',
        render: () => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
            {PUZZLES.map((puzzle) => (
              <PuzzleCard
                key={puzzle.id}
                puzzle={puzzle}
                href={`#puzzle-${puzzle.id}`}
                from={fromOf(puzzle.openingTags)}
                fromPosition={MAIN[9]}
                level={[1350, 1500]}
                ideas={PUZZLE_IDEAS}
              />
            ))}
          </div>
        ),
      },
      {
        name: 'Before solving',
        note: 'Themes hidden, since a theme can give the answer away.',
        render: () => <PuzzleCard puzzle={PUZZLES[0]!} href="#" from={fromOf(PUZZLES[0]!.openingTags)} hideThemes />,
      },
      {
        name: 'Tried',
        note: 'Solved, with a hint, missed, and the next review when it is a card.',
        render: () => (
          <div className="flex flex-wrap gap-3">
            <PuzzleCard
              puzzle={PUZZLES[2]!}
              href="#"
              from={fromOf(PUZZLES[2]!.openingTags)}
              state={{ result: 'solved', nextReview: 'in 6 days' }}
            />
            <PuzzleCard
              puzzle={PUZZLES[3]!}
              href="#"
              from={fromOf(PUZZLES[3]!.openingTags)}
              state={{ result: 'hint', nextReview: 'tomorrow' }}
            />
            <PuzzleCard
              puzzle={PUZZLES[4]!}
              href="#"
              from={fromOf(PUZZLES[4]!.openingTags)}
              state={{ result: 'missed', nextReview: 'today' }}
            />
          </div>
        ),
      },
      {
        name: 'The opponent solves',
        note: 'For a White repertoire, a puzzle Black solves asks what Black threatens.',
        render: () => (
          <PuzzleCard
            puzzle={PUZZLES[1]!}
            href="#"
            from={fromOf(PUZZLES[1]!.openingTags)}
            learnerSide="white"
            ideas={PUZZLE_IDEAS}
          />
        ),
      },
      {
        name: 'Rows',
        note: 'In a step’s extras or the variation list: thumb, rating, one line.',
        render: () => (
          <div className="grid max-w-lg gap-2">
            {PUZZLES.slice(0, 4).map((puzzle, i) => (
              <PuzzleCard
                key={puzzle.id}
                puzzle={puzzle}
                href="#"
                size="row"
                from={fromOf(puzzle.openingTags)}
                state={i === 1 ? { result: 'solved' } : undefined}
              />
            ))}
          </div>
        ),
      },
    ],
  },
  {
    id: 'countdown',
    variants: [
      {
        name: 'Live',
        note: 'Counts down by itself; Start now, Enter or Space skip; Escape pauses with Resume and Stop the run.',
        render: () => <LiveCountdown />,
      },
      {
        name: 'Get ready',
        note: 'Before the first line: the run’s shape.',
        render: () => (
          <FrozenCountdown
            next={{ opening: 'Italian Game', variation: 'Giuoco Piano', side: 'white' }}
            first={{ shape: '5 lines, to move 10' }}
            frozenAt={5}
          />
        ),
      },
      { name: 'Between lines, at 3', render: () => <FrozenCountdown /> },
      { name: 'At 1', render: () => <FrozenCountdown frozenAt={1} /> },
      { name: 'Paused', note: 'After Escape.', render: () => <FrozenCountdown startPaused onStop={() => {}} /> },
    ],
  },
  {
    id: 'map-tree',
    variants: [
      {
        name: 'The learner’s map',
        note: 'Progress and gaps. Gap stubs are the band’s real replies at 5% or more that no line answers. Click a pill to pick it; arrow keys once focused.',
        render: () => <MapMock overlays={['progress', 'gaps']} />,
      },
      {
        name: 'The theory tree',
        note: 'An opening’s Tree tab starts on Lines: each lane in its colour.',
        render: () => <MapMock overlays={['lines']} />,
      },
      {
        name: 'Their mistakes and puzzles',
        note: 'The Legal Mate’s 5...Bh5 and 7...Bxd1 are marked (the first practised); puzzle counts on the Giuoco Piano.',
        render: () => <MapMock overlays={['mistakes', 'puzzles', 'lines']} />,
      },
      {
        name: 'Coverage',
        note: 'Lanes thicker where more games at the band reach them.',
        render: () => <MapMock overlays={['coverage', 'lines']} />,
      },
      {
        name: 'Picked out',
        note: 'One line lit, the rest dim.',
        render: () => <MapMock overlays={['lines']} lit={['legal-mate']} focus={{ line: 'legal-mate', ply: 11 }} />,
      },
      {
        name: 'A subtree',
        note: 'Only what grows from the ...Bg4 line.',
        render: () => <MapMock overlays={['lines']} subtree="giuoco-piano-bg4" />,
      },
      {
        name: 'Folded',
        note: 'The main line’s branches folded away from the index: +3 after its last move.',
        render: () => <MapMock overlays={['lines']} folded={new Set(['giuoco-piano-main'])} />,
      },
      {
        name: 'Small, fitted',
        note: 'Zoom starts fitted to the box; the buttons, + and -, F, or Ctrl with the wheel.',
        render: () => (
          <div className="max-w-xl">
            <MapMock overlays={['progress']} zoom="fit" />
          </div>
        ),
      },
      {
        name: 'With previews',
        note: 'No board in view: hovering a pill opens a small board.',
        render: () => <MapMock overlays={['lines']} previews />,
      },
      { name: 'Loading', render: () => <MapMock overlays={['lines']} loading /> },
      {
        name: 'Everything together',
        note: 'Index, map, board, side panel and legend: hover a pill to light its squares, toggle overlays in the key.',
        render: () => <MapPlayground />,
      },
    ],
  },
  {
    id: 'map-index',
    variants: [
      {
        name: 'One opening',
        note: 'No group headings; each line under the one it grows from. Hover an entry for its moves; the crosshair on hover.',
        render: () => <IndexMock />,
      },
      {
        name: 'With progress',
        note: 'A share-known bar per line.',
        render: () => <IndexMock showProgress />,
      },
      {
        name: 'Several openings',
        note: 'Grouped by the first two moves. The Caro-Kann lines are named only for the grouping.',
        render: () => (
          <IndexMock
            groups={[
              { id: 'e4e5', name: '1.e4 e5' },
              { id: 'e4c6', name: '1.e4 c6' },
            ]}
            lines={[
              ...INDEX_LINES,
              {
                id: 'ck-advance',
                name: 'Caro-Kann: Advance',
                kind: 'main',
                parent: null,
                lane: 4,
                group: 'e4c6',
                opening: 'Caro-Kann Defense',
              },
              {
                id: 'ck-exchange',
                name: 'Caro-Kann: Exchange',
                kind: 'sideline',
                parent: 'ck-advance',
                lane: 5,
                group: 'e4c6',
                opening: 'Caro-Kann Defense',
              },
              {
                id: 'ck-fantasy',
                name: 'Caro-Kann: Fantasy',
                kind: 'rare',
                parent: 'ck-advance',
                lane: 6,
                group: 'e4c6',
                opening: 'Caro-Kann Defense',
                rare: true,
              },
            ]}
          />
        ),
      },
      {
        name: 'Folded',
        note: 'Folding the main line hides what grows from it here and on the map.',
        render: () => <IndexMock folded={new Set(['giuoco-piano-main'])} />,
      },
      {
        name: 'A subtree drawn',
        note: 'Show all at the foot undoes it.',
        render: () => <IndexMock subtree="giuoco-piano-bg4" />,
      },
    ],
  },
  {
    id: 'map-legend',
    variants: [
      {
        name: 'Below the map',
        note: 'Progress with counts (hover a sample, click to pick those moves out), gaps and mistakes; the rest folded under More overlays.',
        render: () => <LegendMock initial={['progress', 'gaps', 'mistakes']} />,
      },
      {
        name: 'In a corner',
        note: 'A small folded panel over the map on wide screens.',
        render: () => <LegendMock initial={['progress', 'gaps']} placement="corner" />,
      },
      {
        name: 'Lines, coverage and puzzles',
        render: () => <LegendMock initial={['lines', 'coverage', 'puzzles']} />,
      },
      {
        name: 'No data here yet',
        note: 'Positions with no popularity data show no gap stubs.',
        render: () => <LegendMock initial={['gaps']} noData />,
      },
    ],
  },
  {
    id: 'search-box',
    variants: [
      {
        name: 'The search page',
        note: 'Results update as you type, each saying why it matched. Try "giuoco", "fried liver", "scandanavian", "pin".',
        render: () => <SearchMock initial="giuoco" />,
      },
      {
        name: 'A forgiven slip',
        note: '"scandanavian" is close to Scandinavian.',
        render: () => <SearchMock initial="scandanavian" />,
      },
      {
        name: 'Lines inside',
        note: '"fried liver" finds the opening that holds it.',
        render: () => <SearchMock initial="fried liver" />,
      },
      {
        name: 'Nothing found',
        note: 'With the way on: search by position.',
        render: () => <SearchMock initial="xyz" />,
      },
      {
        name: 'Compact',
        note: 'The map index or the header: a drop-down of the top eight, Up and Down, Escape closes.',
        render: () => (
          <div className="max-w-sm pb-72">
            <SearchBox form="compact" items={SEARCH_ITEMS} placeholder="Search" slashKey={false} onOpen={() => {}} />
          </div>
        ),
      },
    ],
  },
  {
    id: 'board-search',
    variants: [
      {
        name: 'After 3.Bc4',
        note: 'All four lines pass through. Play on, step back, or change the filter.',
        render: () => <BoardSearch lines={POSITION_LINES} start={['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']} />,
      },
      {
        name: 'By another move order',
        note: '1.e4 e5 2.Bc4 Nc6 3.Nf3 reaches the same position: transpositions match.',
        render: () => <BoardSearch lines={POSITION_LINES} start={['e4', 'e5', 'Bc4', 'Nc6', 'Nf3']} />,
      },
      {
        name: 'Traps only',
        render: () => (
          <BoardSearch lines={POSITION_LINES} start={['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6']} kind="traps" />
        ),
      },
      {
        name: 'No line here',
        note: 'With a way to open the position on the board.',
        render: () => <BoardSearch lines={POSITION_LINES} start={['d4', 'd5']} boardHref={() => '#board'} />,
      },
      {
        name: 'From the search box',
        note: 'The dialog form.',
        render: () => {
          function Opener() {
            const [open, setOpen] = useState(false);
            return (
              <>
                <Button variant="outline" onClick={() => setOpen(true)}>
                  Search by position
                </Button>
                <BoardSearch lines={POSITION_LINES} form="dialog" open={open} onOpenChange={setOpen} />
              </>
            );
          }
          return <Opener />;
        },
      },
    ],
  },
  {
    id: 'filter-toggle',
    variants: [
      {
        name: 'Side',
        note: 'Both is the "no filter" value: choosing the chosen button again goes back to it.',
        render: () => <FilterMock label="Side" options={SIDE_OPTIONS} allValue="all" initial="white" />,
      },
      {
        name: 'Kind, with counts and hints',
        note: 'Hover a kind for what it means.',
        render: () => (
          <FilterMock
            label="Kind"
            options={KIND_OPTIONS.map((option) => ({
              ...option,
              count:
                option.value === 'all'
                  ? MAP_LINES.length
                  : MAP_LINES.filter((l) =>
                      option.value === 'trap' ? l.kind.startsWith('trap') : l.kind === option.value,
                    ).length,
            }))}
            allValue="all"
            initial="all"
          />
        ),
      },
      {
        name: 'A disabled option',
        note: 'Stays visible, with a hint saying why.',
        render: () => (
          <FilterMock
            label="Side"
            options={SIDE_OPTIONS.map((o) =>
              o.value === 'black' ? { ...o, disabled: true, hint: 'No Black openings yet' } : o,
            )}
            initial="white"
          />
        ),
      },
      {
        name: 'Weighting, small',
        note: 'No "all" value: choosing the chosen button again does nothing.',
        render: () => <FilterMock label="Weighting" options={WEIGHTING_OPTIONS} initial="popular" size="sm" />,
      },
    ],
  },
  {
    id: 'sortable-table',
    variants: [
      {
        name: 'The example’s lines',
        note: 'Headings sort up, down, then back to the opening’s order; a click anywhere on a row opens it, the icons keep their own clicks. Narrow the window for cards.',
        render: () => (
          <SortableTable
            label="Lines of the Italian Game"
            columns={COLUMNS}
            rows={ROWS}
            rowKey={(r) => r.id}
            rowHref={(r) => `#${r.id}`}
            titleColumn="name"
            actions={rowActions}
          />
        ),
      },
      {
        name: 'With filters above',
        note: 'A kind filter and a compact search box.',
        render: () => <TableWithFilters />,
      },
      {
        name: 'Empty',
        render: () => (
          <SortableTable
            label="Openings"
            columns={COLUMNS}
            rows={[]}
            rowKey={(r) => r.id}
            titleColumn="name"
            empty="No openings for Black match these filters."
          />
        ),
      },
      {
        name: 'Loading',
        render: () => (
          <SortableTable label="Openings" columns={COLUMNS} rows={[]} rowKey={(r) => r.id} titleColumn="name" loading />
        ),
      },
    ],
  },
];
