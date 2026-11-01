import { numberedMove } from '@knightschool/core';
import type { BuiltOpening, BuiltStep, OpeningFacts } from '@knightschool/core/content';
import { ArrowLeft, ArrowRight, BookOpen, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Board } from '@/components/board/board';
import { BoardFeedback } from '@/components/board/board-feedback';
import { TriesTable } from '@/components/chess/tries-table';
import { Button } from '@/components/ui/button';
import { loadFacts, loadOpening } from '@/data/content';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { bakedScore, stepMoves } from './model';
import { useTry } from './use-try';
import { openingHref, stepHref } from './views';

type Stage = 'watch' | 'try' | 'done';

/** Learning one step: read and watch its moves, then try them without help (docs/v2/pages/step.md). */
export function StepPage({ id, n }: { id: string; n: number }) {
  const data = useLoad(
    async () => ({ opening: await loadOpening(id), facts: await loadFacts(id).catch(() => undefined) }),
    [id],
  );
  if (data.error) return <main className="mx-auto max-w-7xl px-4 py-8 text-destructive">{data.error}</main>;
  if (!data.data) return <main className="mx-auto max-w-7xl px-4 py-8 text-muted-foreground">Loading…</main>;
  const step = data.data.opening.steps[n - 1];
  if (!step) return <main className="mx-auto max-w-7xl px-4 py-8">This opening has no step {n}.</main>;
  return <StepView key={step.id} opening={data.data.opening} facts={data.data.facts} step={step} n={n} />;
}

const initialStage = (): Stage => {
  const stage = new URLSearchParams(window.location.hash.slice(1)).get('stage');
  return stage === 'try' || stage === 'done' ? stage : 'watch';
};

function StepView({
  opening,
  facts,
  step,
  n,
}: {
  opening: BuiltOpening;
  facts?: OpeningFacts;
  step: BuiltStep;
  n: number;
}) {
  const [stage, setStageState] = useState<Stage>(initialStage);
  const setStage = (next: Stage) => {
    setStageState(next);
    window.history.replaceState(null, '', `#stage=${next}`);
  };
  const total = opening.steps.length;
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <a
            href={openingHref(opening.id)}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {opening.name}
          </a>
          <h1 className="text-2xl font-semibold tracking-tight">
            Step {n} of {total}
            {step.title ? `: ${step.title}` : ''}
          </h1>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Stages">
          {(['watch', 'try', 'done'] as const).map((name) => (
            <Button
              key={name}
              variant={stage === name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStage(name)}
            >
              {name === 'watch' ? 'Watch' : name === 'try' ? 'Try' : 'Done'}
            </Button>
          ))}
        </div>
      </div>
      {step.text ? <p className="max-w-3xl text-muted-foreground">{step.text}</p> : null}
      {stage === 'watch' ? <Watch opening={opening} facts={facts} step={step} onTry={() => setStage('try')} /> : null}
      {stage === 'try' ? (
        <TryStage opening={opening} facts={facts} step={step} onDone={() => setStage('done')} />
      ) : null}
      {stage === 'done' ? (
        <div className="grid gap-4">
          <p>That is the step. Its moves are now in your reviews.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStage('try')}>
              <Target aria-hidden /> Try again
            </Button>
            {n < total ? (
              <Button asChild>
                <a href={stepHref(opening.id, n + 1)}>
                  Next step <ArrowRight aria-hidden />
                </a>
              </Button>
            ) : (
              <Button asChild>
                <a href={openingHref(opening.id)}>
                  <ArrowLeft aria-hidden /> Back to the opening
                </a>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

/** Watch: step through the moves with their comments and marks; the violet arrow is the move to play. */
function Watch({
  opening,
  facts,
  step,
  onTry,
}: {
  opening: BuiltOpening;
  facts?: OpeningFacts;
  step: BuiltStep;
  onTry: () => void;
}) {
  const { moves } = useMemo(() => stepMoves(opening, step), [opening, step]);
  const [index, setIndex] = useState(0);
  const positions = useMemo(
    () => [
      { epd: moves[0]!.before, score: bakedScore(facts, moves[0]!.before), next: squares(moves[0]!.uci) },
      ...moves.map((move, i) => ({
        epd: move.after,
        lastMove: squares(move.uci),
        marks: move.note,
        score: bakedScore(facts, move.after),
        next: moves[i + 1] ? squares(moves[i + 1]!.uci) : undefined,
      })),
    ],
    [moves, facts],
  );
  const shown = moves[index - 1];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <Board
        positions={positions}
        index={index}
        onIndex={setIndex}
        reveal="learn"
        orientation={opening.side}
        keys
        caption={
          shown ? (
            <p>
              <span className="font-mono font-semibold">{numberedMove(shown.ply, shown.san)}</span>{' '}
              {shown.note?.text ?? ''}
            </p>
          ) : (
            <p className="text-muted-foreground">Step forward to see each move and why it is played.</p>
          )
        }
      />
      <div className="grid content-start gap-3">
        <p className="text-sm text-muted-foreground">
          {moves.filter((move) => move.mine).length} of your moves in this step. Step through them, then try them
          without help.
        </p>
        <div>
          <Button onClick={onTry}>
            <Target aria-hidden /> Try it
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Try: play your moves without help; every guess is collected with what it cost. */
function TryStage({
  opening,
  facts,
  step,
  onDone,
}: {
  opening: BuiltOpening;
  facts?: OpeningFacts;
  step: BuiltStep;
  onDone: () => void;
}) {
  const session = useTry(opening, step, facts);
  const triesLeft =
    siteConfig.teach.triesBeforeShown - session.attempt.tries.filter((t) => t.outcome === 'wrong').length;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <Board
        positions={[{ epd: session.epd, lastMove: session.lastMove }]}
        index={0}
        reveal={session.phase === 'done' ? 'answered' : 'test'}
        orientation={opening.side}
        flippable={false}
        interactive={Boolean(session.asking)}
        onMove={session.play}
        badge={session.badge}
        arrows={session.arrows}
        lit={session.hintSquare ? [session.hintSquare] : undefined}
        exercise={
          session.asking
            ? {
                help: session.attempt.shown ? 'shown' : session.attempt.hint ? 'hint' : 'none',
                onHint: session.hint,
                onShow: session.show,
                triesSpent: triesLeft <= 0,
              }
            : undefined
        }
        caption={
          session.asking ? (
            <p className="font-medium">Your move: what does {opening.side === 'white' ? 'White' : 'Black'} play?</p>
          ) : session.phase === 'done' ? (
            <p className="font-medium">Step done.</p>
          ) : (
            <p className="text-muted-foreground">The other side is moving…</p>
          )
        }
      />
      <div className="grid content-start gap-4">
        <BoardFeedback feedback={session.feedback} reveal="answered" triesLeft={triesLeft} />
        <TriesTable tries={session.tries} />
        {session.phase === 'done' ? (
          <div>
            <Button onClick={onDone}>
              <BookOpen aria-hidden /> Finish the step
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
