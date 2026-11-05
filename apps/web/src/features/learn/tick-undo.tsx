import { Undo2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { undoSettingChange, useLastSettingChange } from '@/data/settings';
import { isTickChange } from './use-ticks';

/**
 * The saved notice after a tick, with Undo (docs/v2/components/undo-button.md): it takes back a whole click, so a
 * variation ticked on top of a few steps goes back to those steps. It stays in view above the list without moving the
 * rows under the pointer: its own height is taken out of the page's flow.
 */
export function TickUndo() {
  const last = useLastSettingChange();
  const [since] = useState(() => Date.now());
  const [gone, setGone] = useState<number | null>(null);
  const tick = last && last.at >= since && last.id !== gone && isTickChange(last.label) ? last : null;
  const id = tick?.id ?? null;
  const dismiss = useCallback(() => setGone(id), [id]);
  return (
    <div className="sticky top-16 z-20 -mb-6 h-0">
      {tick ? (
        <Notice
          kind="saved"
          text={`${tick.label}.`}
          action={
            <Button variant="outline" size="xs" onClick={() => undoSettingChange()}>
              <Undo2 aria-hidden /> Undo
            </Button>
          }
          onDismiss={dismiss}
          onExpire={dismiss}
          className="ml-auto w-fit max-w-full bg-background shadow-md"
        />
      ) : null}
    </div>
  );
}
