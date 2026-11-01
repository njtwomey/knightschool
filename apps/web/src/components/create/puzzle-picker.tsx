import { fenToEpd, playMove, replay, sideToMove } from '@knightschool/core';
import { ArrowDown, ArrowUp, Puzzle, X } from 'lucide-react';
import { useState } from 'react';
import { Board, type BoardPosition } from '@/components/board/board';
import { type BoardBadge } from '@/components/board/board-surface';
import type { Idea } from '@/components/chess/idea-badge';
import { FilterToggle, type FilterOption } from '@/components/finding/filter-toggle';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Hint } from '@/components/shared/hint';
import { IconAction } from '@/components/shared/icon-action';
import { siteConfig } from '@/data/site-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';

export type MatchLevel = 'through' | 'after' | 'variation' | 'family' | 'structure' | 'idea';
const MATCH_LEVEL_NAME: Record<MatchLevel, string> = {
  through: 'Through the position',
  after: 'After the line',
  variation: 'Named variation',
  family: 'Opening family',
  structure: 'Same structure',
  idea: 'Same idea',
};
const LEVELS = siteConfig.puzzles.levels as MatchLevel[];

const SOON_PLIES = 10;
const LEVEL_OPTIONS: FilterOption<MatchLevel | 'any'>[] = [
  ...LEVELS.map((level) => ({ value: level, label: MATCH_LEVEL_NAME[level] })),
  { value: 'any', label: 'Any level' },
];
const SOLVER_OPTIONS: FilterOption<'you' | 'them' | 'either'>[] = [
  { value: 'you', label: 'You', hint: 'The opening’s side solves' },
  { value: 'them', label: 'Them', hint: 'The other side solves: what they threaten' },
  { value: 'either', label: 'Either' },
];
const SOON_OPTIONS: FilterOption<'soon' | 'later' | 'any'>[] = [
  { value: 'soon', label: `Within ${SOON_PLIES} plies` },
  { value: 'later', label: 'Later' },
  { value: 'any', label: 'Any' },
];

/** A Lichess puzzle matched to the target's positions. */
export type PuzzleMatch = {
  id: string;
  /** Lichess's FEN: the position before the opponent's first move. */
  fen: string;
  /** The opponent's move, then the solution, as UCI. */
  moves: string[];
  rating: number;
  themes: string[];
  level: MatchLevel;
  /** Who solves: the opening's side (`you`) or the other (`them`). */
  solver: 'you' | 'them';
  /** Plies from the matched position to the puzzle. */
  plies: number;
  /** How it matched: "game passed through after 5.d4, 14 plies later". */
  how: string;
  url: string;
  /** Another step of the opening already uses it ("step 2"). */
  usedIn?: string;
};

export type PuzzleFilters = {
  level: MatchLevel | 'any';
  solver: 'you' | 'them' | 'either';
  soon: 'soon' | 'later' | 'any';
  rating: [number, number];
  themes: string[];
};

export type PuzzlePickerProps = {
  /** What the puzzles are for: "step 4", "the checkpoint". */
  targetName: string;
  matches: PuzzleMatch[];
  /** The chosen puzzle ids, in order. */
  chosen: string[];
  /** Three for a step, ten for a checkpoint. */
  max: number;
  /** The filters for the moment, from puzzles.md's table. */
  defaults: PuzzleFilters;
  /** Saves one undoable action ("choose puzzle 0Xa3b for step 4"). */
  onChange: (chosen: string[], label: string) => void;
  /** Our ideas by the Lichess theme they match, so those themes show as idea badges. */
  ideas?: Record<string, Idea>;
};

const { minRating, maxRating } = siteConfig.puzzles.select;

/** The puzzle as it is shown: after the opponent's first move, from the solver's side. */
function startOf(match: PuzzleMatch) {
  const first = playMove(fenToEpd(match.fen), match.moves[0]!);
  const epd = first?.epd ?? fenToEpd(match.fen);
  return { epd, lastMove: first ? { from: first.from, to: first.to } : undefined, side: sideToMove(epd) };
}

