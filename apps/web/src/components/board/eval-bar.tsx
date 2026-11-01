import { evalWords, whiteShare, type Score } from '@knightschool/core';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';

/**
 * The evaluation as a bar: White's share is its winning chance, so the bar and the grades agree. Flips with the board.
 */
export function EvalBar({
  score,
  orientation = 'white',
  className,
}: {
  score: Score | null;
  orientation?: 'white' | 'black';
  className?: string;
}) {
  const share = score ? whiteShare(score) : 0.5;
  const words = score ? evalWords(score, siteConfig.judge.evalWords) : null;
  const white = `${share * 100}%`;
  return (
    <div
      className={cn('relative w-3 overflow-hidden bg-eval-black ring-1 ring-border', className)}
      role="img"
      aria-label={words ? `${words.words}, ${words.number}` : 'No evaluation yet'}
      title={words ? `${words.words} (${words.number})` : undefined}
    >
      <div
        className={cn(
          'absolute inset-x-0 bg-eval-white transition-[height] duration-500',
          orientation === 'white' ? 'bottom-0' : 'top-0',
        )}
        style={{ height: white }}
      />
    </div>
  );
}
