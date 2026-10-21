import { Page } from '@/components/page';
import { suggest } from '@knightschool/core';
import { Check, CircleHelp, Minus, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { StudyBoard } from '@/components/board/study-board';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PracticeBar, PracticeSetup } from '@/components/practice-setup';
import { type NameItConfig, saveConfig, savedConfig } from '@/data/practice-config';
import { buildHash, encodeMoves } from '@/router/hash';
import { to } from '@/router/location';
import { allSuggestions, sessionPoints, useNameIt, type Outcome } from './store';
import { lineHref, profileHref } from '@/router/hrefs';

const begin = (config: NameItConfig) => {
  saveConfig('name-it', config);
  void useNameIt.getState().start(config);
};

/**
 * "Name That Opening": a position comes up, and you type what it is. Any opening or variation that reaches it counts.
 * It opens on the set-up card; a session runs for the number of positions chosen there.
 */
export function NameItPage() {
  const { phase, error, question, answer, graded, outcomes, config } = useNameIt();

  useEffect(() => {
    useNameIt.getState().reset();
    return () => useNameIt.getState().stop();
  }, []);

  const names = useMemo(() => (phase === 'asking' ? allSuggestions() : []), [phase]);
  const hints = phase === 'asking' ? suggest(names, answer) : [];

  if (phase === 'idle') {
    return (
      <Page className="max-w-xl gap-4 py-8">
        <PracticeSetup mode="name-it" initial={savedConfig('name-it')} onStart={begin} />
      </Page>
    );
  }
  if (phase === 'loading') return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (phase === 'summary') return <Summary outcomes={outcomes} />;
  if (phase === 'error' || !question) {
    return (
      <Page className="max-w-xl gap-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Could not start</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <PracticeSetup mode="name-it" initial={config} onStart={begin} startLabel="Try again" />
      </Page>
    );
  }

  const answered = phase === 'answered' && graded;
  const tone = !graded
    ? ''
    : graded.result === 'full'
      ? 'border-emerald-500/40 bg-emerald-500/10'
      : graded.result === 'partial'
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-red-500/40 bg-red-500/10';

  return (
    <Page className="gap-4">
      <PracticeBar mode="name-it" config={config} onStart={begin} />
      <div className="flex items-center gap-3">
        <Progress value={(outcomes.length / config.positions) * 100} className="flex-1" aria-label="Session progress" />
        <span className="text-sm text-muted-foreground" role="status">
          {Math.min(outcomes.length + (answered ? 0 : 1), config.positions)} of {config.positions}
        </span>
      </div>
      <div className="board-columns grid gap-6">
        <StudyBoard id="guess" epd={question.epd} orientation={question.side} interactive={false} />

        <div className="grid content-start gap-4">
          <div className="grid gap-1">
            <h2 className="text-2xl font-semibold tracking-tight">Name That Opening</h2>
            <p className="text-muted-foreground">How did this position arise?</p>
            <p className="text-sm text-muted-foreground">
              Type the opening, and the variation if you know it. Naming only the opening earns half a point, unless the
              position is too early to tell variations apart.
              {question.targets.openings.length > 1 &&
                ` ${question.targets.openings.length} different openings reach this position: name any one.`}
            </p>
          </div>

          {!answered && (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                useNameIt.getState().submit();
              }}
            >
              <Input
                autoFocus
                value={answer}
                onChange={(event) => useNameIt.getState().setAnswer(event.target.value)}
                placeholder="For example: Caro-Kann, Advance"
                aria-label="Your answer"
                autoComplete="off"
              />
              {hints.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
                  {hints.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => useNameIt.getState().setAnswer(name)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!answer.trim()}>
                  Answer
                </Button>
                <Button type="button" variant="outline" onClick={() => useNameIt.getState().giveUp()}>
                  <CircleHelp aria-hidden /> I don’t know
                </Button>
              </div>
            </form>
          )}

          {answered && (
            <div className={`grid gap-3 rounded-xl border p-4 ${tone}`} role="status">
              <p className="flex items-center gap-2 font-medium">
                {graded.result === 'full' && (
                  <>
                    <Check aria-hidden className="size-5" /> Correct: {graded.matched}
                  </>
                )}
                {graded.result === 'partial' && (
                  <>
                    <Minus aria-hidden className="size-5" /> Close: you named {graded.matched}, now name the variation
                  </>
                )}
                {graded.result === 'miss' && (
                  <>
                    <X aria-hidden className="size-5" /> {graded.answer ? 'Not quite' : 'No problem'}
                  </>
                )}
              </p>
              <div className="grid gap-1.5 text-sm">
                <p className="font-medium">This position comes from</p>
                <p>{question.targets.openings.join(', ')}</p>
                {question.targets.variations.length > 0 && (
                  <p className="text-muted-foreground">
                    {question.targets.variations.slice(0, 6).join(' · ')}
                    {question.targets.variations.length > 6 && ` · and ${question.targets.variations.length - 6} more`}
                  </p>
                )}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {question.sources.slice(0, 8).map((source) => (
                  <li key={`${source.course}/${source.line}`}>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={
                          to(lineHref(source.course, source.line, 'learn')) +
                          buildHash({ m: source.moves ? encodeMoves(source.moves) : undefined })
                        }
                      >
                        {source.name}
                        {source.trap && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                            trap
                          </Badge>
                        )}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
              <div>
                {graded.result === 'full' ? (
                  <Button variant="ghost" size="sm" onClick={() => useNameIt.getState().next()}>
                    Skip ahead
                  </Button>
                ) : (
                  <Button autoFocus onClick={() => useNameIt.getState().next()}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

function Summary({ outcomes }: { outcomes: Outcome[] }) {
  const config = useNameIt((state) => state.config);
  const points = sessionPoints(outcomes);
  const misses = outcomes.filter((outcome) => outcome.result !== 'full');
  return (
    <Page className="max-w-3xl">
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">Session done</h2>
        <p className="text-muted-foreground">
          {points % 1 === 0 ? points : points.toFixed(1)} of {outcomes.length} points. Positions you miss come back
          sooner.
        </p>
      </header>
      <PracticeSetup mode="name-it" initial={config} onStart={begin} title="Another round" startLabel="Again" />
      {misses.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">To look at again</h3>
          <ul className="grid gap-2">
            {misses.map((outcome) => (
              <li key={outcome.question.epd} className="flex gap-3 rounded-xl border bg-card p-3">
                <div className="w-20 shrink-0">
                  <BoardThumb
                    id={`guess-${outcome.question.epd}`}
                    epd={outcome.question.epd}
                    side={outcome.question.side}
                  />
                </div>
                <div className="grid min-w-0 gap-1 text-sm">
                  <p className="font-medium">{outcome.question.targets.openings.join(', ')}</p>
                  <p className="text-muted-foreground">{outcome.question.targets.variations.join(' · ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {outcome.result === 'partial' ? 'You named the opening only' : 'You said'}:{' '}
                    {outcome.answer || 'no answer'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={to(profileHref())}>Overview</a>
        </Button>
        <Button asChild variant="outline">
          <a href={to(profileHref('stats'))}>Stats</a>
        </Button>
      </div>
    </Page>
  );
}
