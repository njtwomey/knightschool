import { fenToEpd, playMove, sideToMove, type Side } from '@knightschool/core';
import { Check, ExternalLink, Lightbulb, X } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ABOVE_ROW_LINK, RowLink } from '@/components/finding/sortable-table';
import { cn } from '@/lib/utils';
import { puzzleThemes } from './puzzle-themes';

/** A Lichess puzzle: the FEN before the opponent's move that sets it up, then the moves (the first is that move). */
export type PuzzleData = { id: string; fen: string; moves: string[]; rating: number; themes: string[] };

export type PuzzleState = { result: 'solved' | 'hint' | 'missed'; nextReview?: string };

export type PuzzleCardProps = {
  puzzle: PuzzleData;
  /** Where it comes from in the learner's openings: "From a game that passed through step 4 of your Italian Game". */
  from?: string;
  /** The matching position, previewed on hover of the "where it comes from" line. */
  fromPosition?: { epd: string; lastMove?: { from: string; to: string } };
  href: string;
  size?: 'card' | 'row';
  /** On for a puzzle about to be solved, since a theme can give the answer away. */
  hideThemes?: boolean;
  /** The learner's puzzle range (`puzzles.rating`), for "about your level". */
  level?: [number, number];
  state?: PuzzleState;
  /** The learner's side: a puzzle the other side solves asks what they threaten. */
  learnerSide?: Side;
  className?: string;
};

const STATE = {
  solved: { icon: Check, text: 'Solved', tone: 'text-feedback-right' },
  hint: { icon: Lightbulb, text: 'Solved with a hint', tone: 'text-foreground' },
  missed: { icon: X, text: 'Missed', tone: 'text-feedback-wrong' },
} as const;

const SIDE_NAME: Record<Side, string> = { white: 'White', black: 'Black' };

function ratingWord(rating: number, level: [number, number]) {
  if (rating < level[0] - 100) return 'easier than usual';
  if (rating > level[1] + 100) return 'harder than usual';
  return 'about your level';
}

/**
 * A puzzle in a list or on Today: where it starts, how hard it is, what it is about and where it comes from
 * (docs/v2/components/puzzle-card.md). The whole card is a link to the puzzle.
 */
export function PuzzleCard({
  puzzle,
  from,
  fromPosition,
  href,
  size = 'card',
  hideThemes = false,
  level = [1100, 1300],
  state,
  learnerSide,
  className,
}: PuzzleCardProps) {
  const before = fenToEpd(puzzle.fen);
  const setup = playMove(before, puzzle.moves[0]!);
  const epd = setup?.epd ?? before;
  const solver = sideToMove(epd);
  const { ideas, tags } = puzzleThemes(puzzle.themes);
  const title =
    learnerSide && learnerSide !== solver ? `What ${SIDE_NAME[solver]} threatens` : `${SIDE_NAME[solver]} to play`;
  const lichess = `https://lichess.org/training/${puzzle.id}`;

  const rating = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('cursor-default text-sm tabular-nums', ABOVE_ROW_LINK)}>
          <span className="font-medium">{puzzle.rating}</span>
          <span className="text-muted-foreground">, {ratingWord(puzzle.rating, level)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Lichess rating; your puzzles go well around {level[0]} to {level[1]}
      </TooltipContent>
    </Tooltip>
  );

  const fromLine = from ? (
    fromPosition ? (
      <HoverCard openDelay={400} closeDelay={150}>
        <HoverCardTrigger asChild>
          <p
            className={cn(
              'cursor-default text-sm text-muted-foreground underline decoration-dotted underline-offset-4',
              ABOVE_ROW_LINK,
            )}
          >
            {from}
          </p>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto p-2">
          <BoardThumb epd={fromPosition.epd} lastMove={fromPosition.lastMove} orientation={solver} className="w-44" />
        </HoverCardContent>
      </HoverCard>
    ) : (
      <p className="text-sm text-muted-foreground">{from}</p>
    )
  ) : null;

  const result = state ? (
    <p className={cn('flex items-center gap-1 text-sm', STATE[state.result].tone)}>
      {(() => {
        const Icon = STATE[state.result].icon;
        return <Icon className="size-4" aria-hidden />;
      })()}
      {STATE[state.result].text}
      {state.nextReview ? <span className="text-muted-foreground">, next {state.nextReview}</span> : null}
    </p>
  ) : null;

  const credit = (
    <a
      href={lichess}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground',
        ABOVE_ROW_LINK,
      )}
    >
      Lichess puzzle {puzzle.id}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );

  if (size === 'row') {
    return (
      <div
        className={cn(
          'relative flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted/50',
          className,
        )}
      >
        <BoardThumb
          epd={epd}
          lastMove={setup ? { from: setup.from, to: setup.to } : undefined}
          orientation={solver}
          className="w-16 shrink-0"
        />
        <div className="grid min-w-0 gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <RowLink href={href}>{title}</RowLink>
            {rating}
          </div>
          {from ? <p className="truncate text-sm text-muted-foreground">{from}</p> : null}
          {result}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative grid w-full max-w-72 gap-2 rounded-xl border p-3 transition-colors hover:bg-muted/40',
        className,
      )}
    >
      <BoardThumb
        epd={epd}
        lastMove={setup ? { from: setup.from, to: setup.to } : undefined}
        orientation={solver}
        className="w-full"
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <RowLink href={href}>{title}</RowLink>
        {rating}
      </div>
      {fromLine}
      {!hideThemes && ideas.length + tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {ideas.map((idea) => (
            <Badge key={idea} variant="secondary">
              {idea}
            </Badge>
          ))}
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
      {result}
      {credit}
    </div>
  );
}
