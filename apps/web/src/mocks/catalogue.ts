import readme from '../../../../docs/v2/components/README.md?raw';

export type CatalogueEntry = { id: string; name: string; group: string; summary: string };

/**
 * Every component the plan lists, read from docs/v2/components/README.md, so the gallery always shows the whole plan:
 * built components open, the rest show as planned.
 */
export const CATALOGUE: CatalogueEntry[] = (() => {
  const entries: CatalogueEntry[] = [];
  let group = '';
  for (const line of readme.split('\n')) {
    const heading = /^## (.+)$/.exec(line);
    if (heading) group = heading[1]!.trim();
    const row = /^\|\s*\[([\w-]+)\.md\]\([\w-]+\.md\)\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (row && group && group !== 'How each file is written') {
      const id = row[1]!;
      const name = id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
      entries.push({ id, name, group, summary: row[2]! });
    }
  }
  return entries;
})();

export const specUrl = (id: string) => `https://github.com/njtwomey/knightschool/blob/v2/docs/v2/components/${id}.md`;
