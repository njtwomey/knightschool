import { GRADE_INFO, numberedMove, type Grade, type Marks } from '@knightschool/core';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MarkKey } from '@/components/chess/mark-key';
import { OpeningName, type OpeningNameProps } from '@/components/chess/opening-name';
import { RichText, type RichTextBoard, type RichTextContext } from '@/components/chess/rich-text';
import { gradeText } from '@/components/chess/verdict-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Reveal } from './board';

export type NotesMove = {
  ply: number;
  san: string;
  /** The move's symbol, from its grade or the author's NAG. */
  grade?: Grade;
  symbol?: string;
  comment?: string;
  ideas?: ReactNode;
  /** Tip, Trap, Common blunder, or the author's own word. */
  tags?: string[];
  marks?: Partial<Marks>;
  /** The position's name, when it has one. */
  name?: OpeningNameProps;
};

const TAG_TONE: Record<string, string> = {
  Tip: 'border-mark-idea/40 text-mark-idea',
  Trap: 'border-kind-trap-avoid/40 text-kind-trap-avoid',
  'Common blunder': 'border-verdict-mistake/40 text-verdict-mistake',
};

/**
 * What the author says about the move on the board: its comment, ideas and tags, and what the marks mean
 * (docs/v2/components/board-notes.md). Follows the board's cursor; hidden while testing.
 */
export function BoardNotes({
  move,
  ahead,
  startText = 'Step through the moves with the arrows, or tap a move.',
  reveal = 'study',
  marksWhileStudying = true,
  more,
  context,
  board,
  side,
  className,
}: {
  /** The move at the cursor; undefined at the start position. */
  move?: NotesMove;
  /** In Watch (`learn`), the move about to be played, shown before it is played. */
  ahead?: NotesMove;
  /** At the start: the line's or step's own text. */
  startText?: string;
  reveal?: Reveal;
  /** `board.marksWhileStudying`: whether the key shows. */
  marksWhileStudying?: boolean;
  /** In `study`, "More about this move" opens the full move explanation. */
  more?: ReactNode;
  context?: RichTextContext;
  board?: RichTextBoard;
  side?: 'white' | 'black';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (reveal === 'test') return null;
  const shown = reveal === 'learn' && ahead ? ahead : move;
  if (!shown) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        <RichText text={startText} context={context} board={board} side={side} />
      </div>
    );
  }
  const symbol = shown.symbol ?? (shown.grade ? GRADE_INFO[shown.grade].symbol : null);
  const isAhead = shown === ahead && reveal === 'learn';
  return (
    <div className={cn('grid content-start gap-2', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-semibold">
          {isAhead ? <span className="mr-1 font-sans font-normal text-muted-foreground">Next:</span> : null}
          {numberedMove(shown.ply, shown.san)}
          {symbol ? <span className={cn(shown.grade && gradeText[shown.grade])}>{symbol}</span> : null}
        </span>
        {shown.name ? <OpeningName {...shown.name} className="text-sm" /> : null}
      </div>
      {shown.comment ? <RichText text={shown.comment} context={context} board={board} side={side} /> : null}
      {shown.ideas || shown.tags?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {shown.ideas}
          {shown.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className={TAG_TONE[tag] ?? 'text-muted-foreground'}>
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
      {marksWhileStudying ? <MarkKey marks={shown.marks} /> : null}
      {reveal === 'study' && more ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2">
              <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
              More about this move
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-lg border p-3">{more}</CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
