import type { RatingName } from '@knightschool/core';
import { RotateCcw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlay, type PlayMode } from './store';

/** The end of a line or unit: how it went, and what to do next. */
export function CompleteCard({
  mode,
  results,
  unit,
  everyBranch,
  next,
  backHref,
  onDrill,
}: {
  mode: PlayMode;
  results: { rating: RatingName }[];
  /** Playing one unit of the path rather than a whole line. */
  unit: boolean;
  everyBranch: boolean;
  /** The course's next line, offered when a whole line is done. */
  next: { name: string; href: string } | undefined;
  /** The path (for a unit) or the course. */
  backHref: string;
  onDrill: () => void;
}) {
  const count = (...ratings: RatingName[]) => results.filter((result) => ratings.includes(result.rating)).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {results.length === 0
            ? `You have played through the ${unit ? 'unit' : 'line'}.`
            : `${count('easy', 'good')} of ${results.length} moves right first time`}
        </CardTitle>
        <CardDescription>
          {results.length > 0 && mode !== 'learn' && `${count('hard')} with help, ${count('again')} to see again. `}
          {mode === 'learn' ? 'The moves are now in your quiz.' : 'Your answers are saved and scheduled for the quiz.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {mode === 'learn' ? (
          <Button onClick={onDrill}>
            <Target aria-hidden /> Now drill it
          </Button>
        ) : (
          <Button onClick={() => usePlay.getState().restart()}>
            <RotateCcw aria-hidden /> {everyBranch ? 'Another branch' : 'Drill again'}
          </Button>
        )}
        {next && (
          <Button asChild variant="outline">
            <a href={next.href}>Next: {next.name}</a>
          </Button>
        )}
        <Button asChild variant="ghost">
          <a href={backHref}>Back to the {unit ? 'path' : 'course'}</a>
        </Button>
      </CardContent>
    </Card>
  );
}
