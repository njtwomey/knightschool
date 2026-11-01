import { ArrowRight, Check } from 'lucide-react';
import { Fragment, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/shared/hint';
import { cn } from '@/lib/utils';
import { pickNext, type NextState } from './next-action-pickers';

/** A quieter way on, beside the main button. */
export type NextAlternative = { label: string; href: string; hint: string };

export type NextActionProps = {
  state: NextState;
  /** `main`: one button; `with-alternatives`: two or three quieter links beside it. */
  form?: 'main' | 'with-alternatives';
  alternatives?: NextAlternative[];
  /** Enter triggers it when nothing else has focus (Today). */
  enterKey?: boolean;
  className?: string;
};

/**
 * The one button that says what to do now, with a line saying why (docs/v2/components/next-action.md). The choice is
 * the first picker in `NEXT_PICKERS` with something to offer; worked out by the page, so it never changes under the
 * pointer.
 */
export function NextAction({ state, form = 'main', alternatives = [], enterKey, className }: NextActionProps) {
  const choice = pickNext(state);
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!enterKey) return;
    const onKey = (event: KeyboardEvent) => {
      const idle = !document.activeElement || document.activeElement === document.body;
      if (event.key === 'Enter' && idle && !event.defaultPrevented) link.current?.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enterKey]);

  const others = form === 'with-alternatives' ? alternatives.slice(0, 3) : [];
  const Icon = choice?.icon ?? Check;

  return (
    <div className={cn('grid gap-2', className)}>
      {choice ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button asChild size="lg" className="h-11 px-4 text-base">
            <a ref={link} href={choice.href}>
              <Icon aria-hidden />
              {choice.label}
              <ArrowRight aria-hidden />
            </a>
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-base font-medium">
          <Check className="size-5 text-state-known" aria-hidden />
          All done for today.{state.nextReview ? ` Next review ${state.nextReview}.` : ''}
        </p>
      )}
      {choice ? <p className="text-sm text-muted-foreground">{choice.why}</p> : null}
      {others.length ? (
        <p className="text-sm text-muted-foreground">
          {choice ? 'Or ' : 'Something else: '}
          {others.map((other, i) => (
            <Fragment key={other.label}>
              {i > 0 ? (i === others.length - 1 ? ', or ' : ', ') : null}
              <Hint text={other.hint}>
                <a
                  href={other.href}
                  className="rounded-sm font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {other.label}
                </a>
              </Hint>
            </Fragment>
          ))}
          .
        </p>
      ) : null}
    </div>
  );
}
