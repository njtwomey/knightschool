import { GRADE_INFO, numberedMove, type Grade } from '@knightschool/core';
import { cn } from '@/lib/utils';
import { GRADE_TEXT } from './grade-style';
import { useBoardTarget } from '@/components/board/key-owner';
import { ABOVE_ROW_LINK } from '@/components/shared/card-link';
import { PositionPreview } from './position-preview';

export type MoveChipProps = {
  ply: number;
  san: string;
  /** The position after the move, for the preview. */
  epd?: string;
  /** The move's squares, to light on the preview. */
  from?: string;
  to?: string;
  grade?: Grade;
  /** The learner's own move: bold. */
  mine?: boolean;
  current?: boolean;
  /** Written in a run: the number only where a run needs it. */
  numbered?: 'always' | 'white' | 'never';
  /** Hover shows a small board of the position. */
  preview?: boolean;
  onSelect?: () => void;
  onHover?: (hovering: boolean) => void;
  orientation?: 'white' | 'black';
};

/**
 * One move as a button: every move shown anywhere is one, so it hovers, previews and clicks the same way
 * (docs/v2/components/move-chip.md).
 */
export function MoveChip({
  ply,
  san,
  epd,
  from,
  to,
  grade,
  mine,
  current,
  numbered = 'always',
  preview = true,
  onSelect,
  onHover,
  orientation = 'white',
}: MoveChipProps) {
  // With no action of its own, a move goes to the nearest board (its caption's, else the page's main board): hover
  // draws it there faintly, click shows the position after it (docs/v2/patterns/interactions.md).
  const target = useBoardTarget();
  const squares = from && to ? { from, to } : undefined;
  const select = onSelect ?? (target && epd ? () => target.show(epd, squares) : undefined);
  const hover = (on: boolean) => {
    onHover?.(on);
    if (target && squares) target.light(on ? squares : null);
  };
  const label =
    numbered === 'never' || (numbered === 'white' && ply % 2 === 1)
      ? san
      : numbered === 'white'
        ? `${Math.floor(ply / 2) + 1}.${san}`
        : numberedMove(ply, san);
  const symbol = grade ? GRADE_INFO[grade].symbol : null;
  const chip = (
    <a
      href={select ? '#' : undefined}
      role={select ? 'button' : undefined}
      onClick={(event) => {
        if (!select) return;
        event.preventDefault();
        select();
      }}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      onFocus={() => hover(true)}
      onBlur={() => hover(false)}
      className={cn(
        // Always its own control: above a card's or row's stretched click (card-link.tsx).
        ABOVE_ROW_LINK,
        'inline-flex items-baseline gap-0.5 rounded px-1 py-0.5 font-mono text-sm leading-none no-underline transition-colors',
        'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        select ? 'cursor-pointer' : 'cursor-default',
        mine ? 'font-semibold' : 'font-normal',
        current && 'bg-primary text-primary-foreground hover:bg-primary/90',
      )}
      aria-current={current ? 'step' : undefined}
    >
      {label}
      {symbol ? <span className={cn('font-bold', !current && grade && GRADE_TEXT[grade])}>{symbol}</span> : null}
    </a>
  );
  if (!preview || !epd) return chip;
  return (
    <PositionPreview
      position={{
        epd,
        lastMove: from && to ? { from, to } : undefined,
        orientation,
        caption: <span className="font-mono">After {numberedMove(ply, san)}</span>,
      }}
    >
      {chip}
    </PositionPreview>
  );
}
