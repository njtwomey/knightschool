import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  describeConfig,
  MODE_INFO,
  type PracticeConfig,
  type PracticeMode,
  type PracticeSource,
} from './practice-config';
import { PracticeSetup, type SetupField } from './practice-setup';

export type PracticeBarProps = {
  mode: PracticeMode;
  /** The running session's own copy, never the saved one. */
  config: PracticeConfig;
  sources: readonly PracticeSource[];
  due?: number;
  /** Starts a new session with the new config (the page saves it as the mode's default). */
  onStart: (config: PracticeConfig) => void;
  /** Speed stops its clock while the card is open. */
  onPause?: (paused: boolean) => void;
  only?: readonly SetupField[];
  title?: string;
  /** Replaces the generated words ("Every question of the Fried Liver Attack"). */
  summary?: string;
  /** "7 of 20"; none for a timed run. */
  progress?: { done: number; total: number };
  /** A checkpoint's set-up is fixed: the summary only. */
  fixed?: boolean;
  className?: string;
};

/**
 * One line above a running session saying what it was set up with, and Change, which opens the set-up card in its
 * place (docs/v2/components/practice-bar.md).
 */
export function PracticeBar({
  mode,
  config,
  sources,
  due,
  onStart,
  onPause,
  only,
  title,
  summary,
  progress,
  fixed,
  className,
}: PracticeBarProps) {
  const [open, setOpen] = useState(false);
  const info = MODE_INFO[mode];
  const Icon = info.icon;
  const close = () => {
    setOpen(false);
    onPause?.(false);
  };

  if (open) {
    return (
      <PracticeSetup
        mode={mode}
        initial={config}
        sources={sources}
        due={due}
        only={only}
        title={title}
        startLabel="Start again"
        onCancel={close}
        onStart={(next) => {
          close();
          onStart(next);
        }}
        className={className}
      />
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground', className)}>
      <Icon className={cn('size-4 shrink-0', info.text)} aria-label={info.name} />
      <span className="min-w-0">{summary ?? describeConfig(mode, config, sources)}</span>
      <span className="ml-auto flex items-center gap-2">
        {progress ? (
          <span className="tabular-nums">
            {progress.done} of {progress.total}
          </span>
        ) : null}
        {fixed ? null : (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => {
              setOpen(true);
              onPause?.(true);
            }}
          >
            <Settings2 aria-hidden />
            Change
          </Button>
        )}
      </span>
    </div>
  );
}
