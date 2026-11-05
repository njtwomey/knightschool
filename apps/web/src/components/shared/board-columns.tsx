import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A page with a board and a panel (docs/v2/patterns/layout.md, `.board-columns`): one column on a phone, side by side
 * from lg. The board column stays in view as the panel scrolls (sticky under the header and the floating trail, aligned to its own height so
 * it has room to stick), so whatever the panel points at is always visible on the board.
 */
export function BoardColumns({
  board,
  children,
  side = 'left',
  fit,
  className,
}: {
  /** The board and what sits right under it (controls, caption, the actions for it). */
  board: ReactNode;
  /** The panel: everything that scrolls beside the board. */
  children: ReactNode;
  /** Which side the board takes from lg; on a phone it always comes first. */
  side?: 'left' | 'right';
  /**
   * From lg, the panel is as tall as the board column and never makes the page longer: its children stack in a column,
   * and the one that should scroll takes the room left (`min-h-0 flex-1 overflow-y-auto`), so what it points at stays
   * level with the board. On a phone it is in the page's flow as usual.
   */
  fit?: boolean;
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
          'grid content-start gap-3 self-start lg:sticky lg:top-28 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto',
          side === 'right' && 'lg:order-last',
        )}
      >
        {board}
      </div>
      {fit ? (
        <div className="relative min-w-0 lg:self-stretch">
          <div className="grid min-w-0 content-start gap-4 lg:absolute lg:inset-0 lg:flex lg:flex-col">{children}</div>
        </div>
      ) : (
        <div className="grid min-w-0 content-start gap-4">{children}</div>
      )}
    </div>
  );
}
