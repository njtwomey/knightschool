import { useCallback, useEffect, useState } from 'react';
import { learnerStore } from '@/data/learner';
import { useSetting } from '@/data/settings';
import { siteConfig } from '@/data/site-config';

/**
 * Whether gates lock what follows for this opening: config `teach.gates`, unless the learner relaxed them
 * (`learning.gatesRelaxed`, on the opening layer or their own), when locked steps read "suggested later" and open
 * unasked (docs/v2/components/step-row.md).
 */
export function useGates(opening: string): boolean {
  const relaxed = useSetting('learning.gatesRelaxed', { opening }).value;
  return siteConfig.teach.gates && !relaxed;
}

/** The learner store's key for "Don't ask again for this opening" in the ask-once dialog. */
const skipAskKey = (opening: string) => `learn.skipAsk:${opening}`;

/**
 * "Start here?" is asked once per opening: once the learner ticks "Don't ask again for this opening", locked steps of
 * it open unasked. Kept in the learner's settings table, so it is exported with everything else.
 */
export function useSkipAsk(opening: string): [boolean, () => void] {
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    let live = true;
    void learnerStore()
      .then((store) => store.settings.get(skipAskKey(opening)))
      .then((value) => {
        if (live) setSkip(value === 'true');
      });
    return () => {
      live = false;
    };
  }, [opening]);
  const remember = useCallback(() => {
    setSkip(true);
    void learnerStore().then((store) => store.settings.set(skipAskKey(opening), 'true'));
  }, [opening]);
  return [skip, remember];
}
