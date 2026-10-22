import { numberedMove, type MoveNode, type Side } from '@knightschool/core';
import { BookOpen, Target } from 'lucide-react';
import type { LineStepper } from '@/components/board/line-stepper';
import { StudyBoard } from '@/components/board/study-board';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { lineHref } from '@/router/hrefs';
import { to } from '@/router/location';
import type { ExplorerLine } from './tree-index';
import { useMoveComment } from './use-move-comment';

/**
 * The explorer's board: the move shown, its comment, the lines through it, and the picked line with Learn, Drill and
 * About.
 */
export function TreeBoard({
  shown,
  parentEpd,
  through,
  total,
  byId,
  name,
  pickedLine,
  orientation,
  stepper,
}: {
  shown: MoveNode;
  parentEpd: string | undefined;
  /** The lines listed in the explorer that pass through the move shown. */
  through: string[];
  /** How many lines the explorer lists. */
  total: number;
  byId: ReadonlyMap<string, ExplorerLine>;
  name: (line: ExplorerLine) => string;
  pickedLine: ExplorerLine | undefined;
  orientation: Side;
  stepper: LineStepper;
}) {
  const comment = useMoveComment([...new Set(through.map((id) => byId.get(id)!.course))], parentEpd, shown.uci);
  return (
    <aside className="order-1 grid content-start gap-2 lg:sticky lg:top-20 lg:order-none">
      <StudyBoard
        id="tree-board"
        previewable
        size="aside"
        className="justify-self-center lg:justify-self-stretch"
        epd={shown.epd}
        orientation={orientation}
        interactive={false}
        lastMove={shown.uci ?? undefined}
        stepper={stepper}
        controls={{ flip: true }}
        caption={
          <p className="font-medium">{shown.san ? `After ${numberedMove(shown.ply - 1, shown.san)}` : 'The start'}</p>
        }
      />
      {comment && (
        <p className="text-sm text-muted-foreground">
          <RichText text={comment} />
        </p>
      )}
      {through.length > 0 && through.length < total && (
        <p className="text-xs text-muted-foreground">
          {through.length > 4
            ? `${through.length} lines pass through here.`
            : `In ${through.map((id) => name(byId.get(id)!)).join(', ')}.`}
        </p>
      )}
      {pickedLine && (
        <div className="grid gap-2 pt-1">
          <p className="text-sm">{pickedLine.name}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={to(lineHref(pickedLine.course, pickedLine.id, 'learn'))}>
                <BookOpen aria-hidden /> Learn
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={to(lineHref(pickedLine.course, pickedLine.id, 'drill'))}>
                <Target aria-hidden /> Drill
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={to(lineHref(pickedLine.course, pickedLine.id, 'about'))}>About</a>
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
