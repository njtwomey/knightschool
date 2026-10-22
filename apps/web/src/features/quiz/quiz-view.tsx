import { pathTo, playUci, type LineEdge, type OpeningContent } from '@knightschool/core';
import { useState } from 'react';
import { StudyBoard } from '@/components/board/study-board';
import { MoveList } from '@/components/move-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { QuizQuestion } from './questions';
import { useQuiz } from './store';
import { usePathStepper } from './use-path-stepper';

/** The moves that reached a position in a course; empty if it is not on a line. */
function movesInto(content: OpeningContent, epd: string): LineEdge[] {
  if (epd === content.opening.rootEpd || !content.nodes[epd]) return [];
  try {
    return pathTo(content, epd);
  } catch {
    return [];
  }
}

/** A question answered in words: type, get feedback or the reveal, and it moves on by itself. */
export function QuizView({ question }: { question: QuizQuestion }) {
  const { quizResult, advancing, viewing, holding } = useQuiz();
  const [answer, setAnswer] = useState('');
  const { card, content, quiz } = question;
  const path = movesInto(content, quiz.epd);
  const stepper = usePathStepper(path.length);

  // After the answer the board plays the move that explains it.
  let epd = quiz.epd;
  // While the question is open, the move that led to the position is marked in red.
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
    <div className="board-columns grid gap-6">
      <StudyBoard
        id="quiz"
        epd={epd}
        orientation={content.opening.side}
        interactive={false}
        lastMove={lastMove}
        lastMoveTone={tone}
        stepper={stepper}
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
                useQuiz.getState().submitAnswer(answer);
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
          <MoveList
            layout="table"
            label="Moves so far"
            empty="The game is about to begin."
            moves={path.map((edge, ply) => ({ ply, san: edge.san }))}
            current={viewing ?? path.length - 1}
            onSelect={(ply) => useQuiz.getState().view(ply < path.length - 1 ? ply : null)}
          />
          {advancing &&
            (holding ? (
              <Button autoFocus className="w-fit" onClick={() => useQuiz.getState().skip()}>
                Next
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="w-fit" onClick={() => useQuiz.getState().skip()}>
                Skip ahead
              </Button>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
