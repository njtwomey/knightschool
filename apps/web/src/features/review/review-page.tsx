import { Page } from '@/components/page';
import { explainMove, playUci } from '@knightschool/core';
import { Eye, Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { BoardSettingsButton } from '@/components/board/board-settings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/rich-text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { arrowsOf, squareStylesOf } from '@/features/browse/shapes';
import { currentQuestion, useReview, type QuizQuestion } from './store';
import { to } from '@/router/location';

const arrow = (uci: string) => ({
  startSquare: uci.slice(0, 2),
  endSquare: uci.slice(2, 4),
  color: 'rgb(21 128 61 / 0.85)',
});

export function ReviewPage() {
  const state = useReview();
  const { phase, error, attempt, queue, index, results, badge, advancing } = state;

  useEffect(() => {
    void useReview.getState().start();
    return () => useReview.getState().stop();
  }, []);

  // Start again if the store was reset while the page stayed open, rather than waiting on a refresh.
  useEffect(() => {
    if (useReview.getState().phase === 'idle') void useReview.getState().start();
  }, [phase]);

  if (phase === 'idle' || phase === 'loading') return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (phase === 'error') {
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>The quiz could not start</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Page>
    );
  }
  if (phase === 'summary') return <Summary results={results} />;

  const question = currentQuestion(state);
  if (!question) return null;
  if (question.kind === 'quiz') return <QuizView question={question} />;
  const { card, content, lastEdge, path, expected } = question;
  const side = content.opening.side;
  const done = attempt.status === 'done';
  const epd = done ? expected.to : card.epd;
  const lastMove = done ? expected.uci : lastEdge?.uci;
  const notes = done ? explainMove(card.epd, expected.uci, { edge: expected }) : [];

  return (
    <Page className="gap-4">
      <div className="flex items-center gap-3">
        <Progress value={(index / queue.length) * 100} className="flex-1" aria-label="Session progress" />
        <span className="text-sm text-muted-foreground">
          {index + 1} of {queue.length}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,min(40rem,calc(100dvh-11rem)))_1fr]">
        <div className="grid content-start gap-3">
          <AppBoard
            id="review"
            previewable
            className="aspect-square w-full"
            epd={epd}
            orientation={side}
            interactive={!advancing}
            onMove={(uci) => useReview.getState().submitMove(uci)}
            lastMove={lastMove}
            arrows={attempt.shown && !done ? [arrow(expected.uci)] : done ? arrowsOf(expected.annotation) : []}
            squareStyles={done ? squareStylesOf(undefined, expected.annotation) : undefined}
            badge={badge}
            hintSquare={attempt.hintUsed && !done ? card.expectedUci.slice(0, 2) : null}
          />
          <div className="flex flex-wrap items-center gap-2">
            <BoardSettingsButton />
            <Button
              variant="outline"
              onClick={() => useReview.getState().hint()}
              disabled={attempt.hintUsed || attempt.shown || done}
            >
              <Lightbulb aria-hidden /> Hint
            </Button>
            <Button variant="outline" onClick={() => useReview.getState().show()} disabled={attempt.shown || done}>
              <Eye aria-hidden /> Show me
            </Button>
          </div>
        </div>

        <Card className="content-start">
          <CardHeader>
            <CardTitle className="text-xl" aria-live="polite">
              {done
                ? attempt.shown
                  ? `${expected.san}. That one comes back soon.`
                  : `${expected.san}. Right.`
                : `Your move as ${side}.`}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>{content.opening.name}</span>
              <Badge variant="outline">{content.opening.eco}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="grid gap-1">
              <p className="text-muted-foreground">
                {lastEdge
                  ? `${side === 'white' ? 'Black' : 'White'} just played ${lastEdge.san}.`
                  : 'The game is about to begin.'}
              </p>
              {path.length > 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  {path.map((edge, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ''}${edge.san}`).join(' ')}
                </p>
              )}
            </div>
            {!done && attempt.wrongTries > 0 && !attempt.shown && <p>Not that one. Try again, or use a hint.</p>}
            {!done && attempt.shown && <p>The move is marked on the board. Play it to carry on.</p>}
            {done &&
              notes.slice(0, 2).map((note) => (
                <p key={note.text} className={note.source === 'author' ? '' : 'text-muted-foreground'}>
                  <RichText text={note.text} />
                </p>
              ))}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

function Summary({ results }: { results: readonly string[] }) {
  const count = (...ratings: string[]) => results.filter((rating) => ratings.includes(rating)).length;
  return (
    <Page className="max-w-xl gap-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{results.length ? 'Quiz done' : 'Nothing to quiz right now'}</CardTitle>
          <CardDescription>
            {results.length
              ? `${results.length} moves. ${count('easy', 'good')} right first time, ${count('hard')} with help, ${count('again')} to see again soon.`
              : 'Come back later, raise the new cards per day in Settings, or add a course to train.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={to('/profile')}>Back to your overview</a>
          </Button>
          <Button asChild variant="outline">
            <a href={to('/browse')}>Browse</a>
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}

/** A question answered in words: type, get feedback or the reveal, and it moves on by itself. */
function QuizView({ question }: { question: QuizQuestion }) {
  const { queue, index, quizResult, advancing } = useReview();
  const [answer, setAnswer] = useState('');
  const { card, content, quiz } = question;

  // After the answer the board plays the move that explains it.
  let epd = quiz.epd;
  let lastMove: string | undefined;
  if (quizResult && quiz.showMove) {
    epd = playUci(quiz.epd, quiz.showMove).epd;
    lastMove = quiz.showMove;
  }

  return (
    <Page className="gap-4">
      <div className="flex items-center gap-3">
        <Progress value={(index / queue.length) * 100} className="flex-1" aria-label="Session progress" />
        <span className="text-sm text-muted-foreground">
          {index + 1} of {queue.length}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,min(40rem,calc(100dvh-11rem)))_1fr]">
        <AppBoard
          id="quiz"
          className="aspect-square w-full"
          epd={epd}
          orientation={content.opening.side}
          interactive={false}
          lastMove={lastMove}
        />
        <Card className="content-start">
          <CardHeader>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>{content.opening.name}</span>
              <Badge variant="secondary">Question</Badge>
            </CardDescription>
            <CardTitle className="text-xl leading-snug">{quiz.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!quizResult && (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  useReview.getState().submitAnswer(answer);
                }}
              >
                <Input
                  key={card.id}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Type your answer…"
                  aria-label="Your answer"
                  autoFocus
                  autoComplete="off"
                />
                <Button type="submit" disabled={answer.trim() === ''}>
                  Check
                </Button>
              </form>
            )}
            {quizResult && (
              <Alert variant={quizResult.matched ? 'default' : 'destructive'} role="status">
                {!quizResult.matched && <AlertTitle>{quizResult.close ? 'Close.' : 'Not quite.'}</AlertTitle>}
                <AlertDescription className="grid gap-2">
                  {quizResult.close && <span>{quizResult.close}</span>}
                  <span>{quizResult.matched ? quizResult.feedback : quiz.reveal}</span>
                  {!quizResult.matched && <span className="text-xs">You said: {quizResult.answer}</span>}
                </AlertDescription>
              </Alert>
            )}
            {advancing && (
              <Button variant="ghost" size="sm" className="w-fit" onClick={() => useReview.getState().skip()}>
                Skip ahead
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
