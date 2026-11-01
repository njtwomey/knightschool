import { beats, learnerMovesIn, speedExercise, speedScore, START_EPD } from '@knightschool/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '@/components/board/board';
import type { Try } from '@/components/chess/tries-table';
import { Countdown } from '@/components/practice/countdown';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { PracticeBar } from '@/components/practice/practice-bar';
import { describeConfig, runName, type PracticeConfig } from '@/components/practice/practice-config';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { learnerStore } from '@/data/learner';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import { openingSource, practiceSources, variationSource } from '../sources';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';
import { bestKey, loadSpeedData, poolOf, queueOf, runShape, rushOf, type RunLine, type SpeedData } from './speed-data';

const speedHref = (opening?: string, variation?: string) =>
  to(`/practice/speed${opening ? `/${opening}` : ''}${variation ? `/${variation}` : ''}`);

const newId = () => crypto.randomUUID();
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/**
 * Speed (docs/v2/pages/speed.md): lines played from memory against the clock, the other side answering at once.
 * `/practice/speed` is the set-up card; `/practice/speed/<opening>[/<variation>]` starts at once, and
 * `/practice/speed/<opening>/rush` is the opening rush (each known step from the start to its end).
 */
export function SpeedPage({ opening, variation }: { opening?: string; variation?: string }) {
  const data = useLoad(loadSpeedData, []);
  const name = opening ? data.data?.openings.find((o) => o.id === opening)?.name : undefined;
  const crumbs = [
    { label: 'Speed', href: opening ? speedHref() : undefined },
    ...(name ? [{ label: variation === 'rush' ? `${name} rush` : name }] : []),
  ];
  const fixed = opening
    ? variation === 'rush'
      ? `rush:${opening}`
      : variation
        ? variationSource(opening, variation)
        : openingSource(opening)
    : undefined;
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs root={{ label: 'Practice', href: to('/practice') }} crumbs={crumbs} />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <SpeedView key={fixed ?? 'setup'} data={data.data} fixed={fixed} />
      )}
    </main>
  );
}

type Run = { config: PracticeConfig; queue: RunLine[]; key: number };

function SpeedView({ data, fixed }: { data: SpeedData; fixed?: string }) {
  const saved = readPracticeConfig('speed', { run: `lines:${siteConfig.practice.speedLines}` });
  const sources = useMemo(() => practiceSources(data.openings), [data]);
  const start = (config: PracticeConfig): Run => ({
    config,
    queue: queueOf(poolOf(data, config), config),
    key: Date.now(),
  });
  const [run, setRun] = useState<Run | null>(() => (fixed ? start({ ...saved, source: fixed }) : null));
  const begin = (config: PracticeConfig) => {
    savePracticeConfig('speed', config);
    setRun(start(config));
  };
  if (!run) return <PracticeSetup mode="speed" initial={saved} sources={sources} onStart={begin} />;
  return <SpeedRun key={run.key} run={run} data={data} sources={sources} onStart={begin} />;
}

/** The line in play so far, for the clock: the moves made, its tries and help, when it began. */
type LineProgress = { moves: number; tries: Try[]; help: number; started: number };

/** One line finished (or stopped by the clock): its time, the learner moves made, help used and every try. */
type LineDone = { line: RunLine; ms: number; moves: number; help: number; right: boolean; tries: Try[] };

