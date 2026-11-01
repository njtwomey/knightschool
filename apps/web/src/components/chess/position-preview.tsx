import type { ReactNode } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export type PreviewPosition = {
  epd: string;
  lastMove?: { from: string; to: string };
  orientation?: 'white' | 'black';
  /** A line under the board: "After 4.c3", the opening's name. */
  caption?: ReactNode;
};

/**
 * The one hover preview of a position: a small board with a caption, opened from any move, card, link or pill
 * (docs/v2/components/position-preview.md). Wrap the trigger; it must accept a ref (a link, a button, a span).
 */
export function PositionPreview({
  position,
  children,
  side = 'top',
}: {
  position: PreviewPosition | null | undefined;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  if (!position) return <>{children}</>;
  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-auto p-2" side={side}>
        <BoardThumb
          epd={position.epd}
          lastMove={position.lastMove}
          orientation={position.orientation}
          className="w-48"
        />
        {position.caption ? (
          <div className="mt-1.5 max-w-48 text-center text-xs text-muted-foreground">{position.caption}</div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
