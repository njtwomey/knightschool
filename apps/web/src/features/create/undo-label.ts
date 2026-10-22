import type { AuthoredChange } from '@knightschool/core';
import { undoTarget } from '@knightschool/storage';
import type { AuthoredRows } from '@/data/authored-content';

/**
 * What Undo would take back, in a few words ("delete line 2...Bc5", "change to course My Scotch"), from the newest
 * action not yet undone. Null when there is nothing to undo.
 */
export function describeUndo(
  history: AuthoredChange[],
  rows: AuthoredRows,
  labels: Record<string, string> = {},
  imported: ReadonlySet<string> = new Set(),
): string | null {
  const target = undoTarget(history, imported);
  if (!target) return null;
  // The name the action was saved with; older actions are described from what they changed.
  const named = labels[target];
  if (named) return named;
  const group = history.filter((row) => row.group === target);
  const now = (row: AuthoredChange) =>
    (row.kind === 'chapter' ? rows.chapters : rows.courses).find((item) => item.id === row.itemId);
  const what = (row: AuthoredChange) => (row.kind === 'chapter' ? 'line' : 'course');
  const name = (row: AuthoredChange) => {
    const item = now(row);
    if (!item) return row.itemId;
    if ('pgn' in item)
      return /\[Variation "((?:[^"\\]|\\.)*)"\]/.exec(item.pgn)?.[1]?.replace(/\\"/g, '"') ?? row.itemId;
    try {
      return (JSON.parse(item.manifest) as { name?: string }).name ?? row.itemId;
    } catch {
      return row.itemId;
    }
  };
  const isDeleted = (row: AuthoredChange) => Boolean(now(row)?.deletedAt && !row.beforeDeletedAt);
  // A deleted course names the action, not the lines that went with it.
  const deleted = group.find((row) => isDeleted(row) && row.kind === 'course') ?? group.find(isDeleted);
  if (deleted) return `delete ${what(deleted)} ${name(deleted)}`;
  const created =
    group.find((row) => row.before === null && row.kind === 'course') ?? group.find((row) => row.before === null);
  if (created) return `make ${what(created)} ${name(created)}`;
  const changed = group.find((row) => row.kind === 'chapter') ?? group[0]!;
  return `change to ${what(changed)} ${name(changed)}`;
}