function SpeedRun({
  run,
  data,
  sources,
  onStart,
}: {
  run: Run;
  data: SpeedData;
  sources: ReturnType<typeof practiceSources>;
  onStart: (config: PracticeConfig) => void;
}) {
  const { kind, size } = runShape(run.config);
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'done'>('countdown');
  const [done, setDone] = useState<LineDone[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState<LineProgress | null>(null);
  const session = useRef(newId());
  const line = run.queue[at];

  // The clock: when a timed run reaches zero the run ends, counting the moves of the line in play.
  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      if (kind === 'time' && deadline !== null && t >= deadline && line) {
        if (live?.moves) {
          setDone((list) => [
            ...list,
            { line, ms: t - live.started, moves: live.moves, help: live.help, right: false, tries: live.tries },
          ]);
        }
        setPhase('done');
      }
      setNow(t);
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, paused, kind, deadline, line, live]);
  // Change stops the clock while the set-up card is open.
  const pausedAt = useRef(0);
  const pause = (on: boolean) => {
    if (on) pausedAt.current = Date.now();
    else if (deadline !== null) setDeadline(deadline + Date.now() - pausedAt.current);
    setPaused(on);
  };

  const finishLine = (result: ExerciseResult, tries: Try[], help: number) => {
    const moves = learnerMovesIn(line!.script, line!.side);
    const entry: LineDone = { line: line!, ms: result.ms, moves, help, right: result.right, tries };
    setDone((list) => [...list, entry]);
    void learnerStore().then((store) =>
      store.attempts.add({
        id: newId(),
        at: new Date().toISOString(),
        session: session.current,
        mode: 'speed',
        ref: result.id,
        result: result.shown ? 'shown' : result.right ? 'right' : 'wrong',
        tries: result.attempt.tries,
        ms: result.ms,
        hint: result.hint,
        shown: result.shown,
      }),
    );
    setLive(null);
    const next = at + 1;
    if (next >= run.queue.length) setPhase('done');
    else {
      setAt(next);
      if (kind === 'lines') setPhase('countdown');
    }
  };

  const bar = (
    <PracticeBar
      mode="speed"
      config={run.config}
      sources={sources}
      onStart={onStart}
      onPause={pause}
      summary={describeConfig('speed', run.config, sources)}
      progress={kind === 'lines' && phase !== 'done' ? { done: at, total: run.queue.length } : undefined}
    />
  );

  if (run.queue.length === 0) {
    const rush = rushOf(run.config.source);
    const opening = rush ? data.openings.find((o) => o.id === rush) : undefined;
    return (
      <>
        {bar}
        <EmptyState
          kind="locked"
          text={rush ? 'Learn a step of this opening first.' : 'No lines to play from here.'}
          action={opening ? { label: 'Its first step', href: to(`/openings/${opening.id}/step/1`) } : undefined}
        />
      </>
    );
  }

  if (phase === 'done')
    return (
      <>
        {bar}
        <SpeedSummary run={run} done={done} sources={sources} onStart={onStart} />
      </>
    );

  const elapsed = done.reduce((sum, one) => sum + one.ms, 0) + (live ? now - live.started : 0);
  const clock =
    kind === 'time' ? (
      <span className="text-3xl font-semibold tabular-nums">
        {seconds(deadline === null ? size * 1000 : Math.max(0, deadline - now))}
      </span>
    ) : (
      <span className="text-3xl font-semibold tabular-nums">{seconds(elapsed)}</span>
    );
  const movesMade = done.reduce((sum, one) => sum + one.moves, 0) + (live?.moves ?? 0);

  if (phase === 'countdown') {
    return (
      <>
        {bar}
        <div className="relative grid max-w-xl">
          <Board positions={[{ epd: START_EPD }]} index={0} reveal="test" orientation={line!.side} flippable={false} />
          {paused ? null : (
            <Countdown
              key={at}
              next={{ opening: line!.name, variation: line!.variation, side: line!.side }}
              seconds={siteConfig.practice.countdownSeconds}
              first={
                at === 0
                  ? {
                      shape:
                        runShape(run.config).kind === 'time'
                          ? `${runName(run.config.run)} against the clock`
                          : `${run.queue.length} lines`,
                    }
                  : undefined
              }
              onDone={() => {
                if (kind === 'time' && deadline === null) setDeadline(Date.now() + size * 1000);
                setNow(Date.now());
                setPhase('playing');
              }}
              onStop={() => setPhase('done')}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {bar}
      <SpeedLine
        key={at}
        line={line!}
        onProgress={setLive}
        onFinished={finishLine}
        aside={
          <ExercisePanel
            mode="speed"
            prompt={line!.variation ? `${line!.name}: ${line!.variation}` : line!.name}
            context={`You play ${line!.side === 'white' ? 'White' : 'Black'}. ${movesMade} ${movesMade === 1 ? 'move' : 'moves'} made.`}
            clock={clock}
          />
        }
      />
    </>
  );
}

/** One line in play: its own exercise session, the other side answering at once, nothing saved to the schedule. */
function SpeedLine({
  line,
  aside,
  onProgress,
  onFinished,
}: {
  line: RunLine;
  aside: React.ReactNode;
  onProgress: (progress: LineProgress) => void;
  onFinished: (result: ExerciseResult, tries: Try[], help: number) => void;
}) {
  const exercises = useMemo(() => [speedExercise(line, line.script)], [line]);
  const session = useExerciseSession({ exercises, save: 'none', delays: { opponent: 0, next: 0 } });
  const [help, setHelp] = useState(0);
  const started = useRef(0);
  const reported = useRef(false);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const moves = session.played.filter((move) => move.mine).length;
  useEffect(() => {
    onProgress({ moves, tries: session.tries, help, started: started.current });
  }, [moves, session.tries, help]);
  useEffect(() => {
    const result = session.results[0];
    if (!result || reported.current) return;
    reported.current = true;
    onFinished(result, session.tries, help);
  }, [session.results]);
  // Hint and Show me each count as a step of help.
  const counted = {
    ...session,
    hint: () => {
      setHelp((n) => n + 1);
      session.hint();
    },
    show: () => {
      setHelp((n) => n + 1);
      session.show();
    },
  };
  return (
    <ExerciseBoard session={counted} aside={aside} feedback={false} prompt={<p className="font-medium">Your move</p>} />
  );
}

function SpeedSummary({
  run,
  done,
  sources,
  onStart,
}: {
  run: Run;
  done: LineDone[];
  sources: ReturnType<typeof practiceSources>;
  onStart: (config: PracticeConfig) => void;
}) {
  const { kind } = runShape(run.config);
  const score = speedScore(kind, done);
  const help = done.reduce((sum, one) => sum + one.help, 0);
  const [best, setBest] = useState<{ before?: number; beaten: boolean } | null>(null);
  useEffect(() => {
    void (async () => {
      const store = await learnerStore();
      const key = bestKey(run.config);
      const raw = await store.settings.get(key);
      const before = raw === undefined ? undefined : Number(raw);
      const beaten = done.length > 0 && score.value > 0 && beats(score, before);
      if (beaten) await store.settings.set(key, String(score.value));
      setBest({ before, beaten });
    })();
  }, []);
  const tries = done.flatMap((one) => one.tries).sort((a, b) => b.ms - a.ms);
  const figure =
    kind === 'time'
      ? { value: String(score.value), label: score.value === 1 ? 'move made' : 'moves made' }
      : { value: seconds(score.value), label: 'a move, on average' };
  const bestText =
    best === null
      ? ''
      : best.beaten
        ? best.before === undefined
          ? 'Your first run with this set-up.'
          : 'A new best for this set-up.'
        : best.before !== undefined
          ? `Your best is ${kind === 'time' ? `${best.before} moves` : `${seconds(best.before)} a move`}.`
          : '';
  return (
    <SessionSummary
      mode="speed"
      headline={`Speed run done: ${done.length} ${done.length === 1 ? 'line' : 'lines'}`}
      sentence={[
        `${done.filter((one) => one.right).length} played without a slip.`,
        help ? `${help} ${help === 1 ? 'step' : 'steps'} of help.` : '',
        bestText,
      ]
        .filter(Boolean)
        .join(' ')}
      figures={[
        figure,
        { value: String(done.reduce((sum, one) => sum + one.moves, 0)), label: 'your moves' },
        { value: String(help), label: 'hints and moves shown' },
      ]}
      tries={tries}
      again={{ config: run.config, sources, onStart }}
    />
  );
}
