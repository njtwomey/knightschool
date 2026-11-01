import { Play } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FilterToggle, type FilterOption } from '@/components/finding/filter-toggle';
import { WEIGHTING_OPTIONS } from '@/components/finding/filter-options';
import { cn } from '@/lib/utils';
import {
  cannotStart,
  FIXED_SOURCES,
  MODE_INFO,
  type PracticeConfig,
  type PracticeMode,
  type PracticeSource,
} from './practice-config';

export type SetupField = keyof PracticeConfig;

/** The fields each mode shows, in order. */
const MODE_FIELDS: Record<PracticeMode, SetupField[]> = {
  review: ['source', 'weighting', 'movesPerQuestion'],
  drill: ['source', 'weighting', 'computerPlays'],
  puzzles: ['source', 'weighting', 'puzzleCount', 'rating', 'solver'],
  'play-on': ['source', 'weighting', 'playOnMoves', 'playOnTolerance'],
  speed: ['source', 'weighting', 'run', 'depth'],
  'name-it': ['source', 'weighting', 'positions'],
};

const MOVES_PER_QUESTION: FilterOption[] = [
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
  { value: '0', label: 'Rest of the line', hint: 'Every move of yours to the end of the line' },
];
const COMPUTER: FilterOption<PracticeConfig['computerPlays']>[] = [
  { value: 'written', label: 'As written', hint: 'The replies the lines give, chosen at random' },
  {
    value: 'level',
    label: 'As your level plays',
    hint: 'Replies weighted by how often players at your level choose them',
  },
  { value: 'engine', label: 'The engine', hint: 'The strongest reply, which may leave the lines' },
];
const PUZZLE_COUNT: FilterOption[] = [5, 10, 20].map((n) => ({ value: String(n), label: String(n) }));
const SOLVER: FilterOption<PracticeConfig['solver']>[] = [
  { value: 'you', label: 'You', hint: 'Puzzles where your side wins something' },
  { value: 'opponent', label: 'The opponent', hint: 'Find what the other side threatens, so you see it coming' },
  { value: 'both', label: 'Both' },
];
const PLAY_ON_MOVES: FilterOption[] = [3, 5, 10].map((n) => ({ value: String(n), label: `${n} moves` }));
const TOLERANCE: FilterOption<PracticeConfig['playOnTolerance']>[] = [
  { value: 'inaccuracy', label: 'An inaccuracy', hint: 'Strict: any slip ends the run' },
  { value: 'mistake', label: 'A mistake' },
  { value: 'blunder', label: 'A blunder', hint: 'Relaxed: only a big loss ends the run' },
];
const RUN: FilterOption[] = [
  { value: 'lines:3', label: '3 lines' },
  { value: 'lines:5', label: '5 lines' },
  { value: 'lines:10', label: '10 lines' },
  { value: 'time:30', label: '30 s', hint: 'As many moves as you can in 30 seconds' },
  { value: 'time:60', label: '1 min' },
  { value: 'time:120', label: '2 min' },
];
const DEPTH: FilterOption[] = [
  { value: '6', label: 'To move 6' },
  { value: '10', label: 'To move 10' },
  { value: '15', label: 'To move 15' },
  { value: '0', label: 'Whole line' },
];
const POSITIONS: FilterOption[] = [5, 10, 20].map((n) => ({ value: String(n), label: String(n) }));

