import {
  drawRound,
  gradeGuess,
  nameItAttempt,
  nameItPositions,
  nameItRef,
  replay,
  sideToMove,
  START_EPD,
  type NameItPosition,
} from '@knightschool/core';
import type { BuiltOpening, OpeningNames } from '@knightschool/core/content';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '@/components/board/board';
import { MoveRun } from '@/components/chess/move-run';
import { OpeningName } from '@/components/chess/opening-name';
import { AnswerInput, type AnswerVerdict } from '@/components/practice/answer-input';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { PracticeBar } from '@/components/practice/practice-bar';
import type { PracticeConfig } from '@/components/practice/practice-config';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { SessionSummary, type NamedAnswer } from '@/components/practice/session-summary';
import { BoardColumns } from '@/components/shared/board-columns';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { loadCatalog, loadFacts, loadNameList, loadNames, loadOpening } from '@/data/content';
import { learnerStore } from '@/data/learner';
import { feedbackDelay } from '@/data/settings';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import { openingSource, practiceSources, scopeOf } from '../sources';

const newId = () => crypto.randomUUID();
const nameItHref = (opening?: string) => to(`/practice/name-it${opening ? `/${opening}` : ''}`);

type NameItData = {
  openings: BuiltOpening[];
  /** Every named position of each opening, with its weight. */
  positions: Record<string, NameItPosition[]>;
  names: Record<string, OpeningNames>;
  suggestions: string[];
};

async function loadNameItData(): Promise<NameItData> {
  const catalog = await loadCatalog();
  const openings = await Promise.all(catalog.openings.map((opening) => loadOpening(opening.id)));
  const loaded = await Promise.all(
    openings.map(async (opening) => {
      const [names, facts] = await Promise.all([loadNames(opening.id), loadFacts(opening.id).catch(() => undefined)]);
      return { opening, names, positions: nameItPositions(opening, names, facts?.counts) };
    }),
  );
  return {
    openings,
    positions: Object.fromEntries(loaded.map((one) => [one.opening.id, one.positions])),
    names: Object.fromEntries(loaded.map((one) => [one.opening.id, one.names])),
    suggestions: await loadNameList(),
  };
}

/** The positions a source holds: one opening's, one variation's (on its lines), or every opening's. */
function poolOf(data: NameItData, source: string): NameItPosition[] {
  const scope = scopeOf(source);
  if (!scope) return Object.values(data.positions).flat();
  const all = data.positions[scope.opening] ?? [];
  if (!scope.variation) return all;
  const opening = data.openings.find((o) => o.id === scope.opening);
  const names = data.names[scope.opening];
  if (!opening || !names) return [];
  const lines = opening.lines.filter((line) => line.variation === scope.variation);
  const epds = new Set(nameItPositions({ ...opening, lines }, names, undefined).map((position) => position.epd));
  return all.filter((position) => epds.has(position.epd));
}

/**
 * Name it (docs/v2/pages/name-it.md): a position from the openings and the learner types what it is, by Lichess's
 * names. `/practice/name-it` is the set-up card; `/practice/name-it/<opening>` starts at once.
 */
export function NameItPage({ opening }: { opening?: string }) {
  const data = useLoad(loadNameItData, []);
  const name = opening ? data.data?.openings.find((o) => o.id === opening)?.name : undefined;
  const crumbs = [{ label: 'Name it', href: opening ? nameItHref() : undefined }, ...(name ? [{ label: name }] : [])];
  const fixed = opening ? openingSource(opening) : undefined;
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs root={{ label: 'Practice', href: to('/practice') }} crumbs={crumbs} />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <NameItView key={fixed ?? 'setup'} data={data.data} fixed={fixed} />
      )}
    </main>
  );
}

type Run = { config: PracticeConfig; positions: NameItPosition[]; key: number };

function NameItView({ data, fixed }: { data: NameItData; fixed?: string }) {
  const saved = readPracticeConfig('name-it', { positions: siteConfig.practice.nameItPositions });
  const sources = useMemo(
    () =>
      practiceSources(
        data.openings,
        (scope) =>
          poolOf(data, scope.variation ? `variation:${scope.opening}/${scope.variation}` : `opening:${scope.opening}`)
            .length,
      ),
    [data],
  );
  const start = (config: PracticeConfig): Run => {
    const pool = poolOf(data, config.source);
    const count = Math.min(config.positions, pool.length);
    return {
      config,
      positions: drawRound(pool, count, config.weighting === 'popular', Math.random),
      key: Date.now(),
    };
  };
  const [run, setRun] = useState<Run | null>(() => (fixed ? start({ ...saved, source: fixed }) : null));
  const begin = (config: PracticeConfig) => {
    savePracticeConfig('name-it', config);
    setRun(start(config));
  };
  if (!run) return <PracticeSetup mode="name-it" initial={saved} sources={sources} onStart={begin} />;
  return <NameItRun key={run.key} run={run} data={data} sources={sources} onStart={begin} />;
}

type Answer = { typed: string; credit: 'full' | 'half' | 'none'; earned?: string };

