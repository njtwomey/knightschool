import { numberedMove, toggleArrow, toggleCircle, uciLine, type MarkColour } from '@knightschool/core';
import { Camera, GitBranch, Scissors, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLineStepper } from '@/components/board/line-stepper';
import { StudyBoard } from '@/components/board/study-board';
import { MoveList } from '@/components/move-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { navigate } from '@/router/location';
import { draftChapter, fullLine, positionsOf, type DraftCourse } from './draft';
import { LineDetails } from './line-details';
import { markColourFor } from './mark-colour';
import { MoveMarks } from './move-marks';
import { MoveNote } from './move-note';
import { useAuthor } from './store';
import { lineEditHref } from '@/router/hrefs';

/**
 * One line: its details, the board to play it on, its moves (yours to change are the ones after where it starts), and
 * the note on the move looked at. Play at the end of the line to add moves; choose Branch at any position to start a
 * new line from there.
 */
export function LineEditor({ course }: { course: DraftCourse }) {
  const { build, rows, lineId, ply, branching } = useAuthor();
  const line = fullLine(build, lineId);
  const own = lineId ? draftChapter(rows, lineId) : undefined;
  const positions = useMemo(() => positionsOf(line), [line]);
  const ucis = useMemo(() => uciLine(line), [line]);
  // Drawing marks: the colour picked, tapping squares instead of the right button, and where a tapped arrow starts.
  const [colour, setColour] = useState<MarkColour>('G');
  const [tapping, setTapping] = useState(false);
  const [tapFrom, setTapFrom] = useState<{ ply: number; square: string } | null>(null);

  // The steps and the arrow keys walk the line; a move played at the end adds to it.
  const stepper = useLineStepper({
    length: line?.game.moves.length ?? 0,
    index: ply,
    setIndex: (index) => useAuthor.getState().setPly(index),
    keys: Boolean(line),
  });

  if (!lineId)
    return <p className="text-sm text-muted-foreground">This course has no lines yet. Add one on the left.</p>;
  if (!line)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          This line cannot be shown: see what is wrong above. Undo the last change, or delete the line.
        </AlertDescription>
      </Alert>
    );

  const moves = line.game.moves;
  const length = moves.length;
  const at = branching ?? ply;
  const snapshot = own?.tags.Snapshot !== undefined ? Number(own.tags.Snapshot) : undefined;
  const mine = Boolean(own);
  // A comment the tree has from another chapter, on a move this line plays without one of its own.
  const edge = ply > 0 ? build?.tree.edges.get(`${positions[ply - 1]} ${ucis[ply - 1]}`) : undefined;
  const ownMove = own?.moves[ply - 1 - line.startPly];
  const explainedElsewhere = Boolean(
    edge?.note.comment && edge.writtenIn.some((chapter) => chapter !== lineId) && !ownMove?.comment,
  );
  const side = course.manifest.side;
  // Marks belong to the move looked at, and only to a move this line writes.
  const canMark = mine && branching === null && ply > 0 && ply - 1 >= line.startPly;
  const ownMarks = { arrows: ownMove?.arrows ?? [], circles: ownMove?.circles ?? [] };
  const draw = (from: string, to: string | undefined, drawn: MarkColour) =>
    void useAuthor
      .getState()
      .setMarks(to ? toggleArrow(ownMarks, drawn, from, to) : toggleCircle(ownMarks, drawn, from));
  const tapStart = tapFrom?.ply === ply ? tapFrom.square : null;

  return (
    <div className="grid gap-4">
      <LineDetails course={course} />
      <div className="board-columns grid gap-4">
        <StudyBoard
          id="author"
          epd={positions[at]!}
          orientation={side}
          interactive={!(tapping && canMark)}
          // The marks of every line that plays this move; this line's own are the ones drawing changes.
          marks={branching === null && edge ? edge.note : undefined}
          onDrawMark={canMark ? (from, to, keys) => draw(from, to, markColourFor(colour, keys)) : undefined}
          onSquareSelect={
            tapping && canMark
              ? (square) => {
                  if (tapStart === null) return setTapFrom({ ply, square });
                  setTapFrom(null);
                  draw(tapStart, tapStart === square ? undefined : square, colour);
                }
              : undefined
          }
          squareStyles={tapStart ? { [tapStart]: { backgroundColor: 'var(--board-highlight)' } } : undefined}
          onMove={(uci) => {
            // A branch opens a new line: the address follows it.
            void useAuthor
              .getState()
              .playMove(uci)
              .then(() => {
                const opened = useAuthor.getState().lineId;
                if (opened && opened !== lineId) navigate(lineEditHref(course.id, opened));
              });
            return true;
          }}
          lastMove={at > 0 ? ucis[at - 1] : undefined}
          stepper={stepper}
          controls={{ flip: true }}
          actions={
            <>
              {branching === null ? (
                <Button
                  variant="outline"
                  onClick={() => useAuthor.getState().startBranch()}
                  title="Start a new line from this position"
                >
                  <GitBranch aria-hidden /> Branch here
                </Button>
              ) : (
                <Button variant="outline" onClick={() => useAuthor.getState().cancelBranch()}>
                  <X aria-hidden /> Cancel the branch
                </Button>
              )}
              {mine && ply >= line.startPly && (
                <Button
                  variant="outline"
                  onClick={() => void useAuthor.getState().setSnapshot(ply === length ? undefined : ply)}
                  title="Use this position as the line's picture"
                >
                  <Camera aria-hidden /> Picture the line here
                </Button>
              )}
              {mine && ply < length && ply >= line.startPly && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <Scissors aria-hidden /> Delete the moves after this
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete the last {length - ply} moves of this line?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Their notes go with them, and any line that branches from them will no longer fit. Undo brings
                        them back.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep them</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void useAuthor.getState().truncate()}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          }
          caption={
            <p className="text-muted-foreground" aria-live="polite">
              {branching !== null
                ? `Play the first move of the new line, after ${branching === 0 ? 'the start' : numberedMove(branching - 1, moves[branching - 1]!.san)}.`
                : ply === length
                  ? mine
                    ? 'Play a move on the board to add it to the line.'
                    : 'This line is not yours: branch from it to write your own.'
                  : 'Play the next move, or step with the arrows. Choose Branch here to play a different move.'}
            </p>
          }
        />

        <div className="grid content-start gap-4">
          <div className="text-sm">
            <MoveList
              layout="inline"
              label="The line"
              empty="No moves yet."
              moves={moves.map((move, i) => ({
                ply: i,
                san: move.san,
                // The moves before the line starts are its parent's.
                state: i < line.startPly ? 'lead' : 'played',
                tags: move.tags,
                mark: i + 1 === (snapshot ?? length) ? 'The line is pictured here' : undefined,
              }))}
              current={ply - 1}
              onSelect={(at) => useAuthor.getState().setPly(at + 1)}
            />
          </div>
          {ply > 0 && (
            <MoveNote
              key={`${lineId}:${ply}`}
              label={numberedMove(ply - 1, moves[ply - 1]!.san)}
              comment={moves[ply - 1]!.comment ?? ''}
              tags={moves[ply - 1]!.tags ?? []}
              editable={mine && ply - 1 >= line.startPly}
              owner={line.parents.at(-1)}
              fixed={explainedElsewhere}
            />
          )}
          {canMark && (
            <MoveMarks
              label={numberedMove(ply - 1, moves[ply - 1]!.san)}
              marks={ownMarks}
              colour={colour}
              onColour={setColour}
              tapping={tapping}
              onTapping={(on) => {
                setTapping(on);
                setTapFrom(null);
              }}
              onClear={() => void useAuthor.getState().setMarks({ arrows: [], circles: [] })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
