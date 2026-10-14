import type { PlayMode } from '@/features/play/store';

export type Route =
  | { page: 'home' }
  | { page: 'profile'; tab: 'overview' | 'stats' | 'settings' }
  | { page: 'openings' }
  | { page: 'opening'; id: string }
  | { page: 'motif'; id: string }
  | { page: 'course'; id: string }
  | { page: 'play'; course: string; line: string; mode: PlayMode }
  | { page: 'review' }
  | { page: 'guess' }
  | { page: 'credits' }
  | { page: 'lab' }
  | { page: 'settings' };

const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The page for a path such as `/opening/caro-kann` (without the site's base). Unknown paths show the home page. */
export function parseRoute(pathname: string): Route {
  const [first, a, b, c] = pathname.split('/').filter(Boolean);
  switch (first) {
    case 'browse':
    case 'search':
    case 'openings':
    case 'courses':
      return { page: 'openings' };
    case 'profile':
      return { page: 'profile', tab: a === 'stats' ? 'stats' : a === 'settings' ? 'settings' : 'overview' };
    case 'overview':
    case 'today':
      return { page: 'profile', tab: 'overview' };
    case 'opening':
      return a && slug.test(a) ? { page: 'opening', id: a } : { page: 'openings' };
    case 'motif':
      return a && slug.test(a) ? { page: 'motif', id: a } : { page: 'openings' };
    case 'course':
      return a && slug.test(a) ? { page: 'course', id: a } : { page: 'home' };
    case 'play':
      return a && b && slug.test(a) && slug.test(b)
        ? { page: 'play', course: a, line: b, mode: b === 'all' ? 'branches' : c === 'learn' ? 'learn' : 'practice' }
        : { page: 'home' };
    case 'quiz':
    case 'review':
      return { page: 'review' };
    case 'guess':
      return { page: 'guess' };
    case 'stats':
      return { page: 'profile', tab: 'stats' };
    case 'credits':
      return { page: 'credits' };
    case 'lab':
      return { page: 'lab' };
    case 'settings':
      return { page: 'profile', tab: 'settings' };
    default:
      return { page: 'home' };
  }
}
