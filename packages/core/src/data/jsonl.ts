/**
 * The committed data files (engine analysis, explorer counts, puzzle selections) are JSON Lines: a first line
 * `{"meta": {...}}` saying what the file is and how it was made, then one record per line, sorted by its key, so the
 * files carry no indentation and a change shows as the lines it touched (docs/v2/schemas/README.md).
 */
export function writeJsonl<M, R>(meta: M, rows: readonly R[]): string {
  return [JSON.stringify({ meta }), ...rows.map((row) => JSON.stringify(row))].join('\n') + '\n';
}

export function readJsonl<M, R>(text: string, file = 'the file'): { meta: M; rows: R[] } {
  const lines = text.split('\n').filter((line) => line.trim());
  const first = lines[0] ? (JSON.parse(lines[0]) as { meta?: M }) : {};
  if (!first.meta) throw new Error(`${file}: the first line must be {"meta": {...}}`);
  return {
    meta: first.meta,
    rows: lines.slice(1).map((line, i) => {
      try {
        return JSON.parse(line) as R;
      } catch {
        throw new Error(`${file}: line ${i + 2} is not JSON`);
      }
    }),
  };
}
