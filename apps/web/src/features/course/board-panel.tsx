import type { OpeningContent } from '@knightschool/core';
import { useLineStepper } from '@/components/board/line-stepper';
import { arrowsOf, squareStylesOf } from '@/components/board/shapes';
import { StudyBoard } from '@/components/board/study-board';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { currentEpd, useCatalog } from '@/data/catalog-store';

/**
 * The board on the course page for exploring: step through the line shown (the buttons or the arrow keys), or play a
 * move to see if the course has it. The engine's score sits beside it and its best line under it.
 */
export function BoardPanel({ content }: { content: OpeningContent }) {
  const { path, line, notice, tryMove, setPath } = useCatalog();
  const epd = currentEpd(content, path);
  const last = path.at(-1);
  const stepper = useLineStepper({
    length: line.length,
    index: path.length,
    setIndex: (index) => setPath(line.slice(0, index)),
    label: 'Move through the line',
  });

  return (
    <StudyBoard
      id="explore"
      previewable
      epd={epd}
      orientation={content.opening.side}
      lastMove={last?.uci}
      arrows={arrowsOf(last?.annotation)}
      squareStyles={squareStylesOf(undefined, last?.annotation)}
      onMove={tryMove}
      stepper={stepper}
      controls={{ flip: true, evalBar: true }}
      engine={{
        view: 'strip',
        before: path.length > 1 ? path[path.length - 2]!.to : content.opening.rootEpd,
        lastMove: last,
      }}
      below={
        notice && (
          <Alert role="status">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )
      }
    />
  );
}
