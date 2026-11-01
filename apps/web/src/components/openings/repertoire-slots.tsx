import { Plus, Repeat, Star } from 'lucide-react';
import { useState } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { OpeningName } from '@/components/chess/opening-name';
import { CoverageMeter, type CoverageDepth } from '@/components/progress/coverage-meter';
import { ModeCounts } from '@/components/progress/mode-counts';
import { ProgressRing } from '@/components/progress/progress-ring';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ABOVE_ROW_LINK } from '@/components/shared/icon-action';
import { cn } from '@/lib/utils';
import { OpeningCard } from './opening-card';
import type { OpeningSummary } from './types';

/** One slot of the repertoire: As White, Against 1.e4, Against 1.d4 (later ones only when an opening exists). */
export type RepertoireSlot = {
  id: string;
  /** "As White", "Against 1.e4". */
  label: string;
  /** Why it matters, for an empty slot: "Half your games start with 1.e4: choose what to play against it". */
  why: string;
  /** The first is the main one; a second for the same trigger is listed under it. */
  openings: OpeningSummary[];
  /** The slot's coverage at the learner's band, by move 10. */
  coverage?: CoverageDepth;
  /** How the coverage hint names these games: "games with your 1.e4". */
  games?: string;
};

export type RepertoireSlotsProps = {
  slots?: RepertoireSlot[];
  /** `full`: the repertoire page, tiles side by side; `compact`: Today and the header menu, one line per slot. */
  layout?: 'full' | 'compact';
  /** Shows Choose, Change, Remove and Make main. */
  editable?: boolean;
  /** `level.band`, in words. */
  band?: string;
  /** The openings offered for each slot, suggested ones first. */
  choices?: Record<string, OpeningSummary[]>;
  onChoose?: (slotId: string, opening: OpeningSummary) => void;
  onRemove?: (slotId: string, opening: OpeningSummary) => void;
  onMakeMain?: (slotId: string, opening: OpeningSummary) => void;
  /** Before onboarding: the three questions. */
  onboardingHref?: string;
  loading?: boolean;
  className?: string;
};

