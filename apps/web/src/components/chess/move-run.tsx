import { MoveChip } from './move-chip';

export type RunMove = { san: string; uci: string; after: string };

/** A run of moves inline, "1. e4 e5 2. Nf3", made of move chips. */
export function MoveRun({
  moves,
  firstPly = 0,
  side,
  current,
  onSelect,
  orientation,
}: {
  moves: RunMove[];
  firstPly?: number;
  /** The learner's side, whose moves are bold. */
  side?: 'white' | 'black';
  current?: number;
  onSelect?: (index: number) => void;
  orientation?: 'white' | 'black';
}) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-0.5 gap-y-1">
      {moves.map((move, i) => {
        const ply = firstPly + i;
        return (
          <MoveChip
            key={`${ply}-${move.uci}`}
            ply={ply}
            san={move.san}
            epd={move.after}
            from={move.uci.slice(0, 2)}
            to={move.uci.slice(2, 4)}
            mine={side ? (ply % 2 === 0) === (side === 'white') : false}
            numbered={i === 0 ? 'always' : 'white'}
            current={current === i}
            onSelect={onSelect ? () => onSelect(i) : undefined}
            orientation={orientation}
          />
        );
      })}
    </span>
  );
}