function TryIt({ match, onClose }: { match: PuzzleMatch; onClose: () => void }) {
  const played = replay(fenToEpd(match.fen), match.moves);
  const [done, setDone] = useState(1);
  const [badge, setBadge] = useState<BoardBadge | undefined>();
  const positions: BoardPosition[] = [
    { epd: fenToEpd(match.fen) },
    ...played.map((move) => ({ epd: move.epd, lastMove: { from: move.from, to: move.to } })),
  ].slice(0, done + 1);
  const solved = done >= played.length;
  const side = startOf(match).side;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Puzzle {match.id}</DialogTitle>
          <DialogDescription>
            Rated {match.rating}. {solved ? 'Solved.' : `${side === 'white' ? 'White' : 'Black'} to play and win.`}
          </DialogDescription>
        </DialogHeader>
        <Board
          positions={positions}
          index={positions.length - 1}
          orientation={side}
          flippable={false}
          interactive={!solved}
          badge={badge}
          onMove={(from, to) => {
            const want = played[done];
            if (!want) return false;
            if (want.from !== from || want.to !== to) {
              setBadge({ square: to, kind: 'wrong' });
              return false;
            }
            setBadge({ square: to, kind: 'right' });
            setDone(Math.min(played.length, done + 2));
            return true;
          }}
          actions={
            <Button variant="ghost" size="sm" onClick={() => setDone(played.length)} disabled={solved}>
              Show me
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Choosing the puzzles a step or a checkpoint shows, from the Lichess puzzles matched to its positions, strongest
 * matches first (docs/v2/components/puzzle-picker.md). With nothing at the chosen level, the list falls down the levels
 * and says so.
 */
export function PuzzlePicker({ targetName, matches, chosen, max, defaults, onChange, ideas }: PuzzlePickerProps) {
  const [filters, setFilters] = useState<PuzzleFilters>(defaults);
  const [trying, setTrying] = useState<PuzzleMatch | null>(null);
  const set = (patch: Partial<PuzzleFilters>) => setFilters({ ...filters, ...patch });
  const allThemes = [...new Set(matches.flatMap((match) => match.themes))].sort();

  const passing = matches.filter(
    (match) =>
      (filters.solver === 'either' || match.solver === filters.solver) &&
      (filters.soon === 'any' || (filters.soon === 'soon') === match.plies <= SOON_PLIES) &&
      match.rating >= filters.rating[0] &&
      match.rating <= filters.rating[1] &&
      filters.themes.every((theme) => match.themes.includes(theme)),
  );
  let shownLevel: MatchLevel | 'any' = filters.level;
  if (filters.level !== 'any') {
    const from = LEVELS.indexOf(filters.level);
    shownLevel = LEVELS.slice(from).find((level) => passing.some((match) => match.level === level)) ?? filters.level;
  }
  const shown = passing
    .filter((match) => shownLevel === 'any' || match.level === shownLevel)
    .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.plies - b.plies);
  const fellDown = filters.level !== 'any' && shownLevel !== filters.level && shown.length > 0;

  const choose = (id: string, on: boolean) => {
    if (on && chosen.length >= max) return;
    onChange(
      on ? [...chosen, id] : chosen.filter((x) => x !== id),
      on ? `choose puzzle ${id} for ${targetName}` : `remove puzzle ${id} from ${targetName}`,
    );
  };
  const move = (index: number, by: -1 | 1) => {
    const next = [...chosen];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    onChange(next, `reorder the puzzles of ${targetName}`);
  };

  return (
    <div className="grid gap-4">
      <section className="grid gap-2" aria-label="Chosen">
        <h3 className="text-sm font-medium">
          Chosen for {targetName}{' '}
          <span className="font-normal text-muted-foreground">
            {chosen.length} of {max}
          </span>
        </h3>
        {chosen.length === 0 ? (
          <EmptyState kind="new" size="part" text="None yet: tick a puzzle below." />
        ) : (
          <ol className="grid divide-y rounded-lg border">
            {chosen.map((id, i) => {
              const match = matches.find((m) => m.id === id);
              return (
                <li key={id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="w-5 text-muted-foreground tabular-nums">{i + 1}.</span>
                  <span className="font-mono">{id}</span>
                  {match ? <span className="text-muted-foreground">rated {match.rating}</span> : null}
                  <span className="ml-auto flex">
                    <IconAction
                      label="Move up"
                      disabled={i === 0}
                      disabledReason="Already first"
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp aria-hidden />
                    </IconAction>
                    <IconAction
                      label="Move down"
                      disabled={i === chosen.length - 1}
                      disabledReason="Already last"
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown aria-hidden />
                    </IconAction>
                    <IconAction label="Remove" onClick={() => choose(id, false)}>
                      <X aria-hidden />
                    </IconAction>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="grid gap-3 rounded-lg border p-3" aria-label="Filters">
        <FilterToggle
          label="Match"
          size="sm"
          value={filters.level}
          options={LEVEL_OPTIONS}
          onChange={(level) => set({ level })}
        />
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <FilterToggle
            label="Who solves"
            size="sm"
            value={filters.solver}
            options={SOLVER_OPTIONS}
            onChange={(solver) => set({ solver })}
          />
          <FilterToggle
            label="How soon"
            size="sm"
            value={filters.soon}
            options={SOON_OPTIONS}
            onChange={(soon) => set({ soon })}
          />
          <div className="grid min-w-56 flex-1 gap-1.5">
            <Label id="pp-rating">
              Rating {filters.rating[0]} to {filters.rating[1]}
            </Label>
            <Slider
              min={minRating}
              max={maxRating}
              step={50}
              value={filters.rating}
              aria-labelledby="pp-rating"
              onValueChange={(next) => set({ rating: [next[0]!, next[1]!] })}
              className="mt-2"
            />
          </div>
        </div>
        {allThemes.length > 0 ? (
          <div className="grid gap-1.5">
            <Label id="pp-themes">Themes</Label>
            <div className="flex flex-wrap gap-1" role="group" aria-labelledby="pp-themes">
              {allThemes.map((theme) => (
                <Toggle
                  key={theme}
                  size="sm"
                  variant="outline"
                  pressed={filters.themes.includes(theme)}
                  className="aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  onPressedChange={(on) =>
                    set({ themes: on ? [...filters.themes, theme] : filters.themes.filter((t) => t !== theme) })
                  }
                >
                  {theme}
                </Toggle>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {fellDown ? (
        <p className="text-sm text-muted-foreground" role="status">
          No puzzle matches {MATCH_LEVEL_NAME[filters.level as MatchLevel].toLowerCase()}. Showing{' '}
          {MATCH_LEVEL_NAME[shownLevel as MatchLevel].toLowerCase()} matches.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          kind="no-match"
          text="No puzzle matches these filters."
          action={{ label: 'Widen the rating range', onClick: () => set({ rating: [minRating, maxRating] }) }}
          secondary={{ label: 'Any level', onClick: () => set({ level: 'any', themes: [] }) }}
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3" aria-label="Matches">
          {shown.map((match) => {
            const solver = startOf(match).side;
            const isChosen = chosen.includes(match.id);
            const full = !isChosen && chosen.length >= max;
            return (
              <li
                key={match.id}
                onKeyDown={(event) => {
                  // Enter on a card's checkbox opens Try it; Space ticks it.
                  if (event.key === 'Enter' && (event.target as HTMLElement).getAttribute('role') === 'checkbox') {
                    event.preventDefault();
                    setTrying(match);
                  }
                }}
              >
                <PuzzleCard
                  puzzle={match}
                  from={match.how}
                  learnerSide={match.solver === 'you' ? solver : solver === 'white' ? 'black' : 'white'}
                  ideas={ideas}
                  selected={isChosen}
                  className="h-full max-w-none content-start"
                  lead={
                    <Hint
                      text={full ? `Already ${max} chosen. Remove one first.` : isChosen ? 'Remove it' : 'Choose it'}
                      off={!full}
                    >
                      <span className="inline-flex">
                        <Checkbox
                          checked={isChosen}
                          disabled={full}
                          onCheckedChange={(on) => choose(match.id, on === true)}
                          aria-label={`Choose puzzle ${match.id}`}
                        />
                      </span>
                    </Hint>
                  }
                  badges={
                    <>
                      <Badge variant="secondary">{MATCH_LEVEL_NAME[match.level]}</Badge>
                      {match.usedIn ? <Badge variant="outline">Used in {match.usedIn}</Badge> : null}
                    </>
                  }
                  actions={
                    <Button variant="outline" size="xs" onClick={() => setTrying(match)}>
                      <Puzzle aria-hidden /> Try it
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      {trying ? <TryIt match={trying} onClose={() => setTrying(null)} /> : null}
    </div>
  );
}