function Filled({
  slot,
  editable,
  band,
  onChange,
  onRemove,
  onMakeMain,
}: {
  slot: RepertoireSlot;
  editable?: boolean;
  band: string;
  onChange: () => void;
  onRemove: (opening: OpeningSummary) => void;
  onMakeMain?: (opening: OpeningSummary) => void;
}) {
  const [main, ...others] = slot.openings;
  if (!main) return null;
  return (
    <Card className="relative gap-3 px-4 transition-colors hover:bg-accent/40">
      <a
        href={main.href}
        aria-label={`${main.name}, ${slot.label.toLowerCase()}`}
        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">{slot.label}</span>
          <OpeningName name={main.name} eco={main.eco} className="text-base" />
        </div>
        {main.started ? (
          <span className={ABOVE_ROW_LINK}>
            <ProgressRing counts={main.started.progress} size="sm" cleared={main.started.finalTestCleared} />
          </span>
        ) : null}
      </div>
      <BoardThumb {...main.thumb} className="w-full max-w-48 self-center" />
      {main.started ? (
        <ModeCounts counts={main.started.modes} size="compact" className={ABOVE_ROW_LINK} />
      ) : (
        <p className="text-sm text-muted-foreground">Not started yet</p>
      )}
      {slot.coverage ? (
        <div className={ABOVE_ROW_LINK}>
          <CoverageMeter
            form="compact"
            band={band}
            rows={[{ label: slot.label, games: slot.games ?? 'games', depths: [slot.coverage] }]}
          />
          <p className="text-xs text-muted-foreground">In games at {band}</p>
        </div>
      ) : null}
      {others.map((other) => (
        <div key={other.id} className={cn('flex items-center gap-2 border-t pt-2 text-sm', ABOVE_ROW_LINK)}>
          <a href={other.href} className="min-w-0 flex-1 truncate underline-offset-4 hover:underline">
            Also: {other.name}
          </a>
          {other.started ? <ProgressRing counts={other.started.progress} size="xs" /> : null}
          {editable && onMakeMain ? (
            <Button variant="ghost" size="xs" onClick={() => onMakeMain(other)}>
              <Star aria-hidden /> Make main
            </Button>
          ) : null}
        </div>
      ))}
      {editable ? (
        <div className={cn('flex gap-1 border-t pt-2', ABOVE_ROW_LINK)}>
          <Button variant="ghost" size="sm" onClick={onChange}>
            <Repeat aria-hidden /> Change
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(main)}>
            Remove
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function Empty({ slot, editable, onChoose }: { slot: RepertoireSlot; editable?: boolean; onChoose: () => void }) {
  return (
    <div className="grid content-center justify-items-start gap-3 rounded-xl border-2 border-dashed p-4">
      <span className="text-xs font-medium text-muted-foreground">{slot.label}</span>
      <p className="text-sm">{slot.why}</p>
      {editable ? (
        <Button variant="outline" size="sm" onClick={onChoose}>
          <Plus aria-hidden /> Choose an opening
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The learner's repertoire as slots, As White, Against 1.e4 and Against 1.d4, each holding an opening or empty
 * (docs/v2/components/repertoire-slots.md). Removing an opening never deletes any answers.
 */
export function RepertoireSlots({
  slots,
  layout = 'full',
  editable = false,
  band = '1000 to 1600',
  choices = {},
  onChoose,
  onRemove,
  onMakeMain,
  onboardingHref,
  loading,
  className,
}: RepertoireSlotsProps) {
  const [picking, setPicking] = useState<RepertoireSlot | null>(null);
  const [removing, setRemoving] = useState<{ slot: RepertoireSlot; opening: OpeningSummary } | null>(null);

  if (loading || !slots) {
    return layout === 'compact' ? (
      <div className={cn('grid gap-2', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    ) : (
      <div className={cn('grid gap-4 md:grid-cols-3', className)}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
    );
  }

  const allEmpty = slots.every((slot) => !slot.openings.length);

  const dialogs = (
    <>
      <Dialog open={Boolean(picking)} onOpenChange={(open) => !open && setPicking(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose an opening {picking?.label.toLowerCase()}</DialogTitle>
            <DialogDescription>
              Suggested ones first. You can change it at any time; progress is kept.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {(picking ? (choices[picking.id] ?? []) : []).map((opening) => (
              <OpeningCard
                key={opening.id}
                opening={opening}
                size="small"
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      if (picking) onChoose?.(picking.id, opening);
                      setPicking(null);
                    }}
                  >
                    Choose
                  </Button>
                }
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the {removing?.opening.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress in the {removing?.opening.name} is kept and comes back if you choose it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) onRemove?.(removing.slot.id, removing.opening);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (layout === 'compact') {
    return (
      <ul className={cn('grid gap-1', className)}>
        {slots.map((slot) => {
          const main = slot.openings[0];
          return (
            <li key={slot.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{slot.label}</span>
              {main ? (
                <>
                  <a
                    href={main.href}
                    className="min-w-0 flex-1 truncate font-medium underline-offset-4 hover:underline"
                  >
                    {main.name}
                  </a>
                  {main.started ? <ProgressRing counts={main.started.progress} size="xs" /> : null}
                  <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">
                    {main.started?.due ? `${main.started.due} due` : 'none due'}
                  </span>
                </>
              ) : editable ? (
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setPicking(slot)}>
                  Choose an opening
                </Button>
              ) : (
                <span className="text-muted-foreground">Empty</span>
              )}
            </li>
          );
        })}
        {dialogs}
      </ul>
    );
  }

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="grid gap-4 md:grid-cols-3">
        {slots.map((slot) =>
          slot.openings.length ? (
            <Filled
              key={slot.id}
              slot={slot}
              editable={editable}
              band={band}
              onChange={() => setPicking(slot)}
              onRemove={(opening) => setRemoving({ slot, opening })}
              onMakeMain={onMakeMain ? (opening) => onMakeMain(slot.id, opening) : undefined}
            />
          ) : (
            <Empty key={slot.id} slot={slot} editable={editable} onChoose={() => setPicking(slot)} />
          ),
        )}
      </div>
      {allEmpty && onboardingHref ? (
        <p className="text-sm text-muted-foreground">
          Not sure where to start?{' '}
          <a href={onboardingHref} className="font-medium text-foreground underline underline-offset-4">
            Answer three questions
          </a>{' '}
          and we suggest one opening for each slot.
        </p>
      ) : null}
      {dialogs}
    </div>
  );
}
