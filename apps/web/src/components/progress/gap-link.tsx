import { numberedMove } from '@knightschool/core';
import { BookOpen, Map as MapIcon, Plus } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveRun, type RunMove } from '@/components/chess/move-run';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/shared/hint';
import { cn } from '@/lib/utils';

/** What would fill a gap. */
export type GapFill =
  /** The learner's own opening answers it, in a step not learned yet. */
  | { kind: 'unlearned'; opening: string; step: number; stepName: string; href: string }
  /** Another opening in the catalogue answers it. */
  | { kind: 'unanswered'; opening: string; href: string }
  /** Nothing in the catalogue answers it. */
  | { kind: 'none'; mapHref: string };

export type Gap = {
  /** From the start; the last move is the reply nobody answers yet. */
  moves: RunMove[];
  /** The share of the side's games at the band that reach the reply. */
  share: number;
  fill: GapFill;
};

export type GapLinkProps = {
  gaps: Gap[];
  /** `one`: the biggest gap (Today, under the coverage meter); `list`: the top few (the repertoire page). */
  form?: 'one' | 'list';
  /** The band, in words: "1000 to 1600". */
  band: string;
  /** Replies rarer than this are never gaps (`level.coverageTarget`). */
  target: number;
  /** How many rows in the list form. */
  limit?: number;
  orientation?: 'white' | 'black';
  /** Where to lower the target, when nothing is left above it. */
  settingsHref?: string;
  className?: string;
};

/** "about 1 game in 6": a share said as a frequency a learner can picture. */
function oneIn(share: number): string {
  if (share >= 0.45) return 'about half your games';
  const n = Math.max(2, Math.round(1 / share));
  return `about 1 game in ${n}`;
}

function fillText(gap: Gap): string {
  const last = gap.moves[gap.moves.length - 1]!;
  const reply = numberedMove(gap.moves.length - 1, last.san);
  switch (gap.fill.kind) {
    case 'unlearned':
      return `Your ${gap.fill.opening} answers this in step ${gap.fill.step} (${gap.fill.stepName}).`;
    case 'unanswered':
      return `The ${gap.fill.opening} answers ${reply}: add it to your repertoire.`;
    case 'none':
      return 'No opening here answers this yet.';
  }
}

function FillAction({ fill, size = 'sm' }: { fill: GapFill; size?: 'sm' | 'xs' }) {
  if (fill.kind === 'unlearned')
    return (
      <Button asChild size={size}>
        <a href={fill.href}>
          <BookOpen aria-hidden /> Learn it
        </a>
      </Button>
    );
  if (fill.kind === 'unanswered')
    return (
      <Button asChild size={size} variant="outline">
        <a href={fill.href}>
          <Plus aria-hidden /> Add an opening
        </a>
      </Button>
    );
  return (
    <Button asChild size={size} variant="ghost">
      <a href={fill.mapHref}>
        <MapIcon aria-hidden /> See it on the map
      </a>
    </Button>
  );
}

function GapMoves({ gap, orientation }: { gap: Gap; orientation: 'white' | 'black' }) {
  const lead = gap.moves.slice(0, -1);
  const last = gap.moves[gap.moves.length - 1]!;
  const ply = gap.moves.length - 1;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-0.5">
      {lead.length ? <MoveRun moves={lead} orientation={orientation} /> : null}
      <span className="rounded bg-accent font-semibold ring-1 ring-foreground/20">
        <MoveChip
          ply={ply}
          san={last.san}
          epd={last.after}
          from={last.uci.slice(0, 2)}
          to={last.uci.slice(2, 4)}
          numbered={lead.length ? 'white' : 'always'}
          orientation={orientation}
          mine
        />
      </span>
    </span>
  );
}

function Share({ share, band }: { share: number; band: string }) {
  return (
    <Hint text={`In the Lichess explorer, games at ${band} in blitz and rapid.`}>
      <span tabIndex={0} className="underline decoration-dotted underline-offset-4">
        {oneIn(share)}
      </span>
    </Hint>
  );
}

/**
 * The most common reply the learner's repertoire does not answer yet, with a way straight to learning it
 * (docs/v2/components/gap-link.md).
 */
export function GapLink({
  gaps,
  form = 'one',
  band,
  target,
  limit = 5,
  orientation = 'white',
  settingsHref,
  className,
}: GapLinkProps) {
  const shown = gaps.filter((gap) => gap.share >= target).sort((a, b) => b.share - a.share);
  if (!shown.length) {
    return (
      <p className={cn('flex flex-wrap items-center gap-2 text-sm text-muted-foreground', className)} role="status">
        No gaps above {oneIn(target).replace('about ', '')}.
        {settingsHref ? (
          <>
            {' '}
            Lower the target in Settings to look deeper.
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <a href={settingsHref}>Change the target</a>
            </Button>
          </>
        ) : null}
      </p>
    );
  }

  if (form === 'list') {
    return (
      <ol className={cn('grid divide-y rounded-lg border', className)}>
        {shown.slice(0, limit).map((gap, i) => (
          <li key={gap.moves.map((m) => m.uci).join(' ')} className="grid gap-1.5 p-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-1">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
                <GapMoves gap={gap} orientation={orientation} />
              </div>
              <p className="pl-6 text-sm text-muted-foreground">
                <Share share={gap.share} band={band} />. {fillText(gap)}
              </p>
            </div>
            <div className="pl-6 sm:self-center sm:pl-0">
              <FillAction fill={gap.fill} size="xs" />
            </div>
          </li>
        ))}
      </ol>
    );
  }

  const gap = shown[0]!;
  const last = gap.moves[gap.moves.length - 1]!;
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <BoardThumb
        epd={last.after}
        lastMove={{ from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) }}
        orientation={orientation}
        className="hidden w-28 shrink-0 sm:block"
      />
      <div className="grid gap-2">
        <p className="text-sm leading-relaxed">
          Your biggest gap: <GapMoves gap={gap} orientation={orientation} />, <Share share={gap.share} band={band} /> at
          your level.
        </p>
        <p className="text-sm text-muted-foreground">{fillText(gap)}</p>
        <div>
          <FillAction fill={gap.fill} />
        </div>
      </div>
    </div>
  );
}
