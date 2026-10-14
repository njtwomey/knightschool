import { describe, expect, it } from 'vitest';
import { parseRoute } from './route';

describe('parseRoute', () => {
  it.each([
    ['/', { page: 'home' }],
    ['', { page: 'home' }],
    ['/browse', { page: 'openings' }],
    ['/search', { page: 'openings' }],
    ['/courses', { page: 'openings' }],
    ['/course/caro-kann-panov', { page: 'course', id: 'caro-kann-panov' }],
    [
      '/play/italian-game/two-knights/learn',
      { page: 'play', course: 'italian-game', line: 'two-knights', mode: 'learn' },
    ],
    [
      '/play/italian-game/two-knights/practice',
      { page: 'play', course: 'italian-game', line: 'two-knights', mode: 'practice' },
    ],
    ['/play/italian-game/two-knights', { page: 'play', course: 'italian-game', line: 'two-knights', mode: 'practice' }],
    ['/play/caro-kann/all/branches', { page: 'play', course: 'caro-kann', line: 'all', mode: 'branches' }],
    ['/play/caro-kann/all/learn', { page: 'play', course: 'caro-kann', line: 'all', mode: 'branches' }],
    ['/quiz', { page: 'review' }],
    ['/review', { page: 'review' }],
    ['/guess', { page: 'guess' }],
    ['/glossary', { page: 'glossary' }],
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
