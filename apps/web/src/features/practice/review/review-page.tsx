import type { Exercise } from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Try } from '@/components/chess/tries-table';
import { PracticeBar } from '@/components/practice/practice-bar';
import { isDueSource, type PracticeConfig } from '@/components/practice/practice-config';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { Button } from '@/components/ui/button';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { loadProgress, practiceOpenings, type LearnerProgress } from '../progress';
import type { QuestionAnswer } from '../questions/asked';
import { QuestionRun } from '../questions/question-run';
import { openTry } from '../try-position';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import { openingSource, practiceSources, sourceOfScope, type PracticeScope } from '../sources';
import { nextStateOf } from '../today/next';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';
import { duePlan, freePlan, shippedPuzzles, type ReviewPlan } from './plan';

const ROOT = { label: 'Practice', href: to('/practice') };

/**
 * Review (docs/v2/pages/review.md): `/practice/review` starts today's due session at once; `/practice/review/<opening>`
 * is free practice of that opening's cards, never saved to the schedule.
 */
export function ReviewPage({ scope }: { scope?: PracticeScope }) {
  const data = useLoad(async () => {
    const progress = await loadProgress();
    return { progress, puzzles: await shippedPuzzles(progress) };
  }, []);
  const crumbs = [{ label: 'Review', ...(scope ? { href: to('/practice/review') } : {}) }];
  const name = scope
    ? data.data?.progress.openings.find((one) => one.opening.id === scope.opening)?.opening.name
    : undefined;
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs root={ROOT} crumbs={name ? [...crumbs, { label: name }] : crumbs} />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <ReviewView progress={data.data.progress} puzzles={data.data.puzzles} scope={scope} />
      )}
    </main>
  );
}

type Session = { config: PracticeConfig; plan: ReviewPlan; key: number };

function planFor(
  progress: LearnerProgress,
  puzzles: Awaited<ReturnType<typeof shippedPuzzles>>,
  config: PracticeConfig,
) {
  return isDueSource(config.source) ? duePlan(progress, puzzles, config) : freePlan(progress, config);
}

function ReviewView({
  progress,
  puzzles,
  scope,
}: {
  progress: LearnerProgress;
  puzzles: Awaited<ReturnType<typeof shippedPuzzles>>;
  scope?: PracticeScope;
}) {
  const [session, setSession] = useState<Session>(() => {
    const config = { ...readPracticeConfig('review'), source: scope ? sourceOfScope(scope) : 'due' };
    return { config, plan: planFor(progress, puzzles, config), key: 0 };
  });
  const sources = useMemo(
    () =>
      practiceSources(
        progress.openings.map((one) => one.opening),
        (s) => progress.openings.find((one) => one.opening.id === s.opening)?.cards.length,
      ),
    [progress],
  );
  const restart = (config: PracticeConfig) => {
    savePracticeConfig('review', config);
    setSession((last) => ({ config, plan: planFor(progress, puzzles, config), key: last.key + 1 }));
  };
  return (
    <ReviewSession
      key={session.key}
      session={session}
      progress={progress}
      sources={sources}
      due={progress.due.length}
      onStart={restart}
    />
  );
}

/** One part of the session done: its answers (moves, puzzles or questions alike) and, for moves, every try. */
type Answered = Pick<ExerciseResult, 'id' | 'right' | 'hint' | 'shown'>;
type Phase = { results: Answered[]; tries: Try[] };

const fromQuestions = (answers: readonly QuestionAnswer[]): Answered[] =>
  answers.map((answer) => ({ id: answer.cardId, right: answer.matched, hint: false, shown: !answer.typed }));

/** "one move each", "3 moves each", "to the end of the line". */
const perQuestion = (moves: number) =>
  moves === 0 ? 'to the end of the line' : moves === 1 ? 'one move each' : `${moves} moves each`;

