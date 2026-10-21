import { inStudyOrder } from '@knightschool/core';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Page } from '@/components/page';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBrowse } from '@/features/browse/store';
import { readHashState, setHashState } from '@/router/location';
import { TreeView } from './tree-view';

const ALL = 'all';

/**
 * Every line the courses teach, drawn as one tree from the first move down. A course can be picked to see only its
 * lines, and a search opens and rings the lines it matches. The address keeps all three, and the point picked.
 */
export function TreePage() {
  const index = useBrowse((state) => state.index);
  const [course, setCourse] = useState(() => readHashState().course ?? ALL);
  const [query, setQuery] = useState(() => readHashState().q ?? '');
  const [selected, setSelected] = useState<string | null>(() => readHashState().n ?? null);

  useEffect(() => {
    setHashState({ course: course === ALL ? undefined : course, q: query, n: selected ?? undefined });
  }, [course, query, selected]);

  const courses = course === ALL ? undefined : [course];
  return (
    <Page className="max-w-[96rem] gap-4">
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">The tree</h2>
        <p className="max-w-3xl text-muted-foreground">
          Every line in Knight School as one tree. The first move is at the top and each row down is one more move.
          Moves with no choice in them are written down the branch; a dot is where lines part or end.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a line…"
            aria-label="Find a line in the tree"
            className="pl-9"
          />
        </div>
        <Select
          value={course}
          onValueChange={(value) => {
            setCourse(value);
            setSelected(null);
          }}
        >
          <SelectTrigger aria-label="Course" className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Every course</SelectItem>
            <SelectSeparator />
            {inStudyOrder(index).map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TreeView
        courses={courses}
        query={query}
        depth={courses ? 99 : 2}
        preferCourse={courses?.[0]}
        selected={selected}
        onSelect={setSelected}
        beside
      />
    </Page>
  );
}
