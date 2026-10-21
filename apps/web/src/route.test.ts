import { describe, expect, it } from 'vitest';
import { parseRoute } from './route';

describe('parseRoute', () => {
  it.each([
    ['/', { page: 'home' }],
    ['', { page: 'home' }],
    ['/browse', { page: 'openings' }],
    ['/search', { page: 'openings' }],
    ['/courses', { page: 'openings' }],
    ['/course/caro-kann-panov', { page: 'course', id: 'caro-kann-panov', tab: 'overview' }],
    ['/course/caro-kann-panov/tree', { page: 'course', id: 'caro-kann-panov', tab: 'tree' }],
    [
      '/play/italian-game/two-knights/learn',
      { page: 'play', course: 'italian-game', line: 'two-knights', tab: 'learn' },
    ],
    [
      '/play/italian-game/two-knights/practice',
      { page: 'play', course: 'italian-game', line: 'two-knights', tab: 'drill' },
    ],
    ['/play/italian-game/two-knights', { page: 'play', course: 'italian-game', line: 'two-knights', tab: 'about' }],
    [
      '/play/italian-game/two-knights/drill',
      { page: 'play', course: 'italian-game', line: 'two-knights', tab: 'drill' },
    ],
    ['/play/italian-game/two-knights/quiz', { page: 'play', course: 'italian-game', line: 'two-knights', tab: 'quiz' }],
    ['/play/italian-game/two-knights/tree', { page: 'play', course: 'italian-game', line: 'two-knights', tab: 'tree' }],
    [
      '/play/italian-game/two-knights/about',
      { page: 'play', course: 'italian-game', line: 'two-knights', tab: 'about' },
    ],
    ['/play/caro-kann/exchange/learn', { page: 'play', course: 'caro-kann', line: 'caro-kann-exchange', tab: 'learn' }],
    ['/play/qgd/exchange/learn', { page: 'play', course: 'qgd', line: 'exchange', tab: 'learn' }],
    ['/play/caro-kann/all/branches', { page: 'play', course: 'caro-kann', line: 'all', tab: 'branches' }],
    ['/play/caro-kann/all/learn', { page: 'play', course: 'caro-kann', line: 'all', tab: 'branches' }],
    ['/quiz', { page: 'review' }],
    ['/review', { page: 'review' }],
    ['/guess', { page: 'guess' }],
    ['/glossary', { page: 'glossary' }],
    ['/tree', { page: 'tree' }],
    ['/speed', { page: 'speed' }],
    ['/overview', { page: 'profile', tab: 'overview' }],
    ['/profile', { page: 'profile', tab: 'overview' }],
    ['/profile/stats', { page: 'profile', tab: 'stats' }],
    ['/profile/settings', { page: 'profile', tab: 'settings' }],
    ['/today', { page: 'profile', tab: 'overview' }],
    ['/stats', { page: 'profile', tab: 'stats' }],
    ['/credits', { page: 'credits' }],
    ['/lab', { page: 'lab' }],
    ['/settings', { page: 'profile', tab: 'settings' }],
    ['/course', { page: 'home' }],
    ['/course/Not Valid', { page: 'home' }],
    ['/play/italian-game', { page: 'home' }],
    ['/nonsense', { page: 'home' }],
  ])('%s', (path, route) => {
    expect(parseRoute(path)).toEqual(route);
  });
});
