import { inStudyOrder } from '@knightschool/core';
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrowse } from '@/features/browse/store';
import { courseHref } from '@/features/course/tabs';
import { navigate } from '@/router/location';
import { TreeExplorer, type ExplorerLine } from './tree-explorer';
import { useMoveTree } from './use-move-tree';

/**
 * Every line of every course as one tree (/tree): intentionally big. Lines come in study order, each course's lines in
 * teaching order, so the first course's main line runs across the top. Each line opens in the first course (in study
 * order) that teaches it. A course picker jumps to that course's own tree.
 */
export function CurriculumTreePage() {
  const { loaded, error } = useMoveTree();
  const index = useBrowse((state) => state.index);
  const courses = useMemo(() => inStudyOrder(index), [index]);
  const lines = useMemo<ExplorerLine[]>(() => {
    if (!loaded) return [];
    const seen = new Set<string>();
    const out: ExplorerLine[] = [];
    for (const course of courses)
      for (const line of course.lines) {
        if (seen.has(line.id) || !loaded.tree.paths.has(line.id)) continue;
        seen.add(line.id);
        out.push({ id: line.id, name: loaded.tree.paths.get(line.id)!.name, course: course.id, side: course.side });
      }
    return out;
  }, [loaded, courses]);

  const header = (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold">The tree</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Every line in Knight School as one tree: {lines.length} lines from {courses.length} courses. Each column is a
        move; each lane a line, branching off where it leaves the lines above it.
      </p>
    </div>
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
  if (!loaded || lines.length === 0)
    return (
      <div className="grid gap-4 p-4">
        {header}
        <Skeleton className="h-[32rem]" />
      </div>
    );
  return (
    <TreeExplorer
      tree={loaded.tree}
      lines={lines}
      header={header}
      search
      zoom={0.3}
      aside={
        <Select onValueChange={(course) => navigate(courseHref(course, 'tree'))}>
          <SelectTrigger className="h-8 w-full" aria-label="Open one course's tree">
            <SelectValue placeholder="One course's tree..." />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name} ({course.side})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );
}
