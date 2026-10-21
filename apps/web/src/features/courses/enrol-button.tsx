import { GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStorage } from '@/data/storage';
import { IconAction } from '@/components/icon-action';
import { getEnrolled, setEnrolled } from '@/data/training-settings';

/** Adds or removes a course from the set that the Overview and the quiz use. */
export function EnrolButton({ openingId }: { openingId: string }) {
  const storage = useStorage((state) => state.storage?.storage);
  const [enrolled, setEnrolledState] = useState<boolean | null>(null);

  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    void getEnrolled(storage).then((ids) => !cancelled && setEnrolledState(ids.includes(openingId)));
    return () => {
      cancelled = true;
    };
  }, [storage, openingId]);

  async function toggle() {
    if (!storage || enrolled === null) return;
    const ids = await getEnrolled(storage);
    const next = enrolled ? ids.filter((id) => id !== openingId) : [...ids, openingId];
    await setEnrolled(storage, next, new Date());
    setEnrolledState(!enrolled);
  }

  return (
    <IconAction
      label={enrolled ? 'In my quiz. Click to remove it.' : 'Add to my quiz'}
      pressed={enrolled === true}
      disabled={enrolled === null}
      onClick={toggle}
    >
      <GraduationCap aria-hidden />
    </IconAction>
  );
}
