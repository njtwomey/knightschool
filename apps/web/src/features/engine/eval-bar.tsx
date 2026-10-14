import { formatScore, whiteShare } from '@knightschool/engine';
import { useEngine } from './store';

/** A thin bar beside the board: the lighter part is White's share of the advantage. */
export function EvalBar({ orientation }: { orientation: 'white' | 'black' }) {
  const current = useEngine((state) => state.current);
  const status = useEngine((state) => state.status);
  if (status !== 'ready') return null;

  const best = current?.lines[0];
  const share = best ? whiteShare(best) : 0.5;
  const label = best ? formatScore(best) : '…';
  // White's part sits at the bottom when White is at the bottom of the board.
  const whiteAtBottom = orientation === 'white';
  return (
    <div
      className="relative flex w-8 shrink-0 flex-col overflow-hidden rounded-sm border bg-neutral-800"
      role="img"
      aria-label={`Engine score ${label}`}
      title={label}
    >
      <div
        className={`absolute inset-x-0 bg-neutral-100 transition-[height] duration-300 ${whiteAtBottom ? 'bottom-0' : 'top-0'}`}
        style={{ height: `${share * 100}%` }}
      />
      <span
        className={`absolute inset-x-0 text-center text-[10px] font-medium leading-none ${share >= 0.5 ? 'text-neutral-900' : 'text-neutral-100'} ${share >= 0.5 === whiteAtBottom ? 'bottom-1' : 'top-1'}`}
      >
        {label}
      </span>
    </div>
  );
}
