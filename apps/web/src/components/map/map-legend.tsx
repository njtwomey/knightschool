import { Check, ChevronDown, Map as MapIcon, Puzzle } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { laneColour } from './lane-colours';
import { MOVE_STATES, OVERLAYS, PILL_FILL, STATE_NAME, type MapOverlay, type MoveState } from './map-types';
import { GRADE_FILL } from '@/components/chess/grade-style';

const OVERLAY_NAME: Record<MapOverlay, string> = {
  progress: 'Progress',
  gaps: 'Gaps',
  mistakes: 'Mistakes and marks',
  coverage: 'Coverage',
  puzzles: 'Puzzles',
  lines: 'Lines',
};

export type MapLegendProps = {
  /** The overlays this map offers, and which are on. */
  available?: readonly MapOverlay[];
  on: ReadonlySet<MapOverlay>;
  onToggle: (overlay: MapOverlay, on: boolean) => void;
  /** The learner's moves in each state, for the lines in view. */
  counts?: Partial<Record<MoveState, number>>;
  /** `level.band` and `level.coverageTarget`, for the gaps wording. */
  band?: string;
  minShare?: number;
  /** The lines in view with their lanes, for the Lines overlay. */
  lines?: readonly { id: string; name: string; lane: number }[];
  /** No popularity data for these positions: no gap stubs. */
  noData?: boolean;
  /** Hover a state's sample: those pills pulse once. */
  onPulse?: (state: MoveState | null) => void;
  /** Click a state's count: everything else dims until clicked again. */
  isolated?: MoveState | null;
  onIsolate?: (state: MoveState | null) => void;
  /** `corner`: a small folded panel over the map; `below`: under it, on phones. */
  placement?: 'corner' | 'below';
  defaultOpen?: boolean;
  className?: string;
};

function Section({
  overlay,
  checked,
  onToggle,
  children,
}: {
  overlay: MapOverlay;
  checked: boolean;
  onToggle: (overlay: MapOverlay, on: boolean) => void;
  children?: ReactNode;
}) {
  const id = `${useId()}-${overlay}`;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {checked ? OVERLAY_NAME[overlay] : `Show ${OVERLAY_NAME[overlay].toLowerCase()}`}
        </label>
        <Switch id={id} size="sm" checked={checked} onCheckedChange={(value) => onToggle(overlay, value)} />
      </div>
      {checked ? <div className="grid gap-1.5 text-xs text-muted-foreground">{children}</div> : null}
    </div>
  );
}

/**
 * What the map's colours and marks mean, only for what it draws now, with each overlay's switch
 * (docs/v2/components/map-legend.md).
 */
export function MapLegend({
  available = OVERLAYS,
  on,
  onToggle,
  counts = {},
  band = '1000 to 1600',
  minShare = 0.05,
  lines = [],
  noData,
  onPulse,
  isolated,
  onIsolate,
  placement = 'below',
  defaultOpen = true,
  className,
}: MapLegendProps) {
  const [open, setOpen] = useState(defaultOpen);
  const shownOn = available.filter((overlay) => on.has(overlay));
  const off = available.filter((overlay) => !on.has(overlay));
  const oneIn = Math.round(1 / minShare);

  const sample = (overlay: MapOverlay): ReactNode => {
    switch (overlay) {
      case 'progress':
        return (
          <ul className="flex flex-wrap gap-1.5">
            {MOVE_STATES.map((state) => (
              <li key={state}>
                <Button
                  variant="ghost"
                  size="xs"
                  aria-pressed={isolated === state}
                  onMouseEnter={() => onPulse?.(state)}
                  onMouseLeave={() => onPulse?.(null)}
                  onFocus={() => onPulse?.(state)}
                  onBlur={() => onPulse?.(null)}
                  onClick={() => onIsolate?.(isolated === state ? null : state)}
                  className="h-6 gap-1.5 px-1 font-normal aria-pressed:bg-muted"
                  title={
                    isolated === state
                      ? 'Show every move again'
                      : `Pick out the ${STATE_NAME[state].toLowerCase()} moves`
                  }
                >
                  <span className={cn('h-3.5 w-6 rounded-full border-2', PILL_FILL[state])} aria-hidden />
                  <span className="text-foreground">{STATE_NAME[state]}</span>
                  {counts[state] !== undefined ? <span className="tabular-nums">{counts[state]}</span> : null}
                </Button>
              </li>
            ))}
          </ul>
        );
      case 'gaps':
        return noData ? (
          <p>No data here yet.</p>
        ) : (
          <div className="flex items-start gap-2">
            <span
              className="mt-1 h-3 w-8 shrink-0 rounded-sm border-2 border-dashed border-muted-foreground/60"
              aria-hidden
            />
            <p>
              A reply players at your level make that you do not answer yet; thicker means more games. At {band},
              replies in at least 1 game in {oneIn}.
            </p>
          </div>
        );
      case 'mistakes':
        return (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex shrink-0 gap-1" aria-hidden>
              <span
                className={cn(
                  'grid size-4 place-items-center rounded-full text-[0.65rem] font-bold text-background',
                  GRADE_FILL.mistake,
                )}
              >
                ?
              </span>
              <span className={cn('grid size-4 place-items-center rounded-full text-background', GRADE_FILL.mistake)}>
                <Check className="size-2.5" strokeWidth={4} />
              </span>
            </span>
            <p>A common mistake by your opponent; a tick when you have practised the punishment.</p>
          </div>
        );
      case 'coverage':
        return (
          <div className="flex items-center gap-2">
            <span className="flex shrink-0 flex-col gap-1" aria-hidden>
              <span className="h-0.5 w-8 rounded-full bg-muted-foreground/50" />
              <span className="h-2 w-8 rounded-full bg-muted-foreground/50" />
            </span>
            <p>Thicker lanes are reached in more games.</p>
          </div>
        );
      case 'puzzles':
        return (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1 text-[0.6rem] text-mode-puzzle"
              aria-hidden
            >
              <Puzzle className="size-2.5" />3
            </span>
            <p>Puzzles from games that passed through here.</p>
          </div>
        );
      case 'lines':
        return (
          <ul className="grid gap-1">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-2">
                <span
                  className="h-1 w-6 shrink-0 rounded-full"
                  style={{ backgroundColor: laneColour(line.lane) }}
                  aria-hidden
                />
                <span className="text-foreground">{line.name}</span>
              </li>
            ))}
          </ul>
        );
    }
  };

  const body = (
    <div className="grid gap-3">
      {shownOn.map((overlay) => (
        <Section key={overlay} overlay={overlay} checked onToggle={onToggle}>
          {sample(overlay)}
        </Section>
      ))}
      <p className="text-xs text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">Bold</span> moves are yours.
      </p>
      {off.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="xs" className="group -ml-2 text-muted-foreground">
              More overlays ({off.length})
              <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-2 pt-2">
            {off.map((overlay) => (
              <Section key={overlay} overlay={overlay} checked={false} onToggle={onToggle} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );

  if (placement === 'below') {
    return <div className={cn('rounded-lg border p-3', className)}>{body}</div>;
  }
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('w-72 rounded-lg border bg-background/95 shadow-md backdrop-blur-sm', className)}
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between rounded-b-none">
          <span className="inline-flex items-center gap-1.5">
            <MapIcon aria-hidden />
            Key
          </span>
          <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-3">{body}</CollapsibleContent>
    </Collapsible>
  );
}
