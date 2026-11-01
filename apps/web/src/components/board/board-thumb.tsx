import { BoardSurface, type BoardSurfaceProps } from './board-surface';
import { cn } from '@/lib/utils';

/** A small still board for cards, lists and previews: no controls, no coordinates, marks only (docs/v2/components/board-thumb.md). */
export function BoardThumb({ className, ...props }: Omit<BoardSurfaceProps, 'interactive' | 'onMove'>) {
  return <BoardSurface notation={false} {...props} className={cn('w-40 shadow-none', className)} />;
}
