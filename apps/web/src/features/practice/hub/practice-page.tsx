import { drillScope, scopePositions } from '@knightschool/core';
import { ArrowRight, Flag, MessageCircleQuestion, Settings2, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { OpeningCard } from '@/components/openings/opening-card';
import { MODE_INFO, type PracticeConfig, type PracticeMode } from '@/components/practice/practice-config';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { DueCard } from '@/components/progress/due-card';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/data/site-config';
import { checkpointHref, openingSummary } from '@/features/learn/views';
import { useLoad } from '@/hooks/use-load';
import { cn } from '@/lib/utils';
import { navigate, to } from '@/router/location';
import { startedSummary } from '../opening-summary';
import {
  loadProgress,
  minutesFor,
  practiceOpenings,
  puzzlesOf,
  startedOpenings,
  whenWords,
  type LearnerProgress,
} from '../progress';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import { modeHref, practiceSources, scopeOf } from '../sources';

async function loadHub() {
  const progress = await loadProgress();
  const puzzles = await Promise.all(practiceOpenings(progress).map((one) => puzzlesOf(one.opening.id).catch(() => [])));
  return { progress, puzzles: puzzles.reduce((sum, list) => sum + list.length, 0) };
}

/** The practice modes in the hub's order; Questions has no set-up of its own yet. */
const TILES: { mode: PracticeMode | 'questions'; href: string }[] = [
  { mode: 'review', href: '/practice/review' },
  { mode: 'drill', href: '/practice/drill' },
  { mode: 'puzzles', href: '/practice/puzzles' },
  { mode: 'play-on', href: '/practice/play-on' },
  { mode: 'questions', href: '/practice/questions' },
  { mode: 'speed', href: '/practice/speed' },
  { mode: 'name-it', href: '/practice/name-it' },
];

const QUESTIONS: { name: string; blurb: string; icon: LucideIcon; text: string; soft: string } = {
  name: 'Questions',
  blurb: 'Why a move is played, in your own words.',
  icon: MessageCircleQuestion,
  text: 'text-foreground',
  soft: 'bg-muted',
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The practice hub (docs/v2/pages/practice.md): what is due, every mode with what it holds, one set-up card behind
 * them all, the checkpoints that are ready, and each opening with a way into each mode.
 */
export function PracticePage() {
  const data = useLoad(loadHub, []);
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
      <Breadcrumbs root={{ label: 'Practice', href: to('/practice') }} />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <HubView progress={data.data.progress} puzzles={data.data.puzzles} />
      )}
    </main>
  );
}

