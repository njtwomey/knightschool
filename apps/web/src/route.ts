import type { CourseTab } from '@/features/course/tabs';
import { parseLineTab, parseUnitRef, type LineTab, type UnitRef } from '@/features/line/tabs';

export type Route =
  | { page: 'home' }
  | { page: 'profile'; tab: 'overview' | 'stats' | 'settings' }
  | { page: 'openings' }
  | { page: 'courses' }
  | { page: 'course'; id: string; tab: CourseTab }
  /**
   * A line's page and tab; line `all` is the every-branch drill of the whole course. `unit` scopes Learn or Drill to one
   * unit of the study path (`/play/<course>/<line>/learn/<n>`), or some of its moves (`.../<n>/<first>-<last>`).
   */
  | { page: 'play'; course: string; line: string; tab: LineTab | 'branches'; unit?: UnitRef }
  | { page: 'review' }
  | { page: 'guess' }
  | { page: 'speed' }
  | { page: 'glossary' }
  | { page: 'tree' }
  | { page: 'credits' }
  | { page: 'lab' }
  | { page: 'settings' };

const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The page for a path such as `/course/caro-kann` (without the site's base). Unknown paths show the home page. */
/** Line ids that clashed when content became one tree (docs/TREE.md), so old links still open the line. */
const RENAMED_LINES: Record<string, string> = {
  'vs-e6-french/rare-third-moves': 'vs-e6-french-rare-third-moves',
  'caro-kann/exchange': 'caro-kann-exchange',
  'flank-and-irregular/odd-first-moves': 'flank-and-irregular-odd-first-moves',
  'queens-gambit/orthodox': 'queens-gambit-orthodox',
  'queens-gambit/albin': 'queens-gambit-albin',
};

export function parseRoute(pathname: string): Route {
  const [first, a, b, c, d, e] = pathname.split('/').filter(Boolean);
  switch (first) {
    case 'browse':
    case 'search':
    case 'openings':
      return { page: 'openings' };
    case 'courses':
      return { page: 'courses' };
    case 'profile':
      return { page: 'profile', tab: a === 'stats' ? 'stats' : a === 'settings' ? 'settings' : 'overview' };
    case 'overview':
    case 'today':
      return { page: 'profile', tab: 'overview' };
    case 'course':
      return a && slug.test(a)
        ? { page: 'course', id: a, tab: b === 'tree' || b === 'path' ? b : 'overview' }
        : { page: 'home' };
    case 'play':
      if (!a || !b || !slug.test(a) || !slug.test(b)) return { page: 'home' };
      {
        const tab = b === 'all' ? 'branches' : parseLineTab(c);
        const unit = tab === 'learn' || tab === 'drill' ? parseUnitRef(d, e) : undefined;
        return { page: 'play', course: a, line: RENAMED_LINES[`${a}/${b}`] ?? b, tab, ...(unit ? { unit } : {}) };
      }
    case 'quiz':
    case 'review':
      return { page: 'review' };
    case 'guess':
      return { page: 'guess' };
    case 'speed':
      return { page: 'speed' };
    case 'stats':
      return { page: 'profile', tab: 'stats' };
    case 'glossary':
      return { page: 'glossary' };
    case 'tree':
      return { page: 'tree' };
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
