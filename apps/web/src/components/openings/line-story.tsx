import { GRADE_INFO, gradeFromNags } from '@knightschool/core';
import { GRADE_TEXT } from '@/components/chess/grade-style';
import { evalWords, numberedMove, type Score } from '@knightschool/core';
import { ChevronRight, GitBranch } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MoveTag } from '@/components/board/board-notes';
import { EvalWords } from '@/components/chess/eval-words';
import { IdeaBadge, type Idea } from '@/components/chess/idea-badge';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveRun, type RunMove } from '@/components/chess/move-run';
import { OpeningName } from '@/components/chess/opening-name';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { LineRow, type LineData } from './line-row';
import type { Side } from './types';

export type StoryMove = RunMove & {
  note?: { text?: string; ideas?: Idea[]; tags?: string[] };
  nag?: number[];
  /** What punishes this move, off the line: folded under it. */
  refutation?: { moves: RunMove[]; text?: string };
};

export type StoryPart = 'start' | 'moves' | 'end' | 'grows' | 'others';
const ALL_PARTS: StoryPart[] = ['start', 'moves', 'end', 'grows', 'others'];

export type LineStoryProps = {
  /** The line's moves from where it branches, from `firstPly`. */
  moves: StoryMove[];
  firstPly?: number;
  /** The learner's side ("yours" is bold). */
  side: Side;
  /** Where it branches off: the parent line, and the shared moves before it (greyed). */
  start?: { parent: string; href?: string; shared: RunMove[] };
  /** The last position's score, and the plan from there. */
  end?: { score: Score | null; plan?: string };
  /** Lines that branch off this one, with the move they branch at. */
  grows?: LineData[];
  /** Other openings that teach it. */
  others?: { name: string; eco?: string; side?: string; href?: string }[];
  /** The board's cursor, as an index into `moves`; the move shown is marked. */
  current?: number;
  onSelect?: (index: number) => void;
  /** A refutation's move was clicked: the board steps through it, off the line. */
  onSelectRefutation?: (moveIndex: number, refutationIndex: number) => void;
  parts?: StoryPart[];
  /** `feedback.evalAfter`. */
  evalAfter?: 'off' | 'words' | 'numbers';
  loading?: boolean;
  className?: string;
};

type Paragraph = { from: number; to: number };

/** Runs of moves, each closed by a move with a comment or a refutation. */
function paragraphsOf(moves: StoryMove[]): Paragraph[] {
  const out: Paragraph[] = [];
  let from = 0;
  moves.forEach((move, i) => {
    if (move.note?.text || move.refutation || i === moves.length - 1) {
      out.push({ from, to: i });
      from = i + 1;
    }
  });
  return out;
}

