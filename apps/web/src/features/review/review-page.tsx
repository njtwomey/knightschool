import { Page } from '@/components/page';
import {
  MOVES_PER_QUESTION,
  type MovesPerQuestion,
  explainMove,
  pathTo,
  playUci,
  type LineEdge,
  type OpeningContent,
} from '@knightschool/core';
import { EcoLink } from '@/components/eco-link';
import { Eye, Lightbulb } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { MoveTable } from '@/components/move-table';
import { BoardSettingsButton } from '@/components/board/board-settings';
import { StepButtons } from '@/components/board/step-buttons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/rich-text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceSelect } from '@/components/source-select';
import { WeightingSelect } from '@/components/weighting-select';
import { useBrowse } from '@/features/browse/store';
import { arrowsOf, squareStylesOf } from '@/features/browse/shapes';
import { MissList } from './miss-list';
import { currentQuestion, DUE, useReview, type LineScope, type QuizQuestion } from './store';
import { to } from '@/router/location';

/** The moves that reached a position in a course; empty if it is not on a line. */
function movesInto(content: OpeningContent, epd: string): LineEdge[] {
  if (epd === content.opening.rootEpd || !content.nodes[epd]) return [];
  try {
    return pathTo(content, epd);
  } catch {
    return [];
  }
}

const arrow = (uci: string) => ({
  startSquare: uci.slice(0, 2),
  endSquare: uci.slice(2, 4),
  color: 'rgb(21 128 61 / 0.85)',
});

/** What sits above the questions instead of the source choice: a line's breadcrumbs and tabs on its Quiz tab. */
const HeaderSlot = createContext<ReactNode>(null);

/** Chooses between the scheduled session and free practice from any course. Nothing in free practice is saved. */
function SourceBar() {
  const header = useContext(HeaderSlot);
  return (
    <div className="grid gap-2">
      {header ?? <SourceChoice />}
      <MovesChoice />
    </div>
  );
}

/** How many of your moves a question runs for: the line carries on after the answer, up to this many. */
function MovesChoice() {
  const moves = useReview((state) => state.movesPerQuestion);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>Each question runs for</span>
      <Select
        value={String(moves)}
        onValueChange={(value) => useReview.getState().setMovesPerQuestion(Number(value) as MovesPerQuestion)}
      >
        <SelectTrigger className="h-8 w-auto" aria-label="Moves per question">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MOVES_PER_QUESTION.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n === 0 ? 'the rest of the line' : n === 1 ? '1 move' : `up to ${n} moves`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SourceChoice() {
  const source = useReview((state) => state.source);
  const weighting = useReview((state) => state.weighting);
  const index = useBrowse((state) => state.index);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      Questions from
      <SourceSelect
        value={source}
        onChange={(next) => useReview.getState().setSource(next)}
        index={index}
        extra={[{ value: DUE, label: 'Due today (your schedule)' }]}
        label="Questions from"
      />
      {source !== DUE && (
        <>
          <WeightingSelect
            value={weighting}
            onChange={(next) => useReview.getState().setWeighting(next)}
            label="How questions are picked"
          />
          <span>Free practice: nothing here changes your schedule.</span>
        </>
      )}
    </div>
  );
}

/**
 * The quiz. On its own (/quiz) it asks the schedule's due cards or free practice from the courses chosen; given a
 * `scope` it asks every question of one line, shuffled and never saved, with `header` (the line's tabs) on top.
 */
export function ReviewPage({ scope, header }: { scope?: LineScope; header?: ReactNode } = {}) {
  return (
    <HeaderSlot.Provider value={header ?? null}>
      <Review scope={scope} />
    </HeaderSlot.Provider>
  );
}

