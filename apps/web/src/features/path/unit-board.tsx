import { numberedMove, pathFromUcis, positionsAlong, type CourseUnit, type OpeningContent } from '@knightschool/core';
import { useMemo, useState } from 'react';
import { useLineStepper } from '@/components/board/line-stepper';
import { StudyBoard } from '@/components/board/study-board';

/**
 * The board beside the path: the picked unit's first stretch, at its end to begin with, to step back through. Keyed by
 * the unit, so picking another starts at its end again.
 */
export function UnitBoard({ content, unit }: { content: OpeningContent; unit: CourseUnit }) {
  const path = useMemo(() => pathFromUcis(content, unit.stretches[0]!.moves), [content, unit]);
  const positions = useMemo(() => positionsAlong(content, path), [content, path]);
  const [index, setIndex] = useState(path.length);
  const stepper = useLineStepper({ length: path.length, index, setIndex });
  const last = path[index - 1];
  return (
    <StudyBoard
      id="path-board"
      size="aside"
      epd={positions[index]!}
      orientation={content.opening.side}
      interactive={false}
      lastMove={last?.uci}
      stepper={stepper}
      controls={{ flip: true }}
      caption={
        <p>
          <span className="font-medium">Unit {unit.index + 1}</span>{' '}
          <span className="text-muted-foreground">
            {index === path.length
              ? `ends here${unit.side ? ' (its first branch)' : ''}.`
              : last
                ? `after ${numberedMove(index - 1, last.san)}.`
                : 'from the start.'}
          </span>
        </p>
      }
    />
  );
}
