import { Timer } from 'lucide-react';
import { isPassed } from '@/data/course-path';
import { rushSource, useSpeed } from '@/features/speed/store';
import type { SessionType } from './types';

/** Opening rush: Speed, with lines made only of the units of this course already passed. */
export const openingRush: SessionType = {
  id: 'opening-rush',
  name: 'Opening rush',
  blurb: 'Speed, from the units you have passed: play them from memory against the clock.',
  icon: Timer,
  pick({ content, path }) {
    const passed = path.units.filter((unit) => isPassed(path.progress.get(unit.id)));
    if (passed.length === 0) return { ready: false, reason: 'Pass a unit first: the rush only asks what you know.' };
    return {
      ready: true,
      summary: `${passed.length} passed ${passed.length === 1 ? 'unit' : 'units'} to play.`,
      href: '/speed',
      prepare: () => {
        const speed = useSpeed.getState();
        speed.setConfig({ ...speed.config, source: rushSource(content.opening.id) });
        speed.openSetup();
      },
    };
  },
};
