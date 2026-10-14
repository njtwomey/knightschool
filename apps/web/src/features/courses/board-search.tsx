import { playUci, searchAt, type OpeningIndexEntry, type SearchIndex, type ResultKind } from '@knightschool/core';
import { FlipHorizontal2, RotateCcw, Undo2 } from 'lucide-react';
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
  const epd = queryEpd(query);
  const here = index ? searchAt(index, epd, query.kind) : undefined;

  function play(uci: string): boolean {
    try {
      const move = playUci(epd, uci);
      onQueryChange({ ...query, played: [...query.played, { uci, san: move.san, epd: move.epd }] });
      setNotice(
        index && !searchAt(index, move.epd, query.kind)
          ? `No course reaches ${move.san} from here. Undo to go back.`
          : null,
      );
      return true;
    } catch {
      return false;
    }
  }

  const number =
    query.played.length % 2 === 0 ? `${query.played.length / 2 + 1}.` : `${Math.ceil(query.played.length / 2)}...`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(92dvh,44rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Find by playing moves</DialogTitle>
          <DialogDescription>
            Play an opening on the board. The courses that cover it stay in the list.
          </DialogDescription>
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
              <Button
                variant="outline"
                size="icon"
                aria-label="Undo the last move"
                disabled={query.played.length === 0}
                onClick={() => (onQueryChange({ ...query, played: query.played.slice(0, -1) }), setNotice(null))}
              >
                <Undo2 aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Start again"
                disabled={query.played.length === 0}
                onClick={() => (onQueryChange({ ...query, played: [] }), setNotice(null))}
              >
                <RotateCcw aria-hidden />
              </Button>
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
                      {number} {move.san}
                      <span className="font-sans text-xs font-normal text-muted-foreground">
                        {move.courses.length} {move.courses.length === 1 ? 'course' : 'courses'}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {here && here.courses.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Courses that cover this
                </p>
                <ul className="-mx-2 grid gap-0.5 text-sm">
                  {here.courses.map((id) => {
                    const course = courses.find((candidate) => candidate.id === id);
                    const lines = new Set(here.lines.filter((line) => line.course === id).map((line) => line.line))
                      .size;
                    // Straight to the course, with the moves played here already on its board.
                    const href =
                      to(`/course/${id}`) + buildHash({ m: encodeMoves(query.played.map((move) => move.uci)) });
                    return (
                      <li key={id}>
                        <a
                          href={href}
                          className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          <span className="font-medium">{course?.name ?? id}</span>
                          <span className="text-xs text-muted-foreground">
                            {lines} {lines === 1 ? 'line' : 'lines'} · open
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {here && here.moves.length === 0 && (
              <p className="text-sm text-muted-foreground">The lines end here. Undo to try another move.</p>
            )}
            {!here && query.played.length > 0 && !notice && (
              <p className="text-sm text-muted-foreground">No course reaches this position.</p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground" role="status">
            {matches} {matches === 1 ? 'course matches' : 'courses match'}
          </p>
          <DialogClose asChild>
            <Button>Show {matches === 1 ? 'the course' : `${matches} courses`}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
