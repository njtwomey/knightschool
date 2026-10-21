import { describe, expect, it } from 'vitest';
import { nextSort, sortRows, type Sort } from './sort';

type Key = 'order' | 'name' | 'edited';
const byOrder: Sort<Key> = { key: 'order', descending: false };
const newestFirst: Sort<Key> = { key: 'edited', descending: true };

describe('nextSort', () => {
  it.each([
    ['a new column sorts up', byOrder, 'name', byOrder, { key: 'name', descending: false }],
    [
      'a second click reverses it',
      { key: 'name', descending: false },
      'name',
      byOrder,
      { key: 'name', descending: true },
    ],
    ['a third goes back to the default', { key: 'name', descending: true }, 'name', byOrder, byOrder],
    [
      'another column starts again',
      { key: 'name', descending: true },
      'edited',
      byOrder,
      { key: 'edited', descending: false },
    ],
    [
      'the default column reverses the default',
      newestFirst,
      'edited',
      newestFirst,
      { key: 'edited', descending: false },
    ],
    ['and then puts it back', { key: 'edited', descending: false }, 'edited', newestFirst, newestFirst],
    [
      'moving to the default column gives the default',
      { key: 'name', descending: false },
      'edited',
      newestFirst,
      newestFirst,
    ],
  ] as [string, Sort<Key>, Key, Sort<Key>, Sort<Key>][])('%s', (_, current, key, initial, next) => {
    expect(nextSort(current, key, initial)).toEqual(next);
  });

  it('comes back to the default after three clicks on one column', () => {
    let sort = byOrder;
    for (let i = 0; i < 3; i++) sort = nextSort(sort, 'name', byOrder);
    expect(sort).toEqual(byOrder);
  });
});

describe('sortRows', () => {
  type Row = { name: string; order: number; edited: string };
  const rows: Row[] = [
    { name: 'b', order: 0, edited: '2' },
    { name: 'a', order: 1, edited: '1' },
    { name: 'b', order: 2, edited: '3' },
  ];
  const compare = {
    order: (x: Row, y: Row) => x.order - y.order,
    name: (x: Row, y: Row) => x.name.localeCompare(y.name),
    edited: (x: Row, y: Row) => x.edited.localeCompare(y.edited),
  };
  const fallback = compare.order;
  const orders = (sort: Sort<Key>) => sortRows(rows, compare, sort, fallback).map((row) => row.order);

  it.each([
    [byOrder, [0, 1, 2]],
    [{ key: 'name', descending: false }, [1, 0, 2]],
    // Reversed by name, but equal names keep the fallback's order rather than flipping too.
    [{ key: 'name', descending: true }, [0, 2, 1]],
    [newestFirst, [2, 0, 1]],
  ] as [Sort<Key>, number[]][])('%j', (sort, expected) => {
    expect(orders(sort)).toEqual(expected);
  });

  it('leaves the rows it was given alone', () => {
    sortRows(rows, compare, newestFirst);
    expect(rows.map((row) => row.order)).toEqual([0, 1, 2]);
  });
});