function ReviewSession({
  session,
  progress,
  sources,
  due,
  onStart,
}: {
  session: Session;
  progress: LearnerProgress;
  sources: ReturnType<typeof practiceSources>;
  due: number;
  onStart: (config: PracticeConfig) => void;
}) {
  const { plan, config } = session;
  // New cards count against today's allowance once answered: the count is read from the reviews they leave.
  const [phases, setPhases] = useState<Phase[]>([]);
  const [stopped, setStopped] = useState(false);
  const parts = (
    [
      { kind: 'moves', list: plan.moves },
      { kind: 'questions', list: plan.questions },
      { kind: 'puzzles', list: plan.puzzles },
    ] as const
  ).filter((part) => part.list.length);
  const total = plan.moves.length + plan.questions.length + plan.puzzles.length;
  const doneCount = phases.reduce((sum, phase) => sum + phase.results.length, 0);
  const summary = isDueSource(config.source)
    ? `Due today: ${total} ${total === 1 ? 'card' : 'cards'}${plan.introduced ? `, ${plan.introduced} new` : ''}, moves ${perQuestion(config.movesPerQuestion)}`
    : undefined;
  const bar = (
    <PracticeBar
      mode="review"
      config={config}
      sources={sources}
      due={due}
      only={['source', 'weighting', 'movesPerQuestion']}
      onStart={onStart}
      {...(summary ? { summary } : {})}
      progress={{ done: doneCount, total }}
    />
  );

  if (!total) {
    const next = nextStateOf(progress);
    const practise = practiceOpenings(progress)[0];
    return (
      <SessionSummary
        mode="review"
        headline={isDueSource(config.source) ? 'Nothing due' : 'Nothing to practise here yet'}
        empty={{
          reason: next.nextReview ? `Next review ${next.nextReview}.` : 'Learn a step and its moves come back here.',
          ...(next.nextOpenStep ? { action: { label: 'Learn the next step', href: next.nextOpenStep.href } } : {}),
          ...(practise
            ? {
                secondary: {
                  label: 'Practise anyway',
                  onClick: () => onStart({ ...config, source: openingSource(practise.opening.id) }),
                },
              }
            : {}),
        }}
      />
    );
  }

  if (stopped || phases.length >= parts.length) {
    return <ReviewSummary session={session} phases={phases} sources={sources} due={due} onStart={onStart} />;
  }

  const part = parts[phases.length]!;
  const onDone = (phase: Phase, stop?: boolean) => {
    setPhases((list) => [...list, phase]);
    if (stop) setStopped(true);
  };
  if (part.kind === 'questions') {
    return (
      <div className="grid gap-4">
        {bar}
        <QuestionRun
          key={phases.length}
          asked={part.list}
          mode="review"
          save={!plan.free}
          progress={{ done: doneCount, total }}
          aside={
            plan.free ? (
              <p className="text-sm text-muted-foreground">Free practice: not saved to your schedule.</p>
            ) : undefined
          }
          onDone={(answers) => onDone({ results: fromQuestions(answers), tries: [] })}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {bar}
      <Run
        key={phases.length}
        exercises={part.list}
        save={plan.free ? 'none' : part.kind === 'puzzles' ? 'exercise' : 'moves'}
        opening={plan.opening}
        facts={plan.facts}
        context={plan.context}
        free={plan.free}
        onDone={onDone}
      />
    </div>
  );
}

function Run({
  exercises,
  save,
  opening,
  facts,
  context,
  free,
  onDone,
}: {
  exercises: Exercise[];
  save: 'moves' | 'exercise' | 'none';
  opening?: BuiltOpening;
  facts?: OpeningFacts;
  context: Record<string, string>;
  free: boolean;
  onDone: (phase: Phase, stopped?: boolean) => void;
}) {
  const session = useExerciseSession({ exercises, opening, facts, save });
  const finished = useRef(false);
  useEffect(() => {
    if (!session.done || finished.current) return;
    finished.current = true;
    onDone({ results: session.results, tries: session.tries });
  }, [session.done, session.results, session.tries, onDone]);
  const current = session.exercise;
  const where = current
    ? current.mode === 'puzzle'
      ? 'A puzzle from your openings'
      : (context[current.id] ?? 'A move from your reviews')
    : '';
  // A move card asks for the opening's own move, named by the line it is from.
  const prompt =
    current && current.mode !== 'puzzle' ? (
      <div className="grid gap-0.5">
        <p className="font-medium">Find the book move</p>
        <p className="text-muted-foreground">{where}</p>
      </div>
    ) : undefined;
  return (
    <ExerciseBoard
      session={session}
      prompt={prompt}
      aside={
        current?.mode === 'puzzle' || free ? (
          <p className="text-sm text-muted-foreground">
            {current?.mode === 'puzzle' ? where : null}
            {free ? `${current?.mode === 'puzzle' ? '. ' : ''}Free practice: not saved to your schedule.` : null}
          </p>
        ) : undefined
      }
      footer={
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              finished.current = true;
              onDone({ results: session.results, tries: session.tries }, true);
            }}
          >
            <Square aria-hidden /> Stop
          </Button>
        </div>
      }
    />
  );
}

function ReviewSummary({
  session,
  phases,
  sources,
  due,
  onStart,
}: {
  session: Session;
  phases: Phase[];
  sources: ReturnType<typeof practiceSources>;
  due: number;
  onStart: (config: PracticeConfig) => void;
}) {
  const results = phases.flatMap((phase) => phase.results);
  const tries = phases.flatMap((phase) => phase.tries);
  const next = useLoad(async () => nextStateOf(await loadProgress()), [results.length]);
  const right = results.filter((r) => r.right && !r.hint).length;
  const helped = results.filter((r) => !r.shown && (r.hint || !r.right)).length;
  const shown = results.filter((r) => r.shown).length;
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  return (
    <SessionSummary
      mode="review"
      headline={`Review done: ${plural(results.length, 'card')}`}
      sentence={`${right} right first time, ${helped} with help, ${shown} to see again soon.`}
      figures={[
        { value: String(right), label: 'right first time' },
        { value: String(helped), label: 'with help' },
        { value: String(shown), label: 'shown' },
      ]}
      tries={tries}
      onSelectTry={openTry(tries)}
      free={session.plan.free}
      {...(next.data
        ? {
            next: {
              state: next.data,
              form: 'with-alternatives' as const,
              alternatives: [
                { label: 'Back to Today', href: to('/today'), hint: 'What to do next, and what is due.' },
                { label: 'Practise something else', href: to('/practice'), hint: 'Every practice mode.' },
              ],
            },
          }
        : {})}
      again={{ config: session.config, sources, due, only: ['source', 'weighting', 'movesPerQuestion'], onStart }}
    />
  );
}