function HubView({ progress, puzzles }: { progress: LearnerProgress; puzzles: number }) {
  const [setup, setSetup] = useState<PracticeMode>('drill');
  const openings = practiceOpenings(progress);
  const started = startedOpenings(progress);
  const sources = useMemo(
    () =>
      practiceSources(
        progress.openings.map((one) => one.opening),
        (s) => {
          const opening = progress.openings.find((one) => one.opening.id === s.opening)?.opening;
          return opening ? scopePositions(drillScope(opening, s.variation)).length : undefined;
        },
      ),
    [progress],
  );
  const positions = openings.reduce((sum, one) => sum + scopePositions(drillScope(one.opening)).length, 0);
  const lines = openings.reduce((sum, one) => sum + one.opening.lines.length, 0);
  const questions = openings.reduce(
    (sum, one) => sum + ((one.opening as { questions?: unknown[] }).questions?.length ?? 0),
    0,
  );
  const counts: Record<(typeof TILES)[number]['mode'], string> = {
    review: progress.due.length ? `${progress.due.length} due` : 'Nothing due',
    drill: plural(positions, 'move'),
    puzzles: plural(puzzles, 'puzzle'),
    'play-on': plural(lines, 'line end'),
    questions: plural(questions, 'question'),
    speed: plural(lines, 'line'),
    'name-it': plural(
      openings.reduce((sum, one) => sum + one.opening.variations.length, 0),
      'variation',
    ),
  };
  const checkpoints = openings.flatMap((one) =>
    one.checkpoints.filter((c) => c.positions > 0 && c.state !== 'locked').map((c) => ({ one, c })),
  );
  const start = (mode: PracticeMode, config: PracticeConfig) => {
    savePracticeConfig(mode, config);
    navigate(modeHref(mode, scopeOf(config.source)).slice(to('').length));
  };
  const due = progress.due.length;

  return (
    <div className="grid gap-8">
      {!started.length ? (
        <p className="text-sm text-muted-foreground">
          You have not started an opening yet, so practice draws on every opening. Learn a step and its moves join your
          reviews.
        </p>
      ) : null}
      <DueCard
        due={due}
        minutes={minutesFor(Math.min(due, siteConfig.schedule.sessionSize.default), progress.msPerAnswer)}
        byKind={{
          moves: progress.dueByKind.moves,
          puzzles: progress.dueByKind.puzzles,
          questions: progress.dueByKind.questions,
        }}
        newToday={progress.newLeft}
        {...(progress.nextDue ? { nextDue: whenWords(progress.nextDue) } : {})}
        href={to('/practice/review')}
        {...(openings[0] ? { practiseHref: to(`/practice/review/${openings[0].opening.id}`) } : {})}
      />

      <section className="grid gap-3" aria-labelledby="modes">
        <h2 id="modes" className="text-lg font-semibold">
          Ways to practise
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile) => {
            const info = tile.mode === 'questions' ? QUESTIONS : MODE_INFO[tile.mode];
            const Icon = info.icon;
            const mode = tile.mode;
            return (
              <Card key={tile.mode} size="sm" className="gap-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className={cn('grid size-8 place-items-center rounded-md', info.soft, info.text)}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <a href={to(tile.href)} className="underline-offset-4 hover:underline">
                      {info.name}
                    </a>
                  </CardTitle>
                  <CardDescription>{info.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm font-medium tabular-nums">{counts[tile.mode]}</CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={to(tile.href)}>
                      {tile.mode === 'review' ? 'Review now' : 'Open'} <ArrowRight aria-hidden />
                    </a>
                  </Button>
                  {mode !== 'questions' ? (
                    <Button size="sm" variant="ghost" onClick={() => setSetup(mode)} aria-pressed={setup === mode}>
                      <Settings2 aria-hidden /> Set up
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>
            );
          })}
          <Card size="sm" className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-md bg-mode-learn/10 text-mode-learn">
                  <Flag className="size-4" aria-hidden />
                </span>
                Checkpoints
              </CardTitle>
              <CardDescription>The test at the end of a variation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              {checkpoints.length ? (
                checkpoints.map(({ one, c }) => (
                  <a
                    key={`${one.opening.id}/${c.variation}`}
                    href={checkpointHref(one.opening.id, c.variation)}
                    className="underline-offset-4 hover:underline"
                  >
                    {c.name}
                    <span className="text-muted-foreground">
                      {c.state === 'cleared' ? `, cleared${c.score ? ` ${c.score}` : ''}` : ', ready'}
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-muted-foreground">None ready yet: a checkpoint opens once its steps are known.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-3" aria-labelledby="setup">
        <h2 id="setup" className="text-lg font-semibold">
          Set up a session
        </h2>
        <PracticeSetup
          key={setup}
          mode={setup}
          initial={readPracticeConfig(
            setup,
            setup === 'review' ? { source: 'due' } : setup === 'puzzles' ? { rating: siteConfig.puzzles.rating } : {},
          )}
          sources={sources}
          due={due}
          {...(setup === 'review' || setup === 'drill'
            ? { only: setup === 'review' ? ['source', 'weighting'] : ['source'] }
            : {})}
          onStart={(config) => start(setup, config)}
        />
      </section>

      <section className="grid gap-3" aria-labelledby="per-opening">
        <h2 id="per-opening" className="text-lg font-semibold">
          Per opening
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {openings.map((one) => (
            <OpeningCard
              key={one.opening.id}
              opening={one.started ? startedSummary(one, progress.newLeft) : openingSummary(one.entry)}
              modeHrefs={{
                learn: to(`/openings/${one.opening.id}`),
                review: to(`/practice/review/${one.opening.id}`),
                drill: modeHref('drill', { opening: one.opening.id }),
                puzzles: modeHref('puzzles', { opening: one.opening.id }),
                playOn: modeHref('play-on', { opening: one.opening.id }),
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
