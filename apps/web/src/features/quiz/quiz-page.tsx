import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Page } from '@/components/page';
import { PracticeBar, PracticeSetup } from '@/components/practice-setup';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { movesText, type QuizConfig, saveConfig, savedConfig } from '@/data/practice-config';
import { readHashState, setHashState } from '@/router/location';
import { MoveView } from './move-view';
import { currentQuestion } from './questions';
import { QuizView } from './quiz-view';
import { LINE_FIELDS, LINE_TITLE } from './session';
import { DUE, useQuiz, type LineScope } from './store';
import { Summary } from './summary';

/**
 * The quiz. On its own (/quiz) it opens on the set-up card, then asks the schedule's due cards or free practice from
 * the courses chosen (`#start=due` starts the schedule at once). Given a `scope` it asks every question of one line,
 * shuffled and never saved, at once, with `header` (the line's tabs) on top.
 */
export function QuizPage({ scope, header }: { scope?: LineScope; header?: ReactNode } = {}) {
  const state = useQuiz();
  const { phase, error, results, config, queue, index } = state;
  const course = scope?.course;
  const line = scope?.line;

  useEffect(() => {
    useQuiz.setState({ scope: course && line ? { course, line } : null });
    if (course && line) void useQuiz.getState().start();
    else if (readHashState().start === DUE) {
      setHashState({});
      void useQuiz.getState().start({ ...savedConfig('quiz'), source: DUE });
    } else useQuiz.getState().reset();
    return () => useQuiz.getState().stop();
  }, [course, line]);

  const only = scope ? LINE_FIELDS : undefined;
  const begin = (next: QuizConfig) => {
    saveConfig('quiz', next);
    void useQuiz.getState().start(next);
  };

  if (phase === 'idle') {
    return (
      <Page className="max-w-xl gap-4 py-8">
        {header}
        <PracticeSetup mode="quiz" initial={savedConfig('quiz')} only={only} onStart={begin} />
      </Page>
    );
  }
  if (phase === 'loading') return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (phase === 'error') {
    return (
      <Page className="max-w-xl gap-4 py-8">
        {header}
        <Alert variant="destructive">
          <AlertTitle>The quiz could not start</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <PracticeSetup mode="quiz" initial={config} only={only} onStart={begin} startLabel="Try again" />
      </Page>
    );
  }
  if (phase === 'summary') return <Summary results={results} header={header} onStart={begin} />;

  const question = currentQuestion(state);
  if (!question) return null;
  return (
    <Page className="gap-4">
      {header}
      <PracticeBar
        mode="quiz"
        config={config}
        only={only}
        onStart={begin}
        title={scope ? LINE_TITLE : undefined}
        summary={
          scope
            ? `Every question of this line, shuffled · ${movesText(config.moves)} per question · not saved`
            : undefined
        }
      />
      <div className="flex items-center gap-3">
        <Progress value={(index / queue.length) * 100} className="flex-1" aria-label="Session progress" />
        <span className="text-sm text-muted-foreground">
          {index + 1} of {queue.length}
        </span>
      </div>
      {question.kind === 'quiz' ? <QuizView question={question} /> : <MoveView question={question} />}
    </Page>
  );
}
