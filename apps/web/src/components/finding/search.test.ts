import { describe, expect, it } from 'vitest';
import {
  indexLines,
  linesAt,
  nearestName,
  nextMoves,
  openingRole,
  passesKind,
  passesScope,
  passesWho,
  quoteFrom,
  searchItems,
  throughPosition,
  type PositionLine,
  type SearchItem,
} from './search';

const RANKING = { weights: { name: 100, inside: 60, opening: 40, description: 20, comment: 10 }, rarePenalty: 15 };

const item = (id: string, kind: SearchItem['kind'], name: string, more: Partial<SearchItem> = {}): SearchItem => ({
  id,
  kind,
  name,
  href: `/${id}`,
  ...more,
});

const ITEMS: SearchItem[] = [
  item('caro', 'opening', 'Caro-Kann Defence', {
    inside: ['Advance: the bishops come off', 'Fantasy Variation'],
    description: 'The c6 pawn backs up d5.',
    comments: 'Karpov played it for years.',
  }),
  item('italian', 'opening', 'Italian Game', {
    inside: ['Fried Liver Attack'],
    description: 'Quick development aimed at f7.',
  }),
  item('fried', 'line', 'Fried Liver Attack', {
    opening: 'Italian Game',
    variation: 'Two Knights',
    comments: 'The knight sacrifice on f7 drags the king out.',
  }),
  item('quiet', 'line', 'Giuoco Piano: the quiet main line', {
    opening: 'Italian Game',
    variation: 'Giuoco Piano',
    comments: 'Black can block the check. White plays calmly while Black castles.',
  }),
  item('fork', 'idea', 'Fork', { description: 'One piece attacks two at once.' }),
  item('pin', 'idea', 'Pin', { description: 'A piece cannot move without exposing what is behind it, like a fork.' }),
];

const names = (query: string, items = ITEMS) => searchItems(items, query, RANKING).map((r) => r.item.id);
const why = (query: string, id: string) => searchItems(ITEMS, query, RANKING).find((r) => r.item.id === id);

describe('searchItems', () => {
  it('ranks a title above a description, and a description above a comment', () => {
    expect(names('fork')).toEqual(['fork', 'pin']);
    const items = [
      item('comment', 'line', 'Alpha', { comments: 'A note on the outpost.' }),
      item('description', 'variation', 'Beta', { description: 'The outpost on e5.' }),
      item('name', 'idea', 'Outpost'),
    ];
    expect(names('outpost', items)).toEqual(['name', 'description', 'comment']);
  });

  it('never lets a slip in a name fall below an exact match in a description', () => {
    const items = [
      item('text', 'opening', 'Alpha', { description: 'The Scandinavian comes up.' }),
      item('name', 'line', 'Scandanavian Defence'),
    ];
    expect(names('scandinavian', items)).toEqual(['name', 'text']);
  });

  it('puts the whole name first, then a name that starts with the query', () => {
    const items = [
      item('line', 'line', 'Giuoco Piano: the pin with Bg4'),
      item('start', 'line', 'Pin the knight'),
      item('idea', 'idea', 'Pin'),
    ];
    expect(names('pin', items)).toEqual(['idea', 'start', 'line']);
  });

  it('says why each result matched', () => {
    expect(why('fried liver', 'fried')?.why).toBe('Name');
    expect(why('fried liver', 'italian')?.why).toBe('Lines inside: Fried Liver Attack');
    expect(why('italian', 'quiet')?.why).toBe('In the Italian Game');
    expect(why('two knights', 'fried')?.why).toBe('In the Two Knights');
    expect(why('development', 'italian')?.why).toBe('In its description');
    expect(why('karpov', 'caro')?.why).toBe('In its comments');
  });

  it('quotes the sentence that matched in prose', () => {
    expect(why('sacrifice', 'fried')?.quote).toBe('The knight sacrifice on f7 drags the king out.');
    expect(why('calmly', 'quiet')?.quote).toBe('White plays calmly while Black castles.');
    expect(quoteFrom(`${'long words '.repeat(30)}end.`, 'long').length).toBeLessThanOrEqual(140);
  });

  it('forgives words run together and slips in names', () => {
    expect(names('carokann')).toContain('caro');
    expect(names('friedliver')[0]).toBe('fried');
    expect(why('italain', 'italian')?.why).toBe("Close to 'Italian'");
  });

  it('forgives no slips in prose, where they find the wrong word', () => {
    expect(names('bloke')).toEqual([]);
    expect(names('blacks')).toEqual([]);
  });

  it('finds words spread across fields, and every word must match', () => {
    const found = why('italian fried liver', 'fried');
    expect(found?.why).toBe('In the name and the Italian Game');
    expect(names('italian fried liver')[0]).toBe('fried');
    expect(names('italian zebra')).toEqual([]);
  });

  it('ranks rare lines lower', () => {
    const items = [item('rare', 'line', 'Outpost line', { rare: true }), item('usual', 'line', 'Outpost line')];
    expect(names('outpost', items)).toEqual(['usual', 'rare']);
  });

  it('keeps the order given on equal scores', () => {
    const items = [
      item('main', 'line', 'A', { opening: 'London System' }),
      item('side', 'line', 'B', { opening: 'London System' }),
    ];
    expect(names('london', items)).toEqual(['main', 'side']);
  });

  it('finds nothing for an empty query', () => {
    expect(names('  - ')).toEqual([]);
  });
});

