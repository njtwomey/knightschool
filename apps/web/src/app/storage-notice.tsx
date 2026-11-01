import { RotateCcw } from 'lucide-react';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { useStorageStatus } from '@/data/storage';

/**
 * A banner under the header when progress is not being saved: the database could not be opened (kept in memory for
 * this tab only), or another tab took it over. Reloading takes it back.
 */
export function StorageNotice() {
  const status = useStorageStatus();
  if (status.state !== 'memory' && status.state !== 'lost') return null;
  return (
    <Notice
      kind={status.state === 'lost' ? 'paused' : 'problem'}
      scope="site"
      text={status.message}
      action={
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw aria-hidden /> {status.state === 'lost' ? 'Use it in this tab' : 'Try again'}
        </Button>
      }
    />
  );
}
