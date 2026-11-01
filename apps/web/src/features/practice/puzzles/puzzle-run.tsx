import { fenToEpd, puzzleUrl, replay, type Side } from '@knightschool/core';
import { ExternalLink, Grid2x2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '@/components/board/board';
import { IdeaBadge } from '@/components/chess/idea-badge';
import { MoveRun } from '@/components/chess/move-run';
import { ExercisePanel, type ExerciseResult as PanelResult } from '@/components/practice/exercise-panel';
import { puzzleThemes } from '@/components/practice/puzzle-themes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';
import {
  levelWords,
  matchedWhy,
  puzzleBoardHref,
  puzzleExercise,
  puzzleGameHref,
  type PuzzleData,
  type SessionPuzzle,
} from './puzzle-data';

const SIDE: Record<Side, string> = { white: 'White', black: 'Black' };

/** What the solver is asked to find, from the puzzle's goal theme (the tactic's own name would give it away). */
function goal(puzzle: SessionPuzzle): string {
  if (puzzle.themes.some((theme) => theme.startsWith('mate'))) return 'find the mate';
  if (puzzle.themes.includes('equality')) return 'save the game';
  if (puzzle.themes.includes('crushing')) return 'find the winning move';
  return 'win material';
}

/** The puzzle's result in the exercise panel's words: any wrong try misses a puzzle, as on Lichess. */
function puzzleResult(result: ExerciseResult): PanelResult {
  if (result.shown) return 'shown';
  if (!result.right) return 'missed';
  return result.hint ? 'right-hint' : 'right';
}

/** The ply of the row's FEN (its move number and side to move), so the moves are numbered as in the game. */
function firstPly(fen: string): number {
  const [, turn, , , , move] = fen.split(' ');
  return (Math.max(1, Number(move) || 1) - 1) * 2 + (turn === 'b' ? 1 : 0);
}

/**
 * One puzzle (docs/v2/pages/puzzles.md): played as an exercise, then shown for analysis with the solution, what it was
 * about, why it was chosen and where it came from. A solved puzzle in a session moves on by itself; a miss waits.
 */
export function PuzzleRun({
  puzzle,
  data,
  learnerSide,
  progress,
  onFinished,
  onNext,
}: {
  puzzle: SessionPuzzle;
  data: PuzzleData;
  /** The learner's side in the puzzle's opening: a puzzle the other side solves is a danger to see coming. */
  learnerSide?: Side;
  progress?: { done: number; total: number };
  onFinished?: (result: ExerciseResult) => void;
  /** In a session: the next puzzle. A solved puzzle goes on by itself. */
  onNext?: () => void;
}) {
  const exercises = useMemo(() => [puzzleExercise(puzzle)], [puzzle]);
  const session = useExerciseSession({ exercises, save: 'exercise' });
  const result = session.results[0];
  const reported = useRef(false);

  useEffect(() => {
    if (!result || reported.current) return;
    reported.current = true;
    onFinished?.(result);
    if (onNext && result.right && !result.hint) {
      const timer = setTimeout(onNext, siteConfig.timing.nextCard + siteConfig.timing.afterCorrect);
      return () => clearTimeout(timer);
    }
  }, [result]);

  if (result) return <PuzzleAfter puzzle={puzzle} data={data} result={result} progress={progress} onNext={onNext} />;

  const solver = puzzle.solver;
  const danger = learnerSide && learnerSide !== solver;
  const asked = danger
    ? `${SIDE[solver]} to play: what does your opponent have? Find it, so you see it coming`
    : `${SIDE[solver]} to play and ${goal(puzzle)}`;
  return (
    <ExerciseBoard
      session={session}
      prompt={<p className="font-medium">{asked}</p>}
      aside={
        <ExercisePanel
          mode="puzzles"
          prompt={asked}
          context={
            <>
              {matchedWhy(puzzle, data)}. Rated {puzzle.rating}.
            </>
          }
          tries={{
            left: session.triesBeforeShown - session.attempt.tries.filter((t) => t.outcome === 'wrong').length,
            total: session.triesBeforeShown,
          }}
          help={{ hint: session.attempt.hint, shown: session.attempt.shown }}
          progress={progress}
        />
      }
    />
  );
}

/** After the puzzle: step through it, see what it was and where it came from. */
function PuzzleAfter({
  puzzle,
  data,
  result,
  progress,
  onNext,
}: {
  puzzle: SessionPuzzle;
  data: PuzzleData;
  result: ExerciseResult;
  progress?: { done: number; total: number };
  onNext?: () => void;
}) {
  const start = fenToEpd(puzzle.fen);
  const moves = useMemo(() => replay(start, puzzle.moves), [start, puzzle.moves]);
  const positions = useMemo(
    () => [
      { epd: start },
      ...moves.map((move) => ({ epd: move.epd, lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) } })),
    ],
    [start, moves],
  );
  const [index, setIndex] = useState(positions.length - 1);
  const { ideas, tags } = puzzleThemes(puzzle.themes);
  const game = puzzleGameHref(puzzle);
  const panelResult = puzzleResult(result);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <Board
        positions={positions}
        index={index}
        onIndex={setIndex}
        reveal="answered"
        orientation={puzzle.solver}
        keys
        actions={
          <Button asChild variant="ghost" size="sm">
            <a href={to(puzzleBoardHref(puzzle, puzzle.solver))}>
              <Grid2x2 aria-hidden /> Open on the board
            </a>
          </Button>
        }
      />
      <div className="grid content-start gap-4">
        <ExercisePanel
          mode="puzzles"
          prompt={`${SIDE[puzzle.solver]} to play and ${goal(puzzle)}`}
          context={`Rated ${puzzle.rating}`}
          result={panelResult}
          progress={progress}
          explanation={
            <div className="grid gap-3">
              <div className="grid gap-1">
                <span className="text-muted-foreground">The solution</span>
                <MoveRun
                  moves={moves.map((move) => ({ san: move.san, uci: move.uci, after: move.epd }))}
                  firstPly={firstPly(puzzle.fen)}
                  side={puzzle.solver}
                  current={index - 1}
                  onSelect={(i) => setIndex(i + 1)}
                  orientation={puzzle.solver}
                />
              </div>
              {ideas.length + tags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">What it was:</span>
                  {ideas.map(({ theme, name }) =>
                    data.ideas[theme] ? (
                      <IdeaBadge key={theme} idea={data.ideas[theme]} />
                    ) : (
                      <Badge key={theme} variant="outline">
                        {name}
                      </Badge>
                    ),
                  )}
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p>
                <Badge variant="secondary" className="mr-1.5">
                  Matched {levelWords(puzzle.level)}
                </Badge>
                {matchedWhy(puzzle, data)}.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                {game ? (
                  <a
                    href={game}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    The game on Lichess <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                ) : null}
                <a
                  href={puzzleUrl(puzzle.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Lichess puzzle {puzzle.id} <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>
          }
          onNext={onNext}
        />
      </div>
    </div>
  );
}