describe('nearestName', () => {
  it('offers the closest name', () => {
    expect(nearestName(ITEMS, 'karo')).toBe('Caro-Kann Defence');
    expect(nearestName(ITEMS, 'karokann')).toBe('Caro-Kann Defence');
  });

  it('offers nothing when nothing is close', () => {
    expect(nearestName(ITEMS, 'xyz')).toBeNull();
    expect(nearestName(ITEMS, 'qq')).toBeNull();
  });
});

describe('filters', () => {
  it('works out who plays an opening from its side and the moves it is named for', () => {
    expect(openingRole('white', 5)).toBe('play'); // Italian Game: 3.Bc4 is White's
    expect(openingRole('black', 5)).toBe('against'); // the Italian, as Black
    expect(openingRole('black', 2)).toBe('play'); // Caro-Kann: 1...c6 is Black's
    expect(openingRole('white', 2)).toBe('against');
    expect(openingRole('white', 0)).toBe('play');
  });

  it('passes an item without sides or roles', () => {
    const idea = item('idea', 'idea', 'Fork');
    expect(passesWho(idea, { side: 'white', role: 'play' })).toBe(true);
  });

  it('filters by side and role', () => {
    const line = item('line', 'line', 'A', { sides: ['black'], roles: ['play'] });
    expect(passesWho(line, { side: 'all', role: 'all' })).toBe(true);
    expect(passesWho(line, { side: 'white', role: 'all' })).toBe(false);
    expect(passesWho(line, { side: 'black', role: 'against' })).toBe(false);
  });

  it('filters by scope', () => {
    expect(passesScope(ITEMS[0]!, 'all')).toBe(true);
    expect(passesScope(ITEMS[0]!, 'openings')).toBe(true);
    expect(passesScope(ITEMS[0]!, 'lines')).toBe(false);
  });

  it('narrows to lines of a kind, as nothing else has one', () => {
    const line = item('line', 'line', 'A', { lineKind: 'trap' });
    expect(passesKind(line, 'trap')).toBe(true);
    expect(passesKind(line, 'main')).toBe(false);
    expect(passesKind(ITEMS[0]!, 'main')).toBe(false);
    expect(passesKind(ITEMS[0]!, 'all')).toBe(true);
  });
});

describe('by position', () => {
  const START = 'start';
  const position = (id: string, moves: [string, string][], kind: PositionLine['kind'] = 'main'): PositionLine => {
    let before = START;
    return {
      id,
      name: id,
      opening: 'Italian Game',
      kind,
      moves: moves.map(([uci, after]) => {
        const move = { san: uci, uci, before, after };
        before = after;
        return move;
      }),
      href: (ply) => `/${id}/${ply}`,
    };
  };
  // Two orders to the same position: 1.e4 e5 2.Bc4 Nc6 3.Nf3 and 1.e4 e5 2.Nf3 Nc6 3.Bc4.
  const direct = position('direct', [
    ['e2e4', 'a'],
    ['e7e5', 'b'],
    ['g1f3', 'c'],
    ['b8c6', 'd'],
    ['f1c4', 'italian'],
  ]);
  const other = position('other', [
    ['e2e4', 'a'],
    ['e7e5', 'b'],
    ['f1c4', 'c2'],
    ['b8c6', 'd2'],
    ['g1f3', 'italian'],
    ['f8c5', 'giuoco'],
  ]);
  const trap = position('trap', [['d2d4', 'z']], 'for-us');
  const index = indexLines([direct, other, trap]);
  const played = direct.moves.map((move) => ({ uci: move.uci }));

  it('finds every line through a position, transpositions included', () => {
    const hits = linesAt(index, 'italian', played);
    expect(hits.map((hit) => [hit.line.id, hit.ply, hit.transposed])).toEqual([
      ['direct', 5, false],
      ['other', 5, true],
    ]);
  });

  it('finds no line through a position none reaches', () => {
    expect(linesAt(index, 'nowhere', [])).toEqual([]);
  });

  it('finds every line at the start, once each', () => {
    expect(linesAt(index, START, []).map((hit) => hit.line.id)).toEqual(['direct', 'other', 'trap']);
  });

  it('filters lines from traps', () => {
    expect(linesAt(index, START, [], 'traps').map((hit) => hit.line.id)).toEqual(['trap']);
    expect(linesAt(index, START, [], 'lines').map((hit) => hit.line.id)).toEqual(['direct', 'other']);
  });

  it('counts the moves played next, the most travelled first', () => {
    const next = nextMoves(linesAt(index, START, []));
    expect(next.map((move) => [move.uci, move.lines])).toEqual([
      ['e2e4', 2],
      ['d2d4', 1],
    ]);
    expect(nextMoves(linesAt(index, 'giuoco', []))).toEqual([]);
  });

  it('leaves the lines through a position and what holds them, never ideas', () => {
    const items = [
      item('line:direct', 'line', 'Direct'),
      item('line:trap', 'line', 'Trap'),
      item('opening', 'opening', 'Italian Game', { lines: ['line:direct', 'line:trap'] }),
      item('other-opening', 'opening', 'London', { lines: ['line:trap'] }),
      item('idea', 'idea', 'Fork'),
    ];
    const lines = [{ ...direct, id: 'line:direct' }];
    const hits = linesAt(indexLines(lines), 'italian', played);
    expect(throughPosition(items, hits).map((found) => found.id)).toEqual(['line:direct', 'opening']);
  });
});
