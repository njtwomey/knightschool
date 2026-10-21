import { courseProgress, inStudyOrder, type OpeningIndexEntry, type Side, type Tier } from '@knightschool/core';
import { useEffect } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrowse } from '@/features/browse/store';
import { useProgress } from '@/features/courses/progress';
import { CourseCard } from '@/features/openings/course-card';

const TIERS: { tier: Tier; title: string; note: string }[] = [
  { tier: 1, title: 'Study first', note: 'The core of a repertoire.' },
  { tier: 2, title: 'Next', note: 'The next openings to meet, and the main answers to them.' },
  { tier: 3, title: 'Alternatives and rare replies', note: 'Extra weapons and the odd moves people try.' },
];

/**
 * Every course and nothing else (/courses): Browse stripped down to the courses, for an overview of what there is to
 * learn. Grouped by the side you play, then by tier, in study order, each with how far through it you are.
 */
export function CoursesPage() {
  const index = useBrowse((state) => state.index);
  const openings = useBrowse((state) => state.openings);
  const status = useBrowse((state) => state.indexStatus);
  const error = useBrowse((state) => state.indexError);
  const learned = useProgress((state) => state.learned);
  useEffect(() => {
    void useProgress.getState().refresh();
  }, []);

  const total = courseProgress(index, learned);
  const sides: { side: Side; title: string }[] = [
    { side: 'white', title: 'You play White' },
    { side: 'black', title: 'You play Black' },
  ];
  const of = (side: Side, tier: Tier): OpeningIndexEntry[] =>
    inStudyOrder(index.filter((course) => course.side === side && course.tier === tier));

  return (
    <Page className="gap-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="text-muted-foreground">
          {index.length > 0
            ? `${index.length} courses, ${total.learned} of ${total.total} moves learned. Open one for its introduction, lines and tree.`
            : 'Every course, by the side you play.'}
        </p>
      </header>
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Could not load the courses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {status !== 'ready' && status !== 'error' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
      {status === 'ready' &&
        sides.map(({ side, title }) => (
          <section key={side} aria-labelledby={`courses-${side}`} className="grid gap-5">
            <h2 id={`courses-${side}`} className="border-b pb-2 text-xl font-semibold">
              {title}
            </h2>
            {TIERS.map(({ tier, title: tierTitle, note }) => {
              const courses = of(side, tier);
              if (courses.length === 0) return null;
              return (
                <div key={tier} className="grid gap-3">
                  <div>
                    <h3 className="font-medium">{tierTitle}</h3>
                    <p className="text-sm text-muted-foreground">{note}</p>
                  </div>
                  <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => (
                      <li key={course.id} className="contents">
                        <CourseCard course={course} openings={openings} learned={learned} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        ))}
    </Page>
  );
}
