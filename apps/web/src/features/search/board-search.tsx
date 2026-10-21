import {
  numberedMove,
  type OpeningIndexEntry,
  playUci,
  type ResultKind,
  searchAt,
  type SearchIndex,
} from '@knightschool/core';
import { FlipHorizontal2 } from 'lucide-react';
import { StepButtons } from '@/components/board/step-buttons';
import { useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { buildHash, encodeMoves } from '@/router/hash';
import { to } from '@/router/location';
import { movesText, queryEpd, type BoardQuery } from './board-query';
import { courseHref, lineHref } from '@/router/hrefs';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: BoardQuery;
  onQueryChange: (query: BoardQuery) => void;
  index: SearchIndex | null;
  courses: OpeningIndexEntry[];
  /** How many courses the current position matches, for the button. */
  matches: number;
  failed: string | null;
};

/**
 * Search by playing moves: the board is the search field. Every position shows which moves the courses make from
 * there; the course list behind this window narrows to match, and stays narrowed when it is closed.
 */
export function BoardSearchDialog({
  open,
  onOpenChange,
  query,
  onQueryChange,
  index,
  courses,
  matches,
  failed,
}: Props) {
  const [side, setSide] = useState<'white' | 'black'>('white');
  const [notice, setNotice] = useState<string | null>(null);
  // Moves stepped back over, nearest first, so forward and last can play them again until a different move is played.
  const [ahead, setAhead] = useState<Props['query']['played']>([]);
  const step = (played: Props['query']['played'], next: Props['query']['played']) => {
    onQueryChange({ ...query, played });
    setAhead(next);
    setNotice(null);
  };
  const epd = queryEpd(query);
  const here = index ? searchAt(index, epd, query.kind) : undefined;
  const name = index?.[epd]?.name;
  // Every line through this position, by its own name, with the course it is in: the line is the answer here.
  const lines = (here?.lines ?? []).flatMap((hit, i, all) => {
    if (all.findIndex((other) => other.course === hit.course && other.line === hit.line) !== i) return [];
    const course = courses.find((candidate) => candidate.id === hit.course);
    const line = course?.lines.find((candidate) => candidate.id === hit.line);
    return course && line ? [{ course, line, ends: hit.next === null }] : [];
  });
  // Lines before traps, and each course's lines in its teaching order.
  const rank = ({ course, line }: (typeof lines)[number]) =>
    (line.kind === 'refutation' ? 1e6 : 0) + courses.indexOf(course) * 1e3 + course.lines.indexOf(line);
  lines.sort((a, b) => rank(a) - rank(b));

  function play(uci: string): boolean {
    try {
      const move = playUci(epd, uci);
      onQueryChange({ ...query, played: [...query.played, { uci, san: move.san, epd: move.epd }] });
      setAhead(ahead[0]?.uci === uci ? ahead.slice(1) : []);
      setNotice(
        index && !searchAt(index, move.epd, query.kind)
          ? `No course reaches ${move.san} from here. Step back to go back.`
          : null,
      );
      return true;
    } catch {
      return false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(92dvh,44rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Find by playing moves</DialogTitle>
          <DialogDescription>Play an opening on the board to see the lines that go through it.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-5 overflow-y-auto md:grid-cols-[minmax(0,22rem)_1fr] md:overflow-hidden">
          <div className="grid content-start gap-3">
            <AppBoard
              id="board-search"
              className="aspect-square w-full"
              epd={epd}
              orientation={side}
              onMove={play}
              lastMove={query.played.at(-1)?.uci}
              arrows={(here?.moves ?? []).slice(0, 4).map((move) => ({
                startSquare: move.uci.slice(0, 2),
                endSquare: move.uci.slice(2, 4),
                color: 'rgb(21 128 61 / 0.55)',
              }))}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <StepButtons
                label="Step through the moves played"
                onFirst={() => step([], [...query.played, ...ahead])}
                onPrev={() => step(query.played.slice(0, -1), [query.played.at(-1)!, ...ahead])}
                onNext={() => step([...query.played, ahead[0]!], ahead.slice(1))}
                onLast={() => step([...query.played, ...ahead], [])}
                atStart={query.played.length === 0}
                atEnd={ahead.length === 0}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Flip the board"
                onClick={() => setSide(side === 'white' ? 'black' : 'white')}
              >
                <FlipHorizontal2 aria-hidden />
              </Button>
              <p className="ml-1 min-h-5 flex-1 font-mono text-sm text-muted-foreground">
                {movesText(query.played) || 'No moves yet'}
              </p>
            </div>
          </div>

          <div className="grid min-h-0 content-start gap-4 md:overflow-y-auto md:pr-1">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={query.kind}
              onValueChange={(value) => value && onQueryChange({ ...query, kind: value as ResultKind })}
              aria-label="What to find"
              className="justify-self-start"
            >
              <ToggleGroupItem value="both">Lines and traps</ToggleGroupItem>
              <ToggleGroupItem value="lines">Lines</ToggleGroupItem>
              <ToggleGroupItem value="refutations">Traps</ToggleGroupItem>
            </ToggleGroup>

            {failed && (
              <Alert variant="destructive">
                <AlertDescription>Board search is unavailable: {failed}</AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert role="status">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            {name && query.played.length > 0 && (
              <p className="text-lg font-semibold leading-tight" role="status">
                {name}
              </p>
            )}
            {here && here.moves.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Moves in the courses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {here.moves.map((move) => (
                    <Button
                      key={move.uci}
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1.5 font-mono"
                      onClick={() => play(move.uci)}
                    >
                      {numberedMove(query.played.length, move.san)}
                      <span className="font-sans text-xs font-normal text-muted-foreground">
                        {move.lines} {move.lines === 1 ? 'line' : 'lines'}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {lines.length > 0 && query.played.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {lines.length} {lines.length === 1 ? 'line goes' : 'lines go'} through here
                </p>
                <ul className="-mx-2 grid gap-0.5 text-sm">
                  {lines.map(({ course, line, ends }) => (
                    <li key={`${course.id}/${line.id}`}>
                      <a
                        href={to(lineHref(course.id, line.id))}
                        className="grid gap-0.5 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <span className="font-medium">
                          {line.name}
                          {line.kind === 'refutation' && (
                            <span className="font-normal text-muted-foreground"> (trap)</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {course.name}
                          {ends ? ' · ends here' : ''}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <a
                  href={
                    to(courseHref(lines[0]!.course.id)) +
                    buildHash({ m: encodeMoves(query.played.map((move) => move.uci)) })
                  }
                  className="justify-self-start px-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Open {lines[0]!.course.name} at this position
                </a>
              </div>
            )}
            {here && here.moves.length === 0 && (
              <p className="text-sm text-muted-foreground">The lines end here. Step back to try another move.</p>
            )}
            {!here && query.played.length > 0 && !notice && (
              <p className="text-sm text-muted-foreground">No course reaches this position.</p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground" role="status">
            {query.played.length > 0
              ? `${lines.length} ${lines.length === 1 ? 'line' : 'lines'} in ${matches} ${matches === 1 ? 'course' : 'courses'}`
              : `${matches} courses`}
          </p>
          <DialogClose asChild>
            <Button>{query.played.length > 0 && lines.length > 0 ? 'Show these lines' : 'Show the courses'}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
