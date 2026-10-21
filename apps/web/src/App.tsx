import {
  BarChart3,
  BookText,
  GitFork,
  GraduationCap,
  CircleUser,
  LayoutDashboard,
  Library,
  Menu,
  PenLine,
  Search,
  Settings,
  Telescope,
  Timer,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { PageErrorBoundary } from '@/components/error-boundary';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStorage } from '@/data/storage';
import { useCatalog } from '@/data/catalog-store';
import { CreditsPage } from '@/features/credits/credits-page';
import { LabPage } from '@/features/lab/lab-page';
import { CoursePage } from '@/features/course/course-page';
import { CoursePathPage } from '@/features/path/path-page';
import { CourseEditorPage } from '@/features/author/course-editor';
import { CreatePage } from '@/features/author/create-page';
import { LineEditorPage } from '@/features/author/line-page';
import { GlossaryPage } from '@/features/glossary/glossary-page';
import { CurriculumTreePage } from '@/features/tree/curriculum-tree-page';
import { CoursesPage } from '@/features/courses/courses-page';
import { CourseTreePage } from '@/features/tree/course-tree-page';
import { SearchPage } from '@/features/search/search-page';
import { LinePage } from '@/features/line/line-page';
import { GuessPage } from '@/features/guess/guess-page';
import { SpeedPage } from '@/features/speed/speed-page';
import { QuizPage } from '@/features/quiz/quiz-page';
import { HomePage } from '@/features/home/home-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { parseRoute, type Route } from '@/router/route';
import { navigate, to, usePathname } from '@/router/location';

