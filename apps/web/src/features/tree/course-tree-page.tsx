import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseBreadcrumbs, PlayBreadcrumbs } from '@/features/browse/breadcrumbs';
import { useBrowse } from '@/features/browse/store';
import { TreeExplorer, type ExplorerLine } from './tree-explorer';
import { useMoveTree } from './use-move-tree';

/** A course's lines as a tree (/course/<id>/tree), or a line's Tree tab with that line picked. */
export function CourseTreePage({ course, line }: { course: string; line?: string }) {
  const { loaded, error } = useMoveTree();
  const entry = useBrowse((state) => state.index.find((candidate) => candidate.id === course));
  const lines = useMemo<ExplorerLine[]>(
    () =>
      (entry?.lines ?? [])
        .filter((candidate) => loaded?.tree.paths.has(candidate.id))
        .map((candidate) => ({ id: candidate.id, name: candidate.name, course, side: entry!.side })),
    [entry, loaded, course],
  );
  const header =
    line !== undefined ? (
      <PlayBreadcrumbs course={course} line={line} tab="tree" />
    ) : (
      <CourseBreadcrumbs course={course} tab="tree" />
    );
  if (error)
    return (
      <div className="grid gap-4 p-4">
        {header}
        <Alert variant="destructive">
          <AlertTitle>Could not draw the tree</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  if (!loaded || !entry || lines.length === 0)
    return (
      <div className="grid gap-4 p-4">
        {header}
        <Skeleton className="h-[32rem]" />
      </div>
    );
  return (
    <TreeExplorer
      key={course}
      tree={loaded.tree}
      lines={lines}
      header={header}
      picked={line}
      orientation={entry.side}
      shortNames
    />
  );
}
