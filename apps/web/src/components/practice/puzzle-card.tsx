import { fenToEpd, playMove, sideToMove, type Side } from '@knightschool/core';
import { Check, ExternalLink, Lightbulb, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { IdeaBadge, type Idea } from '@/components/chess/idea-badge';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RowLink } from '@/components/finding/sortable-table';
import { ABOVE_ROW_LINK, ABOVE_ROW_LINK_GROUP, LINKED_CARD } from '@/components/shared/card-link';
import { cn } from '@/lib/utils';
import { puzzleThemes } from './puzzle-themes';
import { PositionPreview } from '@/components/chess/position-preview';

/** A Lichess puzzle: the FEN before the opponent's move that sets it up, then the moves (the first is that move). */
export type PuzzleData = { id: string; fen: string; moves: string[]; rating: number; themes: string[] };

export type PuzzleState = { result: 'solved' | 'hint' | 'missed'; nextReview?: string };

export type PuzzleCardProps = {
  puzzle: PuzzleData;
  /** Where it comes from in the learner's openings: "From a game that passed through step 4 of your Italian Game". */
  from?: string;
  /** The matching position, previewed on hover of the "where it comes from" line. */
  fromPosition?: { epd: string; lastMove?: { from: string; to: string } };
  /** The puzzle as an exercise; the whole card links to it. Left out where the card opens something else (Create). */
  href?: string;
  size?: 'card' | 'row';
  /** Our ideas, by the Lichess theme they match: those themes show as idea badges, the rest as plain tags. */
  ideas?: Record<string, Idea>;
  /** Before the title, keeping its own click: the puzzle picker's checkbox. */
  lead?: ReactNode;
  /** More badges before the themes: how it matched, where it is used. */
  badges?: ReactNode;
  /** Buttons under the card, keeping their own clicks: Try it. */
  actions?: ReactNode;
  /** Chosen, in a picker. */
  selected?: boolean;
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
  ideas: ideaOf = {},
  lead,
  badges,
  actions,
  selected,
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
  const heading = (
    <>
      {lead ? <span className={cn('inline-flex self-center', ABOVE_ROW_LINK)}>{lead}</span> : null}
      {href ? <RowLink href={href}>{title}</RowLink> : <span className="font-medium">{title}</span>}
    </>
  );

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
      <PositionPreview position={{ ...fromPosition, orientation: solver }}>
        <p
          className={cn(
            'cursor-default text-sm text-muted-foreground underline decoration-dotted underline-offset-4',
            ABOVE_ROW_LINK,
          )}
        >
          {from}
        </p>
      </PositionPreview>
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
      <div className={cn(href ? LINKED_CARD : 'relative', 'flex items-center gap-3 rounded-lg border p-2', className)}>
        <BoardThumb
          epd={epd}
          lastMove={setup ? { from: setup.from, to: setup.to } : undefined}
          orientation={solver}
          className="w-16 shrink-0"
        />
        <div className="grid min-w-0 gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {heading}
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
        href ? LINKED_CARD : 'relative',
        'grid w-full max-w-72 gap-2 rounded-xl border p-3',
        selected && 'ring-2 ring-primary',
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
        <span className="flex items-baseline gap-2">{heading}</span>
        {rating}
      </div>
      {fromLine}
      {badges || (!hideThemes && ideas.length + tags.length > 0) ? (
        <div className={cn('flex flex-wrap gap-1', ABOVE_ROW_LINK_GROUP)}>
          {badges}
          {hideThemes
            ? null
            : ideas.map(({ theme, name }) =>
                ideaOf[theme] ? (
                  <IdeaBadge key={theme} idea={ideaOf[theme]} />
                ) : (
                  <Badge key={theme} variant="outline" className="text-muted-foreground">
                    {name}
                  </Badge>
                ),
              )}
          {hideThemes
            ? null
            : tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-muted-foreground">
                  {tag}
                </Badge>
              ))}
        </div>
      ) : null}
      {result}
      {actions ? <div className={cn('flex flex-wrap items-center gap-1', ABOVE_ROW_LINK_GROUP)}>{actions}</div> : null}
      {credit}
    </div>
  );
}
