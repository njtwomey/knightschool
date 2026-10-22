import type { ReactNode } from 'react';
import { Page } from '@/components/page';
import { PracticeSetup } from '@/components/practice-setup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DUE, type QuizConfig } from '@/data/practice-config';
import { lineHref, profileHref } from '@/router/hrefs';
import { to } from '@/router/location';
import { MissList } from './miss-list';
import { LINE_FIELDS, LINE_TITLE } from './session';
import { useQuiz } from './store';

export function Summary({
  results,
  header,
  onStart,
}: {
  results: readonly string[];
  header: ReactNode;
  onStart: (config: QuizConfig) => void;
}) {
  const count = (...ratings: string[]) => results.filter((rating) => ratings.includes(rating)).length;
  const scope = useQuiz((state) => state.scope);
  const config = useQuiz((state) => state.config);
  const free = config.source !== DUE;
  return (
    <Page className="max-w-xl gap-4 py-8">
      {header}
      <Card>
        <CardHeader>
          <CardTitle>
            {results.length ? 'Quiz done' : scope ? 'Nothing to ask in this line' : 'Nothing to quiz right now'}
          </CardTitle>
          <CardDescription>
            {results.length
              ? `${results.length} ${scope ? 'questions' : 'moves'}. ${count('easy', 'good')} right first time, ${count('hard')} with help, ${count('again')} ${scope || free ? 'missed' : 'to see again soon'}.${scope || free ? ' Nothing here changes your schedule.' : ''}`
              : scope
                ? 'This line has no moves of yours to ask after the course starts.'
                : 'Come back later, raise the new cards per day in Settings, add a course to train, or pick free practice below.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {scope ? (
            <Button asChild variant="outline">
              <a href={to(lineHref(scope.course, scope.line, 'drill'))}>Drill it</a>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline">
                <a href={to(profileHref())}>Back to your overview</a>
              </Button>
              <Button asChild variant="outline">
                <a href={to('/search')}>Search</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <PracticeSetup
        mode="quiz"
        initial={config}
        only={scope ? LINE_FIELDS : undefined}
        title={scope ? LINE_TITLE : 'Another quiz'}
        startLabel="Again"
        onStart={onStart}
      />
      <MissList />
    </Page>
  );
}