function Refutation({
  move,
  ply,
  side,
  onSelect,
}: {
  move: StoryMove;
  ply: number;
  side: Side;
  onSelect?: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const refutation = move.refutation!;
  const first = refutation.moves[0];
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="xs" className="-ml-2 text-muted-foreground">
          <ChevronRight className={cn('transition-transform', open && 'rotate-90')} aria-hidden />
          {first ? `Why it fails: ${numberedMove(ply + 1, first.san)}` : 'Why it fails'}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 grid gap-1 border-l-2 border-mark-threat/50 pl-3 text-sm">
        <MoveRun moves={refutation.moves} firstPly={ply + 1} side={side} orientation={side} onSelect={onSelect} />
        {refutation.text ? <p className="text-muted-foreground">{refutation.text}</p> : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * A line told in words: where it branches off, its moves with their comments, where it ends, and what grows out of it
 * (docs/v2/components/line-story.md). Bound to the board's cursor; the move shown is marked and kept in view.
 */
export function LineStory({
  moves,
  firstPly = 0,
  side,
  start,
  end,
  grows = [],
  others = [],
  current,
  onSelect,
  onSelectRefutation,
  parts = ALL_PARTS,
  evalAfter = 'numbers',
  loading,
  className,
}: LineStoryProps) {
  const holder = useRef<HTMLDivElement>(null);

  // The board's step buttons move the mark through the text; keep it in view.
  useEffect(() => {
    if (current === undefined) return;
    holder.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  if (loading) {
    return (
      <div className={cn('grid gap-4', className)} aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const show = (part: StoryPart) => parts.includes(part);
  const mine = (ply: number) => (ply % 2 === 0) === (side === 'white');
  const gradeOf = (move: StoryMove) => gradeFromNags(move.nag);

  const chip = (move: StoryMove, index: number, numbered: 'always' | 'white') => {
    const ply = firstPly + index;
    const grade = gradeOf(move);
    const symbol = grade ? GRADE_INFO[grade].symbol : null;
    return (
      <span key={`${ply}-${move.uci}`} className="inline-flex items-baseline">
        <MoveChip
          ply={ply}
          san={move.san}
          epd={move.after}
          from={move.uci.slice(0, 2)}
          to={move.uci.slice(2, 4)}
          mine={mine(ply)}
          numbered={numbered}
          current={current === index}
          preview={!onSelect}
          onSelect={onSelect ? () => onSelect(index) : undefined}
          orientation={side}
        />
        {symbol ? (
          <span className={cn('-ml-0.5 font-mono text-sm font-bold', grade && GRADE_TEXT[grade])}>{symbol}</span>
        ) : null}
      </span>
    );
  };

  const last = moves[moves.length - 1];
  const words = end?.score ? evalWords(end.score, siteConfig.judge.evalWords) : null;

  return (
    <div ref={holder} className={cn('grid gap-5 text-sm leading-relaxed', className)}>
      {show('start') && start ? (
        <section className="grid gap-1">
          <p className="flex flex-wrap items-center gap-x-1.5">
            <GitBranch className="size-4 text-muted-foreground" aria-hidden />
            Branches off{' '}
            {start.href ? (
              <a href={start.href} className="font-medium underline underline-offset-4">
                {start.parent}
              </a>
            ) : (
              <span className="font-medium">{start.parent}</span>
            )}
            {start.shared.length ? (
              <>
                {' '}
                after{' '}
                <span className="font-mono">
                  {numberedMove(start.shared.length - 1, start.shared[start.shared.length - 1]!.san)}
                </span>
              </>
            ) : null}
          </p>
          {start.shared.length ? (
            <span className="text-muted-foreground opacity-75">
              <MoveRun moves={start.shared} side={side} orientation={side} />
            </span>
          ) : null}
        </section>
      ) : null}

      {show('moves') ? (
        <section className="grid gap-3">
          {paragraphsOf(moves).map(({ from, to }) => {
            const closing = moves[to]!;
            // The paragraph holding the move shown: tinted, with an edge, so it is clear where the board is.
            const here = current !== undefined && current >= from && current <= to;
            return (
              <div
                key={from}
                className={cn(
                  '-mx-2 rounded-md border px-2 py-1.5 transition-colors',
                  here ? 'border-primary/60 bg-accent ring-1 ring-primary/30' : 'border-transparent',
                )}
              >
                <span className="inline-flex flex-wrap items-baseline gap-x-0.5">
                  {moves.slice(from, to + 1).map((move, i) => chip(move, from + i, i === 0 ? 'always' : 'white'))}
                </span>
                {closing.note?.text ? <span className="ml-1.5">{closing.note.text}</span> : null}
                {closing.note?.ideas?.length || closing.note?.tags?.length ? (
                  <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                    {closing.note.ideas?.map((idea) => (
                      <IdeaBadge key={idea.id} idea={idea} />
                    ))}
                    {closing.note.tags?.map((tag) => (
                      <MoveTag key={tag} tag={tag} />
                    ))}
                  </span>
                ) : null}
                {closing.refutation ? (
                  <Refutation
                    move={closing}
                    ply={firstPly + to}
                    side={side}
                    onSelect={onSelectRefutation ? (i) => onSelectRefutation(to, i) : undefined}
                  />
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {show('end') && end && last && evalAfter !== 'off' ? (
        <section className="grid gap-1 rounded-lg bg-muted/50 p-3">
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-muted-foreground">
              Where it ends, after {numberedMove(firstPly + moves.length - 1, last.san)}:
            </span>
            {evalAfter === 'numbers' ? (
              <EvalWords score={end.score} />
            ) : (
              <span className="font-medium">{words?.words ?? 'No evaluation yet'}</span>
            )}
          </p>
          {end.plan ? <p>{end.plan}</p> : null}
        </section>
      ) : null}

      {show('grows') && grows.length ? (
        <section className="grid gap-2">
          <h3 className="font-semibold">What grows from it</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {grows.map((line) => (
              <LineRow key={line.id} line={line} form="card" maxMoves={4} />
            ))}
          </div>
        </section>
      ) : null}

      {show('others') && others.length ? (
        <section className="grid gap-1.5">
          <h3 className="font-semibold">Other openings that teach it</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {others.map((other) => (
              <li key={other.name}>
                <OpeningName name={other.name} eco={other.eco} side={other.side} href={other.href} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