export function App() {
  const pathname = usePathname();
  const route: Route = parseRoute(pathname);
  const selectCourse = useCatalog((state) => state.selectCourse);
  const loadIndex = useCatalog((state) => state.loadIndex);
  const courseId = route.page === 'course' ? route.id : null;
  const status = useStorage((state) => state.status);

  useEffect(() => {
    void loadIndex();
    void useStorage.getState().open();
  }, [loadIndex]);

  useEffect(() => {
    void selectCourse(courseId);
  }, [courseId, selectCourse]);

  // Writing courses was once a Profile tab; its old address shows Create.
  useEffect(() => {
    if (/^\/profile\/author\/?$/.test(pathname)) navigate('/create', { replace: true });
  }, [pathname]);

  // In the order you use them: find and look (Courses, Search, Tree), practise (Quiz, Speed, Name it), write your own
  // (Create), look things up (Glossary).
  const links: { href: string; label: string; active: boolean; icon: ReactNode; group: number }[] = [
    {
      href: to('/courses'),
      label: 'Courses',
      active: route.page === 'courses' || route.page === 'course',
      icon: <GraduationCap aria-hidden />,
      group: 0,
    },
    {
      href: to('/search'),
      label: 'Search',
      active: route.page === 'search' || route.page === 'play',
      icon: <Search aria-hidden />,
      group: 0,
    },
    { href: to('/tree'), label: 'Tree', active: route.page === 'tree', icon: <GitFork aria-hidden />, group: 0 },
    { href: to('/quiz'), label: 'Quiz', active: route.page === 'quiz', icon: <Library aria-hidden />, group: 1 },
    { href: to('/speed'), label: 'Speed', active: route.page === 'speed', icon: <Timer aria-hidden />, group: 1 },
    { href: to('/name'), label: 'Name it', active: route.page === 'guess', icon: <Telescope aria-hidden />, group: 1 },
    {
      href: to('/create'),
      label: 'Create',
      active: route.page === 'create' || route.page === 'create-course' || route.page === 'create-line',
      icon: <PenLine aria-hidden />,
      group: 2,
    },
    {
      href: to('/glossary'),
      label: 'Glossary',
      active: route.page === 'glossary',
      icon: <BookText aria-hidden />,
      group: 3,
    },
  ];
  const startsGroup = (i: number) => i > 0 && links[i]!.group !== links[i - 1]!.group;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* On a phone held sideways the header scrolls away, so the board can have the height. */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-2 backdrop-blur short:static">
        {/* Below md the links do not fit beside the name, so they move into a menu. */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 size-10 md:hidden" aria-label="Menu">
              <Menu className="size-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64" aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle>Knight School</SheetTitle>
            </SheetHeader>
            <nav className="grid gap-1 px-2" aria-label="Main">
              {links.map(({ href, label, active, icon }, i) => (
                <SheetClose asChild key={label}>
                  <Button
                    asChild
                    variant={active ? 'secondary' : 'ghost'}
                    className={`h-11 justify-start text-base ${startsGroup(i) ? 'mt-3' : ''}`}
                  >
                    <a href={href} aria-current={active ? 'page' : undefined}>
                      {icon}
                      {label}
                    </a>
                  </Button>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <a href={to('/')} className="flex min-w-0 items-center gap-2.5" aria-label="Knight School home">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-8" />
          <span className="truncate text-lg font-semibold">Knight School</span>
        </a>
        <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label="Main">
          {links.map(({ href, label, active, icon }, i) => (
            <Button
              key={label}
              asChild
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className={
                startsGroup(i)
                  ? 'ml-2 before:absolute before:-left-1.5 before:h-4 before:w-px before:bg-border relative'
                  : undefined
              }
            >
              <a href={href} aria-current={active ? 'page' : undefined}>
                {icon}
                {label}
              </a>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={route.page === 'profile' ? 'secondary' : 'ghost'}
                size="icon"
                className="pointer-coarse:size-10"
                aria-label="Profile"
              >
                <CircleUser className="size-5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <a href={to('/profile')}>
                  <LayoutDashboard aria-hidden /> Overview
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={to('/profile/stats')}>
                  <BarChart3 aria-hidden /> Stats
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={to('/profile/settings')}>
                  <Settings aria-hidden /> Settings
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>
      </header>
      {status === 'paused' && (
        <div
          className="flex flex-wrap items-center justify-center gap-3 border-b bg-secondary px-4 py-2 text-sm"
          role="status"
        >
          Knight School is open in another tab, so progress is paused here.
          <Button size="sm" onClick={() => void useStorage.getState().open()}>
            Use it in this tab
          </Button>
        </div>
      )}
      <main className="min-h-dvh flex-1">
        <PageErrorBoundary resetKey={pathname}>
          {route.page === 'home' && <HomePage />}
          {route.page === 'profile' && <ProfilePage tab={route.tab} />}
          {route.page === 'search' && <SearchPage />}
          {route.page === 'course' &&
            (route.tab === 'tree' ? (
              <CourseTreePage key={route.id} course={route.id} />
            ) : route.tab === 'path' ? (
              <CoursePathPage key={route.id} course={route.id} />
            ) : (
              <CoursePage courseId={route.id} />
            ))}
          {route.page === 'create' && <CreatePage />}
          {route.page === 'create-course' && <CourseEditorPage course={route.course} tab={route.tab} />}
          {route.page === 'create-line' && <LineEditorPage course={route.course} line={route.line} />}
          {route.page === 'glossary' && <GlossaryPage />}
          {route.page === 'tree' && <CurriculumTreePage />}
          {route.page === 'courses' && <CoursesPage />}
          {route.page === 'play' && (
            <LinePage
              key={`${route.course}/${route.line}/${route.tab}/${JSON.stringify(route.unit ?? null)}`}
              course={route.course}
              line={route.line}
              tab={route.tab}
              unit={route.unit}
            />
          )}
          {route.page === 'quiz' && <QuizPage />}
          {route.page === 'guess' && <GuessPage />}
          {route.page === 'speed' && <SpeedPage />}
          {route.page === 'credits' && <CreditsPage />}
          {route.page === 'lab' && <LabPage />}
        </PageErrorBoundary>
      </main>
      <SiteFooter />
    </div>
  );
}
