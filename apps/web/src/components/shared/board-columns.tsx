import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A page with a board and a panel (docs/v2/patterns/layout.md, `.board-columns`): one column on a phone, side by side
 * from lg. The board column stays in view as the panel scrolls (sticky under the header, aligned to its own height so
 * it has room to stick), so whatever the panel points at is always visible on the board.
 */
export function BoardColumns({
  board,
  children,
  side = 'left',
  className,
}: {
  /** The board and what sits right under it (controls, caption, the actions for it). */
  board: ReactNode;
  /** The panel: everything that scrolls beside the board. */
  children: ReactNode;
  /** Which side the board takes from lg; on a phone it always comes first. */
  side?: 'left' | 'right';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-6',
        side === 'left'
          ? 'lg:grid-cols-[minmax(0,var(--board-column,34rem))_minmax(0,1fr)]'
          : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,var(--board-column,28rem))]',
        className,
      )}
    >
      <div
        className={cn(
          'grid content-start gap-3 self-start lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto',
          side === 'right' && 'lg:order-last',
        )}
      >
        {board}
      </div>
      <div className="grid min-w-0 content-start gap-4">{children}</div>
    </div>
  );
}
