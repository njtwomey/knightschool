import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/shared/hint';
import { cn } from '@/lib/utils';

/** At one depth: the share of games at the band still inside what the learner knows, and what their openings cover. */
export type CoverageDepth = { move: number; known: number; covered: number };

export type CoverageRow = {
  /** "As White", "Against 1.e4". */
  label: string;
  /** How the hint names these games: "games with your 1.e4", "games where White plays 1.e4". */
  games: string;
  depths: CoverageDepth[];
  /** The step that would add most, and how much (a share of games), for the hint. */
  gain?: { name: string; share: number };
  /** Some replies on the way have no explorer data; they count as not known. */
  missingData?: boolean;
  /** The map for this side with the coverage overlay; a bar adds `#depth=<move>`. */
  mapHref?: string;
};

export type CoverageMeterProps = {
  rows: CoverageRow[];
  /** The band, in words: "1000 to 1600". */
  band: string;
  /** `bars`: three bars per row; `compact`: one figure, "Covers 71% of games to move 10". */
  form?: 'bars' | 'compact';
  /** The coverage target, a share of games, drawn as a tick on each bar. */
  target?: number;
  /** The depth the compact form quotes. */
  compactMove?: number;
  /** No baked data for this band and no Lichess token: say so and offer Settings. */
  noData?: { settingsHref: string };
  className?: string;
};

const pct = (share: number) => `${Math.round(share * 100)}%`;
const per100 = (share: number) => Math.round(share * 100);

function hintFor(row: CoverageRow, depth: CoverageDepth): string {
  const parts = [
    `Of 100 ${row.games} at this level, ${per100(depth.known)} are still in moves you know at move ${depth.move}.`,
  ];
  if (depth.covered > depth.known)
    parts.push(`Your openings cover ${per100(depth.covered - depth.known)} more you have not learned yet.`);
  if (row.gain) parts.push(`Learning the ${row.gain.name} would add ${per100(row.gain.share)}.`);
  if (row.missingData) parts.push('Some replies have no data yet.');
  return parts.join(' ');
}

function Bar({ row, depth, target }: { row: CoverageRow; depth: CoverageDepth; target?: number }) {
  const body = (
    <>
      <span className="w-20 shrink-0 text-xs text-muted-foreground">By move {depth.move}</span>
      <span className="relative h-2.5 flex-1 rounded-full bg-muted">
        <span
          className="absolute inset-y-0 left-0 rounded-full border border-dashed border-state-known/70"
          style={{ width: `${Math.min(1, depth.covered) * 100}%` }}
        />
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-state-known transition-[width] duration-700 motion-reduce:transition-none"
          style={{ width: `${Math.min(1, depth.known) * 100}%` }}
        />
        {target !== undefined ? (
          <span
            className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground/70"
            style={{ left: `calc(${target * 100}% - 1px)` }}
            aria-hidden
          />
        ) : null}
      </span>
      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">{pct(depth.known)}</span>
    </>
  );
  const look = 'flex items-center gap-3 rounded-md px-1 py-1 no-underline text-foreground';
  return (
    <Hint text={hintFor(row, depth)}>
      {row.mapHref ? (
        <a
          href={`${row.mapHref}#depth=${depth.move}`}
          className={cn(
            look,
            'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          )}
          aria-label={`By move ${depth.move}: ${pct(depth.known)} known. ${hintFor(row, depth)} Open the map.`}
        >
          {body}
        </a>
      ) : (
        <span tabIndex={0} className={look} aria-label={`By move ${depth.move}: ${hintFor(row, depth)}`}>
          {body}
        </span>
      )}
    </Hint>
  );
}

/**
 * How much of what players at the learner's band actually play the learner knows: the share of games still inside
 * their repertoire at move 5, 10 and 15 (docs/v2/components/coverage-meter.md). The one number that should only rise.
 */
export function CoverageMeter({
  rows,
  band,
  form = 'bars',
  target,
  compactMove = 10,
  noData,
  className,
}: CoverageMeterProps) {
  if (noData) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 text-sm text-muted-foreground', className)}>
        <span>No coverage figures for games at {band} yet: there is no baked data for this band.</span>
        <Button asChild variant="outline" size="sm">
          <a href={noData.settingsHref}>
            <Settings aria-hidden /> Add a Lichess token
          </a>
        </Button>
      </div>
    );
  }

  if (form === 'compact') {
    return (
      <span className={cn('inline-flex flex-col gap-0.5', className)}>
        {rows.map((row) => {
          const depth = row.depths.find((d) => d.move === compactMove) ?? row.depths[row.depths.length - 1];
          if (!depth) return null;
          return (
            <Hint key={row.label} text={hintFor(row, depth)}>
              <span tabIndex={0} className="inline-flex items-center gap-2 text-sm">
                <span className="relative h-1.5 w-14 shrink-0 rounded-full bg-muted" aria-hidden>
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-state-known"
                    style={{ width: `${depth.known * 100}%` }}
                  />
                </span>
                <span>
                  {rows.length > 1 ? <span className="text-muted-foreground">{row.label}: </span> : null}
                  Covers <span className="font-medium tabular-nums">{pct(depth.known)}</span> of games to move{' '}
                  {depth.move}
                </span>
              </span>
            </Hint>
          );
        })}
      </span>
    );
  }

  return (
    <div className={cn('grid gap-4', className)}>
      {rows.map((row) => (
        <figure key={row.label} className="grid gap-1">
          <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {row.label}, in games at {band}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-3 rounded-sm bg-state-known" aria-hidden /> known
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-3 rounded-sm border border-dashed border-state-known/70" aria-hidden /> covered,
              not learned yet
            </span>
            {target !== undefined ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-0.5 rounded-full bg-foreground/70" aria-hidden /> your target
              </span>
            ) : null}
          </figcaption>
          {row.depths.map((depth) => (
            <Bar key={depth.move} row={row} depth={depth} target={target} />
          ))}
        </figure>
      ))}
    </div>
  );
}
