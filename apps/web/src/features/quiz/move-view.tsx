import { explainMove } from '@knightschool/core';
import { StudyBoard } from '@/components/board/study-board';
import { arrowsOf, squareStylesOf, uciArrow } from '@/components/board/shapes';
import { EcoLink } from '@/components/eco-link';
import { MoveList } from '@/components/move-list';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MoveQuestion } from './questions';
import { useQuiz } from './store';
import { usePathStepper } from './use-path-stepper';

/** A move to play: the position before it, the moves that led there, hint and show, and what the move is for after. */
export function MoveView({ question }: { question: MoveQuestion }) {
  const { attempt, badge, advancing, viewing, holding } = useQuiz();
  const { card, content, lastEdge, path, expected } = question;
  const stepper = usePathStepper(path.length);
  const side = content.opening.side;
  const done = attempt.status === 'done';
  const looking = viewing !== null && path[viewing] ? path[viewing] : undefined;
  const epd = looking ? looking.to : done ? expected.to : card.epd;
  const lastMove = looking ? looking.uci : done ? expected.uci : lastEdge?.uci;
  const notes = done ? explainMove(card.epd, expected.uci, { edge: expected }) : [];

  return (
    <div className="board-columns grid gap-6">
      <StudyBoard
        id="review"
        previewable
        epd={epd}
        orientation={side}
        interactive={!advancing && !looking}
        onMove={(uci) => useQuiz.getState().submitMove(uci)}
        lastMove={lastMove}
        lastMoveTone={done && !looking ? 'yellow' : 'red'}
        arrows={
          looking ? [] : attempt.shown && !done ? [uciArrow(expected.uci)] : done ? arrowsOf(expected.annotation) : []
        }
        squareStyles={done && !looking ? squareStylesOf(undefined, expected.annotation) : undefined}
        badge={badge}
        hintSquare={attempt.hintUsed && !done ? card.expectedUci.slice(0, 2) : null}
        stepper={stepper}
        controls={{
          hint: { onHint: () => useQuiz.getState().hint(), disabled: attempt.hintUsed || attempt.shown || done },
          show: { onShow: () => useQuiz.getState().show(), disabled: attempt.shown || done },
        }}
      />

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
            {/* At the first move the empty list already says the game is about to begin. */}
            {lastEdge && (
              <p className="text-muted-foreground">
                {side === 'white' ? 'Black' : 'White'} just played {lastEdge.san}.
              </p>
            )}
            <MoveList
              layout="table"
              label="Moves so far"
              empty="The game is about to begin."
              moves={[...path, ...(done ? [expected] : [])].map((edge, ply) => ({ ply, san: edge.san }))}
              current={viewing ?? path.length - (done ? 0 : 1)}
              onSelect={(ply) => useQuiz.getState().view(ply < path.length - 1 ? ply : null)}
            />
          </div>
          {!done && attempt.wrongTries > 0 && !attempt.shown && <p>Not that one. Try again, or use a hint.</p>}
          {!done && attempt.shown && <p>The move is marked on the board. Play it to carry on.</p>}
          {holding && (
            <Button autoFocus className="w-fit" onClick={() => useQuiz.getState().skip()}>
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
  );
}