function Row({ label, origin, children }: { label: string; origin?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-3">
      <div className="text-sm font-medium">
        {label}
        {origin ? <div className="text-xs font-normal text-muted-foreground">{origin}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export type PracticeSetupProps = {
  mode: PracticeMode;
  /** The saved choice, or the running session's own copy. */
  initial: PracticeConfig;
  /** The openings and variations to practise from. */
  sources: readonly PracticeSource[];
  /** Reviews due now (Review's Due today). */
  due?: number;
  onStart: (config: PracticeConfig) => void;
  /** Shown when the card was opened from a running session. */
  onCancel?: () => void;
  /** Limit the fields: a line's quiz shows only moves per question, a checkpoint none. */
  only?: readonly SetupField[];
  startLabel?: string;
  /** Where a field's default came from ("from the Exam preset"). */
  origins?: Partial<Record<SetupField, string>>;
  title?: string;
  className?: string;
};

/**
 * The set-up card for every practice mode. It edits a copy: nothing restarts and nothing is saved until Start
 * (docs/v2/components/practice-setup.md).
 */
export function PracticeSetup({
  mode,
  initial,
  sources,
  due = 0,
  onStart,
  onCancel,
  only,
  startLabel = 'Start',
  origins = {},
  title,
  className,
}: PracticeSetupProps) {
  const [draft, setDraft] = useState<PracticeConfig>(initial);
  const set = <K extends SetupField>(key: K, value: PracticeConfig[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const info = MODE_INFO[mode];
  const Icon = info.icon;
  const fields = MODE_FIELDS[mode].filter(
    (field) => (!only || only.includes(field)) && !(field === 'weighting' && draft.source === 'due'),
  );
  const shows = (field: SetupField) => fields.includes(field);
  const blocked = cannotStart(draft, sources, due);
  const openings = sources.filter((source) => source.group === 'opening');
  const variations = sources.filter((source) => source.group === 'variation');
  const count = (n: number | undefined) =>
    n === undefined ? null : <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">{n}</span>;

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          if (!blocked) onStart(draft);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && onCancel) onCancel();
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={cn('grid size-8 place-items-center rounded-md', info.soft, info.text)}>
              <Icon className="size-4" aria-hidden />
            </span>
            {title ?? info.title}
          </CardTitle>
          <CardDescription>{info.blurb}</CardDescription>
        </CardHeader>
        {fields.length > 0 ? (
          <CardContent className="grid gap-4">
            {shows('source') ? (
              <Row label="From" origin={origins.source}>
                <Select value={draft.source} onValueChange={(value) => set('source', value)}>
                  <SelectTrigger className="w-full sm:w-80" aria-label="Practise from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {mode === 'review' ? (
                        <SelectItem value="due">
                          {FIXED_SOURCES.due}
                          {count(due)}
                        </SelectItem>
                      ) : null}
                      <SelectItem value="repertoire">{FIXED_SOURCES.repertoire}</SelectItem>
                      <SelectItem value="everything">{FIXED_SOURCES.everything}</SelectItem>
                      <SelectItem value="hardest">{FIXED_SOURCES.hardest}</SelectItem>
                    </SelectGroup>
                    {openings.length > 0 ? (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>One opening</SelectLabel>
                          {openings.map((source) => (
                            <SelectItem key={source.id} value={source.id}>
                              {source.name}
                              {count(source.count)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    ) : null}
                    {variations.length > 0 ? (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>One variation</SelectLabel>
                          {variations.map((source) => (
                            <SelectItem key={source.id} value={source.id}>
                              {source.name}
                              {source.opening ? (
                                <span className="text-muted-foreground"> in the {source.opening}</span>
                              ) : null}
                              {count(source.count)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    ) : null}
                    {mode === 'speed' && openings.length > 0 ? (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Opening rush</SelectLabel>
                          {openings.map((source) => (
                            <SelectItem key={source.id} value={`rush:${source.id.split(':')[1]}`}>
                              Rush through the {source.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
              </Row>
            ) : null}
            {shows('weighting') ? (
              <Row label="Weighting" origin={origins.weighting}>
                <FilterToggle
                  label="Weighting"
                  showLabel={false}
                  value={draft.weighting}
                  options={WEIGHTING_OPTIONS}
                  onChange={(value) => set('weighting', value)}
                />
              </Row>
            ) : null}
            {shows('movesPerQuestion') ? (
              <Row label="Moves per question" origin={origins.movesPerQuestion}>
                <FilterToggle
                  label="Moves per question"
                  showLabel={false}
                  value={String(draft.movesPerQuestion)}
                  options={MOVES_PER_QUESTION}
                  onChange={(value) => set('movesPerQuestion', Number(value))}
                />
              </Row>
            ) : null}
            {shows('computerPlays') ? (
              <Row label="The computer plays" origin={origins.computerPlays}>
                <FilterToggle
                  label="The computer plays"
                  showLabel={false}
                  value={draft.computerPlays}
                  options={COMPUTER}
                  onChange={(value) => set('computerPlays', value)}
                />
              </Row>
            ) : null}
            {shows('puzzleCount') ? (
              <Row label="How many" origin={origins.puzzleCount}>
                <FilterToggle
                  label="How many puzzles"
                  showLabel={false}
                  value={String(draft.puzzleCount)}
                  options={PUZZLE_COUNT}
                  onChange={(value) => set('puzzleCount', Number(value))}
                />
              </Row>
            ) : null}
            {shows('rating') ? (
              <Row label="Rating" origin={origins.rating}>
                <div className="flex items-center gap-3">
                  <Slider
                    min={600}
                    max={1800}
                    step={50}
                    value={draft.rating}
                    onValueChange={(value) => set('rating', [value[0]!, value[1]!])}
                    aria-label="Puzzle rating range"
                    className="max-w-64"
                  />
                  <span className="text-sm whitespace-nowrap tabular-nums">
                    {draft.rating[0]} to {draft.rating[1]}
                  </span>
                </div>
              </Row>
            ) : null}
            {shows('solver') ? (
              <Row label="Who solves" origin={origins.solver}>
                <FilterToggle
                  label="Who solves"
                  showLabel={false}
                  value={draft.solver}
                  options={SOLVER}
                  onChange={(value) => set('solver', value)}
                />
              </Row>
            ) : null}
            {shows('playOnMoves') ? (
              <Row label="How long" origin={origins.playOnMoves}>
                <FilterToggle
                  label="How many moves"
                  showLabel={false}
                  value={String(draft.playOnMoves)}
                  options={PLAY_ON_MOVES}
                  onChange={(value) => set('playOnMoves', Number(value))}
                />
              </Row>
            ) : null}
            {shows('playOnTolerance') ? (
              <Row label="Give away at most" origin={origins.playOnTolerance}>
                <FilterToggle
                  label="Give away at most"
                  showLabel={false}
                  value={draft.playOnTolerance}
                  options={TOLERANCE}
                  onChange={(value) => set('playOnTolerance', value)}
                />
              </Row>
            ) : null}
            {shows('run') ? (
              <Row label="The run" origin={origins.run}>
                <FilterToggle
                  label="The run"
                  showLabel={false}
                  value={draft.run}
                  options={RUN}
                  onChange={(value) => set('run', value)}
                />
              </Row>
            ) : null}
            {shows('depth') ? (
              <Row label="How deep" origin={origins.depth}>
                <FilterToggle
                  label="How deep"
                  showLabel={false}
                  value={String(draft.depth)}
                  options={DEPTH}
                  onChange={(value) => set('depth', Number(value))}
                />
              </Row>
            ) : null}
            {shows('positions') ? (
              <Row label="Positions" origin={origins.positions}>
                <FilterToggle
                  label="How many positions"
                  showLabel={false}
                  value={String(draft.positions)}
                  options={POSITIONS}
                  onChange={(value) => set('positions', Number(value))}
                />
              </Row>
            ) : null}
          </CardContent>
        ) : null}
        <CardFooter className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={blocked !== null}>
            <Play aria-hidden />
            {startLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {blocked ??
              (mode === 'review' && draft.source !== 'due'
                ? 'Free practice: nothing here changes your schedule.'
                : null)}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