function Review({ scope }: { scope?: LineScope }) {
  const state = useReview();
  const { phase, error, attempt, queue, index, results, badge, advancing, viewing, holding } = state;
  const course = scope?.course;
  const line = scope?.line;

  useEffect(() => {
    useReview.setState({ scope: course && line ? { course, line } : null });
    void useReview.getState().start();
    return () => useReview.getState().stop();
  }, [course, line]);

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
  const looking = viewing !== null && path[viewing] ? path[viewing] : undefined;
  const epd = looking ? looking.to : done ? expected.to : card.epd;
  const lastMove = looking ? looking.uci : done ? expected.uci : lastEdge?.uci;
  const notes = done ? explainMove(card.epd, expected.uci, { edge: expected }) : [];

  return (
    <Page className="gap-4">
      <SourceBar />
      <div className="flex items-center gap-3">
        <Progress value={(index / queue.length) * 100} className="flex-1" aria-label="Session progress" />
        <span className="text-sm text-muted-foreground">
          {index + 1} of {queue.length}
        </span>
      </div>
      <div className="board-columns grid gap-6">
        <div className="grid content-start gap-3">
          <AppBoard
            id="review"
            previewable
            className="aspect-square w-full"
            epd={epd}
            orientation={side}
            interactive={!advancing && !looking}
            onMove={(uci) => useReview.getState().submitMove(uci)}
            lastMove={lastMove}
            lastMoveTone={done && !looking ? 'yellow' : 'red'}
            arrows={
              looking ? [] : attempt.shown && !done ? [arrow(expected.uci)] : done ? arrowsOf(expected.annotation) : []
            }
            squareStyles={done && !looking ? squareStylesOf(undefined, expected.annotation) : undefined}
            badge={badge}
            hintSquare={attempt.hintUsed && !done ? card.expectedUci.slice(0, 2) : null}
          />
          <div className="flex flex-wrap items-center gap-2">
            <BoardSettingsButton />
            <PathSteps length={path.length} />
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
              {content.opening.eco && <EcoLink eco={content.opening.eco} course={content.opening.id} />}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="grid gap-1">
              <p className="text-muted-foreground">
                {lastEdge
                  ? `${side === 'white' ? 'Black' : 'White'} just played ${lastEdge.san}.`
                  : 'The game is about to begin.'}
              </p>
              <MoveTable
                sans={[...path.map((edge) => edge.san), ...(done ? [expected.san] : [])]}
                selected={viewing}
                onSelect={(i) => useReview.getState().view(i < path.length - 1 ? i : null)}
              />
            </div>
            {!done && attempt.wrongTries > 0 && !attempt.shown && <p>Not that one. Try again, or use a hint.</p>}
            {!done && attempt.shown && <p>The move is marked on the board. Play it to carry on.</p>}
            {holding && (
              <Button autoFocus className="w-fit" onClick={() => useReview.getState().skip()}>
                Next
              </Button>
            )}
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
  const scope = useReview((state) => state.scope);
  if (scope) {
    return (
      <Page className="max-w-xl gap-4 py-8">
        <SourceBar />
        <Card>
          <CardHeader>
            <CardTitle>{results.length ? 'Quiz done' : 'Nothing to ask in this line'}</CardTitle>
            <CardDescription>
              {results.length
                ? `${results.length} questions. ${count('easy', 'good')} right first time, ${count('hard')} with help, ${count('again')} missed. Nothing here changes your schedule.`
                : 'This line has no moves of yours to ask after the course starts.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {results.length > 0 && <Button onClick={() => void useReview.getState().start()}>Quiz again</Button>}
            <Button asChild variant="outline">
              <a href={to(`/play/${scope.course}/${scope.line}/drill`)}>Drill it</a>
            </Button>
          </CardContent>
        </Card>
        <MissList />
      </Page>
    );
  }
  return (
    <Page className="max-w-xl gap-4 py-8">
      <SourceBar />
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
          {useReview.getState().source !== DUE && (
            <Button onClick={() => void useReview.getState().start()}>Another ten</Button>
          )}
          <Button asChild variant={useReview.getState().source !== DUE ? 'outline' : 'default'}>
            <a href={to('/profile')}>Back to your overview</a>
          </Button>
          <Button asChild variant="outline">
            <a href={to('/search')}>Search</a>
          </Button>
        </CardContent>
      </Card>
      <MissList />
    </Page>
  );
}

/**
 * Steps back and forth through the moves that led to the question, up to the question itself (the last of them): the
 * same as clicking the moves in the table.
 */
function PathSteps({ length }: { length: number }) {
  const viewing = useReview((state) => state.viewing);
  const view = useReview((state) => state.view);
  if (length < 2) return null;
  const at = viewing ?? length - 1;
  const goTo = (i: number) => view(i >= length - 1 ? null : Math.max(0, i));
  return (
    <StepButtons
      label="Step through the moves so far"
      onFirst={() => goTo(0)}
      onPrev={() => goTo(at - 1)}
      onNext={() => goTo(at + 1)}
      onLast={() => goTo(length - 1)}
      atStart={at <= 0}
      atEnd={viewing === null}
    />
  );
}

/** A question answered in words: type, get feedback or the reveal, and it moves on by itself. */
function QuizView({ question }: { question: QuizQuestion }) {
  const { queue, index, quizResult, advancing, viewing, holding } = useReview();
  const [answer, setAnswer] = useState('');
  const { card, content, quiz } = question;

  // After the answer the board plays the move that explains it.
  let epd = quiz.epd;
  // While the question is open, the move that led to the position is marked in red.
  const path = movesInto(content, quiz.epd);
  let lastMove: string | undefined = path.at(-1)?.uci;
  let tone: 'red' | 'yellow' = 'red';
  if (quizResult && quiz.showMove) {
    epd = playUci(quiz.epd, quiz.showMove).epd;
    lastMove = quiz.showMove;
    tone = 'yellow';
  }
  // A move picked in the table shows that earlier position instead.
  const looking = viewing !== null ? path[viewing] : undefined;
  if (looking) {
    epd = looking.to;
    lastMove = looking.uci;
    tone = 'red';
  }

  return (
    <Page className="gap-4">
      <SourceBar />
      <div className="flex items-center gap-3">
        <Progress value={(index / queue.length) * 100} className="flex-1" aria-label="Session progress" />
        <span className="text-sm text-muted-foreground">
          {index + 1} of {queue.length}
        </span>
      </div>
      <div className="board-columns grid gap-6">
        <div className="grid content-start gap-2">
          <AppBoard
            id="quiz"
            className="aspect-square w-full"
            epd={epd}
            orientation={content.opening.side}
            interactive={false}
            lastMove={lastMove}
            lastMoveTone={tone}
          />
          <PathSteps length={path.length} />
        </div>
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
            <MoveTable
              sans={path.map((edge) => edge.san)}
              selected={viewing}
              onSelect={(i) => useReview.getState().view(i < path.length - 1 ? i : null)}
            />
            {advancing &&
              (holding ? (
                <Button autoFocus className="w-fit" onClick={() => useReview.getState().skip()}>
                  Next
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="w-fit" onClick={() => useReview.getState().skip()}>
                  Skip ahead
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
