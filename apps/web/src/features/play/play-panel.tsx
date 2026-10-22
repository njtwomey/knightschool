import type { Explanation, LineStep, Played } from '@knightschool/core';
import { Target } from 'lucide-react';
import { MoveList, type MoveListMove } from '@/components/move-list';
import { MoveTags } from '@/components/move-tags';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MODES } from './modes';
import { usePlay, type PlayMode } from './store';

/**
 * The card beside the board: what to do now (or what is being explored), the reason for the move about to be played in
 * Learn, how far along the line or unit you are, and the moves so far.
 */
export function PlayPanel({
  mode,
  everyBranch,
  unit,
  instruction,
  explore,
  upcomingNotes,
  upcomingTags,
  steps,
  index,
  firstIndex,
  stepping,
  onDrill,
}: {
  mode: PlayMode;
  everyBranch: boolean;
  /** Playing one unit of the path rather than a whole line. */
  unit: boolean;
  instruction: string;
  /** The moves explored off the line, when there are any. */
  explore: Played[] | null;
  upcomingNotes: Explanation[];
  upcomingTags: string[] | undefined;
  steps: LineStep[];
  index: number;
  firstIndex: number;
  stepping: boolean;
  onDrill: () => void;
}) {
  const exploring = explore !== null && explore.length > 0;
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-xl" aria-live="polite">
            {exploring ? `Exploring: ${explore.map((move) => move.san).join(' ')}` : instruction}
          </CardTitle>
          {mode === 'learn' && !everyBranch && (
            <Button size="sm" onClick={onDrill}>
              <Target aria-hidden /> Drill this {unit ? 'unit' : 'line'}
            </Button>
          )}
        </div>
        <CardDescription>
          {exploring
            ? 'This is off the line. Watch the engine to see what it costs or gains, or click what people play.'
            : mode === 'learn'
              ? [
                  ...upcomingNotes.slice(0, 2).map((note) => <RichText key={note.text} text={`${note.text} `} />),
                  <MoveTags key="tags" tags={upcomingTags} />,
                ]
              : MODES[mode].blurb}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {everyBranch ? (
          <p className="text-xs text-muted-foreground">{index} moves so far. Each run takes a different branch.</p>
        ) : (
          <div className="grid gap-1">
            <Progress
              value={((Math.min(index, steps.length) - firstIndex) / Math.max(1, steps.length - firstIndex)) * 100}
              aria-label={unit ? 'Progress through the unit' : 'Progress through the line'}
            />
            <p className="text-xs text-muted-foreground">
              {Math.min(index, steps.length) - firstIndex} of {steps.length - firstIndex} moves
              {firstIndex > 0 && ', after the moves that lead here'}
            </p>
          </div>
        )}
        <MoveList
          layout="table"
          label="The line"
          empty="No moves yet."
          moves={
            exploring
              ? [
                  ...steps.slice(0, index).map((step, ply): MoveListMove => ({ ply, san: step.edge.san })),
                  ...explore.map((move, i): MoveListMove => ({
                    ply: index + i,
                    san: move.san,
                    state: 'explored',
                  })),
                ]
              : steps.slice(0, stepping ? steps.length : index).map((step, ply): MoveListMove => ({
                  ply,
                  san: step.edge.san,
                  state: ply < index ? 'played' : 'future',
                }))
          }
          current={exploring ? index + explore.length - 1 : index - 1}
          onSelect={stepping ? (ply) => usePlay.getState().goTo(ply + 1) : undefined}
        />
        {mode === 'learn' && !everyBranch && (
          <p className="text-xs text-muted-foreground">
            Right arrow plays the next move, left arrow goes back. Click a move to jump to it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
