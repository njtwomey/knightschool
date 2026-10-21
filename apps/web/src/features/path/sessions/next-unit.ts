import { BookOpen } from 'lucide-react';
import { currentUnit, nothingLeft, unitLabel, type SessionType } from './types';
import { lineHref } from '@/router/hrefs';

/** Next unit: learn the first unit ready to start, or drill the one being learned. Learn ends with "Now drill it". */
export const nextUnit: SessionType = {
  id: 'next-unit',
  name: 'Next unit',
  blurb: 'Learn the next unit with every move shown, then drill it from memory.',
  icon: BookOpen,
  pick({ content, path }) {
    const current = currentUnit(path);
    if (!current) return { ready: false, reason: nothingLeft(path) };
    const { unit, progress } = current;
    const learn = progress.state === 'unlocked';
    return {
      ready: true,
      summary: `${learn ? 'Learn' : 'Drill'} ${unitLabel(content, unit)}.`,
      href: lineHref(content.opening.id, unit.line, learn ? 'learn' : 'drill', { n: unit.n }),
    };
  },
};
