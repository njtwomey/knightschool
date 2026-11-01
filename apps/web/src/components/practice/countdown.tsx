import { Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { OpeningName } from '@/components/chess/opening-name';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type CountdownNext = { opening: string; variation?: string; side: 'white' | 'black' };

export type CountdownProps = {
  next: CountdownNext;
  /** The length in seconds (`FEEDBACK_DELAYS.betweenLines` scaled by `feedback.speed`). */
  seconds?: number;
  /** Called at zero or on Start now. */
  onDone: () => void;
  /** Escape offers Stop the run. */
  onStop?: () => void;
  /** Before the first line: "Get ready" and the run's shape ("5 lines, to move 10"). */
  first?: { shape: string };
  /** A still frame for the gallery: the count held at this many seconds. */
  frozenAt?: number;
  /** Starts paused (as after Escape). */
  startPaused?: boolean;
  className?: string;
};

/**
 * The count before a timed run and between its lines, over the board area (the header stays usable). Nothing waits for
 * a click: at zero the run starts; Start now, Enter or Space skip the wait; Escape pauses
 * (docs/v2/components/countdown.md).
 */
export function Countdown({
  next,
  seconds = 5,
  onDone,
  onStop,
  first,
  frozenAt,
  startPaused = false,
  className,
}: CountdownProps) {
  const total = seconds * 1000;
  const [left, setLeft] = useState(frozenAt !== undefined ? frozenAt * 1000 : total);
  const [paused, setPaused] = useState(startPaused);
  const [hidden, setHidden] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const frozen = frozenAt !== undefined;
  const running = !frozen && !paused && !hidden;

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      setLeft((current) => Math.max(0, current - elapsed));
    }, 100);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!frozen && left === 0) done.current();
  }, [left, frozen]);

  // Leaving the tab pauses the count; coming back resumes it.
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!frozen) panel.current?.focus();
  }, [frozen]);

  const startNow = () => {
    if (frozen) return;
    setLeft(0);
  };

  const count = Math.ceil(left / 1000);
  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-label={first ? `Get ready: ${next.opening}` : `Next up: ${next.opening}`}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          if ((event.target as HTMLElement).closest('button')) return;
          event.preventDefault();
          startNow();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setPaused(true);
        }
      }}
      className={cn(
        'absolute inset-0 z-20 grid place-items-center bg-background/85 p-4 backdrop-blur-sm outline-none',
        className,
      )}
    >
      <div className="grid w-full max-w-sm justify-items-center gap-3 rounded-xl border bg-card p-6 text-center shadow-lg">
        <p className="text-sm font-medium text-muted-foreground">{first ? 'Get ready' : 'Next up'}</p>
        <div className="grid gap-0.5">
          <OpeningName name={next.opening} level="opening" className="justify-center text-2xl" />
          {next.variation ? (
            <OpeningName name={`${next.opening}: ${next.variation}`} level="variation" className="justify-center" />
          ) : null}
        </div>
        <p className="text-sm">
          You play {next.side === 'white' ? 'White' : 'Black'}
          {first ? <span className="text-muted-foreground">. {first.shape}</span> : null}
        </p>
        <p className="text-6xl font-bold tabular-nums" aria-hidden>
          {paused ? <Pause className="mx-auto size-14 text-muted-foreground" aria-label="Paused" /> : count}
        </p>
        <Progress
          value={(left / total) * 100}
          aria-label="Time before the line starts"
          className="h-1.5 motion-reduce:[&>*]:transition-none"
        />
        {paused ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setPaused(false)}>
              <Play aria-hidden />
              Resume
            </Button>
            {onStop ? (
              <Button variant="outline" onClick={onStop}>
                <Square aria-hidden />
                Stop the run
              </Button>
            ) : null}
          </div>
        ) : (
          <Button onClick={startNow}>Start now</Button>
        )}
      </div>
    </div>
  );
}
