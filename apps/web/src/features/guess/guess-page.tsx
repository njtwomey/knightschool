import { Page } from '@/components/page';
import { suggest } from '@knightschool/core';
import { Check, CircleHelp, Minus, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { BoardThumb } from '@/components/board/board-thumb';
import { BoardSettingsButton } from '@/components/board/board-settings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { buildHash } from '@/router/hash';
import { to } from '@/router/location';
import { allSuggestions, SESSION_LENGTH, sessionPoints, useGuess, type Outcome } from './store';

/** "Name That Opening": a position comes up, and you type what it is. Any opening or variation that reaches it counts. */
export function GuessPage() {
  const { phase, error, question, answer, graded, outcomes } = useGuess();

  useEffect(() => {
    void useGuess.getState().start();
    return () => useGuess.getState().stop();
  }, []);

  // Start again if the store was reset while the page stayed open, rather than waiting on a refresh.
  useEffect(() => {
    if (phase === 'idle') void useGuess.getState().start();
  }, [phase]);

  const names = useMemo(() => (phase === 'asking' ? allSuggestions() : []), [phase]);
  const hints = phase === 'asking' ? suggest(names, answer) : [];

  if (phase === 'idle' || phase === 'loading') return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (phase === 'summary') return <Summary outcomes={outcomes} />;
  if (phase === 'error' || !question) {
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>Could not start</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
      <div className="flex items-center gap-3">
        <Progress value={(outcomes.length / SESSION_LENGTH) * 100} className="flex-1" aria-label="Session progress" />
        <span className="text-sm text-muted-foreground" role="status">
          {Math.min(outcomes.length + (answered ? 0 : 1), SESSION_LENGTH)} of {SESSION_LENGTH}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,min(36rem,calc(100dvh-11rem)))_1fr]">
        <div className="grid content-start gap-3">
          <AppBoard
            id="guess"
            className="aspect-square w-full"
            epd={question.epd}
            orientation={question.side}
            interactive={false}
          />
          <div className="flex items-center gap-2">
            <BoardSettingsButton />
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="grid gap-1">
            <h2 className="text-2xl font-semibold tracking-tight">Name That Opening</h2>
            <p className="text-muted-foreground">How did this position arise?</p>
            <p className="text-sm text-muted-foreground">
              Type the opening, and the variation if you know it. Naming only the opening earns half a point.
              {question.targets.openings.length > 1 &&
                ` ${question.targets.openings.length} different openings reach this position: name any one.`}
            </p>
          </div>

          {!answered && (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                useGuess.getState().submit();
              }}
            >
              <Input
                autoFocus
                value={answer}
                onChange={(event) => useGuess.getState().setAnswer(event.target.value)}
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
                      onClick={() => useGuess.getState().setAnswer(name)}
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
                <Button type="button" variant="outline" onClick={() => useGuess.getState().giveUp()}>
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
                  <p className="text-muted-foreground">{question.targets.variations.join(' · ')}</p>
                )}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {question.sources.slice(0, 8).map((source) => (
                  <li key={`${source.course}/${source.line}`}>
                    <Button asChild variant="outline" size="sm">
                      <a href={to(`/opening/${source.family}`) + buildHash({ c: source.course, v: source.line })}>
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
                <Button variant="ghost" size="sm" onClick={() => useGuess.getState().next()}>
                  Skip ahead
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

function Summary({ outcomes }: { outcomes: Outcome[] }) {
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
        <Button onClick={() => void useGuess.getState().start()}>Another ten</Button>
        <Button asChild variant="outline">
          <a href={to('/profile')}>Overview</a>
        </Button>
        <Button asChild variant="outline">
          <a href={to('/profile/stats')}>Stats</a>
        </Button>
      </div>
    </Page>
  );
}
