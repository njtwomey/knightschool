import { isCreateTab, type CreateTab } from '@/features/author/tabs';
import type { CourseTab } from '@/features/course/tabs';
import { parseLineTab, parseUnitRef, type LineTab, type UnitRef } from '@/features/line/tabs';

/** Profile's tabs: Overview, Stats and Settings. */
export type ProfileTab = 'overview' | 'stats' | 'settings';

export type Route =
  | { page: 'home' }
  | { page: 'profile'; tab: ProfileTab }
  | { page: 'openings' }
  | { page: 'courses' }
  | { page: 'course'; id: string; tab: CourseTab }
  /** Create: your courses (`/create`), one course's tab (`/create/<course>[/<tab>]`), a line (`/create/<course>/<line>`). */
  | { page: 'create' }
  | { page: 'create-course'; course: string; tab: CreateTab }
  | { page: 'create-line'; course: string; line: string }
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
      // Authoring was once a Profile tab: /profile/author is now Create.
      if (a === 'author') return { page: 'create' };
      return { page: 'profile', tab: a === 'stats' || a === 'settings' ? a : 'overview' };
    case 'create':
      if (!a || !slug.test(a)) return { page: 'create' };
      if (!b) return { page: 'create-course', course: a, tab: 'details' };
      if (isCreateTab(b)) return { page: 'create-course', course: a, tab: b };
      return slug.test(b)
        ? { page: 'create-line', course: a, line: b }
        : { page: 'create-course', course: a, tab: 'details' };
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
    case 'name':
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
