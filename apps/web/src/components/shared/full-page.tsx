import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrailSlot } from './trail-slot';

/**
 * A page that uses the whole screen under the header (docs/v2/patterns/layout.md): edge to edge, as tall as the window,
 * never scrolling itself; its panels scroll inside. For computers: the map, and anything else that needs the room. The
 * trail goes above; `children` fill what is left.
 */
export function FullPage({
  trail,
  children,
  className,
}: {
  trail?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn('flex h-[calc(100dvh-3.5625rem)] w-full flex-col gap-2 overflow-hidden px-4 py-2', className)}>
      {/* The whole window is the page here, so the trail stays in it rather than in the floating bar. */}
      <TrailSlot.Provider value={null}>{trail}</TrailSlot.Provider>
      <div className="min-h-0 flex-1">{children}</div>
    </main>
  );
}
