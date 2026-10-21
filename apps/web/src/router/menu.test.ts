import { describe, expect, it } from 'vitest';
import { headerItemOf } from './menu';
import { parseRoute } from './route';

describe('headerItemOf', () => {
  it.each([
    ['/', null],
    ['/courses', 'courses'],
    ['/course/italian-game', 'courses'],
    ['/course/italian-game/path', 'courses'],
    ['/course/italian-game/tree', 'courses'],
    ['/play/italian-game/two-knights/about', 'courses'],
    ['/play/italian-game/two-knights/learn', 'courses'],
    ['/play/italian-game/two-knights/learn/2', 'courses'],
    ['/play/italian-game/two-knights/drill', 'courses'],
    ['/play/italian-game/two-knights/quiz', 'courses'],
    ['/play/italian-game/two-knights/tree', 'courses'],
    ['/play/italian-game/all/branches', 'courses'],
    ['/search', 'search'],
    ['/browse', 'search'],
    ['/tree', 'tree'],
    ['/quiz', 'quiz'],
    ['/review', 'quiz'],
    ['/speed', 'speed'],
    ['/name', 'name-it'],
    ['/create', 'create'],
    ['/create/my-course', 'create'],
    ['/create/my-course/lines', 'create'],
    ['/create/my-course/my-line', 'create'],
    ['/profile/author', 'create'],
    ['/glossary', 'glossary'],
    ['/profile', 'profile'],
    ['/profile/stats', 'profile'],
    ['/settings', 'profile'],
    ['/credits', null],
    ['/lab', null],
  ])('%s is %s', (path, item) => {
    expect(headerItemOf(parseRoute(path))).toBe(item);
  });
});
