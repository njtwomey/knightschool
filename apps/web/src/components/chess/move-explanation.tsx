import { formatPawns, type Grade, GRADE_INFO, type Score, type Side } from '@knightschool/core';
import { Bot } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Reveal } from '@/components/board/board';
import { MoveTag } from '@/components/board/board-notes';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EvalWords } from './eval-words';
import { MoveChip } from './move-chip';
import { OpeningName, type OpeningNameProps } from './opening-name';
import { RichText, type RichTextBoard, type RichTextContext } from './rich-text';
import { VerdictBadge } from './verdict-badge';

export type ExplainedMove = {
  ply: number;
  san: string;
  uci: string;
  /** The position after it. */
  after: string;
  grade?: Grade;
};

export type Alternative = ExplainedMove & {
  /** Why not: the author's refutation first, else the site's words. */
  because?: string;
  costCp?: number;
  /** Written by the author. */
  authored?: boolean;
};

export type MoveExplanationProps = {
  move: ExplainedMove;
  /** The learner's side, whose moves are bold. */
  side?: Side;
  /** The named position the move reaches. */
  name?: OpeningNameProps;
  /** The author's comment, as rich text. */
  comment?: string;
  /** When there is no comment: the board's own sentences, marked as the site's words. Undefined while still coming. */
  siteSentences?: string[];
  ideas?: ReactNode;
  tags?: string[];
  /** How often it is played at the band, and how those games went for White. */
  played?: { sharePct: number; whiteScorePct: number; band?: string };
  /** The two or three most played alternatives. */
  alternatives?: Alternative[];
  /** Where the position stands after it. */
  scoreAfter?: Score | null;
  /** The position features that matter there. */
  features?: ReactNode;
  /** Full: every part; compact: the move, what it does, ideas (for a panel beside the board). */
  form?: 'full' | 'compact';
  /** Never shown for a move not yet answered at the `test` level. */
  reveal?: Reveal;
  /** Click a move (the alternatives too): go there, an alternative as an explored move. */
  onSelect?: (move: ExplainedMove) => void;
  context?: RichTextContext;
  board?: RichTextBoard;
  className?: string;
};

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h4>
      {children}
    </section>
  );
}

const chip = (
  move: ExplainedMove,
  side: Side | undefined,
  onSelect?: (move: ExplainedMove) => void,
  board?: RichTextBoard,
) => (
  <MoveChip
    ply={move.ply}
    san={move.san}
    epd={move.after}
    from={move.uci.slice(0, 2)}
    to={move.uci.slice(2, 4)}
    // The grade is shown once, by the badge beside the chip.
    mine={side ? (move.ply % 2 === 0) === (side === 'white') : false}
    preview={!board}
    onSelect={onSelect ? () => onSelect(move) : undefined}
    onHover={board ? (hovering) => board.onPreview(hovering ? move.after : null) : undefined}
    orientation={board?.orientation}
  />
);

/**
 * Everything the site knows about one move: what it does, how good it is, how often it is played, and why not the
 * others (docs/v2/components/move-explanation.md). Each part is left out when there is nothing to say, and keeps its
 * place once shown.
 */
export function MoveExplanation({
  move,
  side,
  name,
  comment,
  siteSentences,
  ideas,
  tags = [],
  played,
  alternatives = [],
  scoreAfter,
  features,
  form = 'full',
  reveal = 'study',
  onSelect,
  context,
  board,
  className,
}: MoveExplanationProps) {
  if (reveal === 'test') return null;
  const full = form === 'full';
  return (
    <article className={cn('grid gap-4', className)}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-base">{chip(move, side, onSelect, board)}</span>
        {move.grade ? <VerdictBadge grade={move.grade} size="sm" /> : null}
        {name ? <OpeningName {...name} className="text-sm" /> : null}
      </header>

      {comment ? (
        <RichText text={comment} context={context} board={board} side={side} />
      ) : siteSentences === undefined ? (
        <div className="grid gap-1.5" aria-busy aria-label="Looking at the position">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : siteSentences.length > 0 ? (
        <div className="grid gap-1 text-sm">
          {siteSentences.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Bot className="size-3.5" aria-hidden />
            The site's own words, from looking at the board
          </p>
        </div>
      ) : null}

      {ideas || tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {ideas}
          {tags.map((tag) => (
            <MoveTag key={tag} tag={tag} />
          ))}
        </div>
      ) : null}

      {full && played ? (
        <Part title="How often">
          <div className="grid gap-1.5">
            <p className="text-sm">
              Played in {played.sharePct}% of games at {played.band ?? 'your level'}; White scores{' '}
              {played.whiteScorePct}%.
            </p>
            <div className="h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-foreground/50" style={{ width: `${played.sharePct}%` }} />
            </div>
          </div>
        </Part>
      ) : null}

      {full && alternatives.length > 0 ? (
        <Part title="Why not the others">
          <ul className="grid gap-3">
            {[...alternatives]
              .sort((a, b) => Number(Boolean(b.authored)) - Number(Boolean(a.authored)))
              .map((alt) => (
                <li key={alt.uci} className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {chip(alt, side, onSelect, board)}
                    {alt.grade ? <VerdictBadge grade={alt.grade} size="sm" /> : null}
                    {alt.costCp !== undefined && alt.costCp > 0 ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        costs {formatPawns(alt.costCp, { signed: false })}
                      </span>
                    ) : null}
                    {alt.authored ? <Badge variant="outline">the author's note</Badge> : null}
                  </div>
                  {alt.because ? <p className="text-sm text-muted-foreground">{alt.because}</p> : null}
                  {!alt.because && alt.grade ? (
                    <p className="text-sm text-muted-foreground">{GRADE_INFO[alt.grade].hint}</p>
                  ) : null}
                  {!alt.because && !alt.grade ? <p className="text-xs text-muted-foreground">Not judged yet</p> : null}
                </li>
              ))}
          </ul>
        </Part>
      ) : null}

      {full && (scoreAfter !== undefined || features) ? (
        <Part title="What it leaves">
          {scoreAfter !== undefined ? <EvalWords score={scoreAfter} /> : null}
          {features}
        </Part>
      ) : null}
    </article>
  );
}
