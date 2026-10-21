import { describe, expect, it } from 'vitest';
import { below, indexModel } from './index-model';

// As laneLayout would say: everything grows out of the first line, because it owns the first moves.
const parentOf = new Map<string, string | null>([
  ['giuoco', null],
  ['evans', 'giuoco'],
  ['evans-declined', 'evans'],
  ['french', 'giuoco'],
  ['french-tarrasch', 'french'],
  ['london', 'giuoco'],
]);
const ids = [...parentOf.keys()];
const opening: Record<string, string> = {
  giuoco: '1.e4 e5',
  evans: '1.e4 e5',
  'evans-declined': '1.e4 e5',
  french: '1.e4 e6',
  'french-tarrasch': '1.e4 e6',
  london: '1.d4 d5',
};

describe('indexModel', () => {
  it('keeps every line under the first one when not grouped', () => {
    const model = indexModel({ parentOf }, ids);
    expect(model.groups).toHaveLength(1);
    expect(model.groups[0]!.roots).toEqual(['giuoco']);
    expect(below(model, 'giuoco')).toHaveLength(5);
  });

  it('starts a new branch of the index where a line grows out of another group', () => {
    const model = indexModel({ parentOf }, ids, (id) => ({ key: opening[id]!, label: opening[id]! }));
    expect(model.groups.map((group) => [group.label, group.roots])).toEqual([
      ['1.e4 e5', ['giuoco']],
      ['1.e4 e6', ['french']],
      ['1.d4 d5', ['london']],
    ]);
    // Folding the Giuoco Piano hides only what the index shows under it.
    expect(below(model, 'giuoco')).toEqual(['evans', 'evans-declined']);
    expect(below(model, 'french')).toEqual(['french-tarrasch']);
    expect(model.parent.get('french')).toBeNull();
  });
});