function NameItRun({
  run,
  data,
  sources,
  onStart,
}: {
  run: Run;
  data: NameItData;
  sources: ReturnType<typeof practiceSources>;
  onStart: (config: PracticeConfig) => void;
}) {
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const session = useRef(newId());
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [at]);
  const position = run.positions[at];
  const next = useCallback(() => setAt((i) => i + 1), []);
  const bar = (
    <PracticeBar
      mode="name-it"
      config={run.config}
      sources={sources}
      onStart={onStart}
      progress={position ? { done: at, total: run.positions.length } : undefined}
    />
  );

  if (run.positions.length === 0) {
    return (
      <>
        {bar}
        <EmptyState kind="no-match" text="No named positions here yet. Pick another source." />
      </>
    );
  }

  if (!position) {
    const named: NamedAnswer[] = run.positions.map((one, i) => ({
      ply: one.sans.length - 1,
      san: one.sans.at(-1) ?? '',
      typed: answers[i]?.typed ?? '',
      right: one.names[0]!.name,
      credit: answers[i]?.credit ?? 'none',
    }));
    const count = (credit: Answer['credit']) => answers.filter((a) => a.credit === credit).length;
    return (
      <>
        {bar}
        <SessionSummary
          mode="name-it"
          headline={`Name it done: ${answers.length} positions`}
          sentence={`${count('full')} named in full, ${count('half')} by the opening only, ${count('none')} missed.`}
          figures={[
            { value: String(count('full')), label: 'full credit' },
            { value: String(count('half')), label: 'half credit' },
            { value: String(count('none')), label: 'missed' },
          ]}
          named={named}
          again={{ config: run.config, sources, onStart }}
        />
      </>
    );
  }

  const answer = answers[at];
  const respond = (typed: string) => {
    const graded = typed ? gradeGuess(typed, position.names) : { credit: 'none' as const };
    setAnswers((list) => [...list, { typed, credit: graded.credit, earned: graded.name?.name }]);
    const ms = Date.now() - shownAt.current;
    // Half credit (the opening, not the variation) is kept in the try: its outcome is `another` (nameItAttempt).
    const logged = nameItAttempt(typed, graded.credit, ms);
    void learnerStore().then((store) =>
      store.attempts.add({
        id: newId(),
        at: new Date().toISOString(),
        session: session.current,
        mode: 'name-it',
        ref: nameItRef(position.opening, position.epd),
        result: logged.result,
        tries: logged.tries,
        ms,
        hint: false,
        shown: logged.result === 'shown',
      }),
    );
  };
  return (
    <>
      {bar}
      <NameItQuestion
        key={at}
        position={position}
        side={data.openings.find((o) => o.id === position.opening)?.side ?? 'white'}
        suggestions={data.suggestions}
        answer={answer}
        progress={{ done: at, total: run.positions.length }}
        onAnswer={respond}
        onNext={next}
      />
    </>
  );
}

function NameItQuestion({
  position,
  side,
  suggestions,
  answer,
  progress,
  onAnswer,
  onNext,
}: {
  position: NameItPosition;
  side: 'white' | 'black';
  suggestions: string[];
  answer?: Answer;
  progress: { done: number; total: number };
  onAnswer: (typed: string) => void;
  onNext: () => void;
}) {
  const run = useMemo(
    () => replay(START_EPD, position.sans).map((move) => ({ san: move.san, uci: move.uci, after: move.epd })),
    [position],
  );
  const last = run.at(-1)?.uci;
  const [primary, ...others] = position.names;
  // Full credit moves on by itself; a miss or a half answer waits with Next so the name can be read.
  useEffect(() => {
    if (answer?.credit !== 'full') return;
    const timer = window.setTimeout(onNext, feedbackDelay(siteConfig.timing.nextCard));
    return () => window.clearTimeout(timer);
  }, [answer, onNext]);
  const toMove = sideToMove(position.epd) === 'white' ? 'White' : 'Black';
  const verdict: AnswerVerdict | null = answer
    ? answer.credit === 'full'
      ? { credit: 'full', message: answer.earned ?? primary!.name }
      : answer.credit === 'half'
        ? {
            credit: 'half',
            message: `right opening; this is the ${primary!.name}.`,
            accepted: position.names.map((n) => n.name),
          }
        : { credit: 'none', message: `this is the ${primary!.name}.`, accepted: position.names.map((n) => n.name) }
    : null;
  return (
    <BoardColumns
      board={
        <Board
          positions={[
            { epd: position.epd, lastMove: last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : undefined },
          ]}
          index={0}
          reveal={answer ? 'answered' : 'test'}
          evalBar={false}
          orientation={side}
        />
      }
    >
      <ExercisePanel
        mode="name-it"
        prompt={`Which opening is this? ${toMove} to play`}
        progress={progress}
        onNext={answer && answer.credit !== 'full' ? onNext : undefined}
        explanation={
          answer ? (
            <div className="grid gap-2">
              <OpeningName name={primary!.name} eco={primary!.eco} level="full" />
              <MoveRun moves={run} side={side} />
              {others.length ? (
                <p className="text-muted-foreground">
                  Also known as {others.map((n) => n.name).join(', ')}, which reaches it too.
                </p>
              ) : null}
            </div>
          ) : null
        }
        result={answer ? (answer.credit === 'none' ? 'missed' : 'right') : null}
        className="self-start"
      >
        <AnswerInput
          key={answer ? 'answered' : 'asking'}
          suggestions={suggestions}
          verdict={verdict}
          answered={answer?.typed}
          onAnswer={onAnswer}
          onGiveUp={() => onAnswer('')}
        />
      </ExercisePanel>
    </BoardColumns>
  );
}
