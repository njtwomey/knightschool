import type { LaneLayout } from '@knightschool/core';

/** A group of lines in the index: lines that start with the same moves ("1.e4 e5"), or every line when not grouped. */
type IndexGroup = { key: string; label: string; roots: string[]; lines: string[] };

/**
 * The index beside a tree: lines in groups, each line under the line it grows out of when that line is in the same
 * group (a line that branches off another group's line starts its own branch of the index). Folding and focusing use
 * this shape, so what the index puts under a line is exactly what folding that line hides.
 */
export type IndexModel = {
  groups: IndexGroup[];
  parent: ReadonlyMap<string, string | null>;
  children: ReadonlyMap<string, string[]>;
  groupOf: ReadonlyMap<string, string>;
};

export function indexModel(
  layout: Pick<LaneLayout, 'parentOf'>,
  ids: readonly string[],
  groupKey: (id: string) => { key: string; label: string } = () => ({ key: '', label: '' }),
): IndexModel {
  const groupOf = new Map<string, string>();
  const groups = new Map<string, IndexGroup>();
  for (const id of ids) {
    const { key, label } = groupKey(id);
    groupOf.set(id, key);
    if (!groups.has(key)) groups.set(key, { key, label, roots: [], lines: [] });
    groups.get(key)!.lines.push(id);
  }
  const parent = new Map<string, string | null>();
  const children = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const id of ids) {
    const above = layout.parentOf.get(id) ?? null;
    const own = above !== null && groupOf.get(above) === groupOf.get(id) && children.has(above) ? above : null;
    parent.set(id, own);
    if (own) children.get(own)!.push(id);
    else groups.get(groupOf.get(id)!)!.roots.push(id);
  }
  return { groups: [...groups.values()], parent, children, groupOf };
}

/** Every line under a line in the index, at any depth (not the line itself). */
export function below(model: IndexModel, id: string): string[] {
  const out: string[] = [];
  const walk = (at: string) => {
    for (const child of model.children.get(at) ?? []) {
      out.push(child);
      walk(child);
    }
  };
  walk(id);
  return out;
}
