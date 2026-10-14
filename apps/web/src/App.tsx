import { BarChart3, CircleUser, LayoutDashboard, Library, Search, Settings, Telescope, Timer } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStorage } from '@/data/storage';
import { useBrowse } from '@/features/browse/store';
import { CreditsPage } from '@/features/credits/credits-page';
import { LabPage } from '@/features/lab/lab-page';
import { CoursePage } from '@/features/course/course-page';
import { GlossaryPage } from '@/features/glossary/glossary-page';
import { OpeningsPage } from '@/features/openings/openings-page';
import { PlayPage } from '@/features/play/play-page';
import { GuessPage } from '@/features/guess/guess-page';
import { SpeedPage } from '@/features/speed/speed-page';
import { ReviewPage } from '@/features/review/review-page';
import { HomePage } from '@/features/home/home-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { parseRoute, type Route } from '@/route';
import { to, usePathname } from '@/router/location';

function useRoute(): Route {
  return parseRoute(usePathname());
}

export function App() {
  const route = useRoute();
  const selectCourse = useBrowse((state) => state.selectCourse);
  const loadIndex = useBrowse((state) => state.loadIndex);
  const courseId = route.page === 'course' ? route.id : null;
  const status = useStorage((state) => state.status);

  useEffect(() => {
    void loadIndex();
    void useStorage.getState().open();
  }, [loadIndex]);

  useEffect(() => {
    void selectCourse(courseId);
  }, [courseId, selectCourse]);

  const link = (href: string, label: string, active: boolean, icon: ReactNode) => (
    <Button asChild variant={active ? 'secondary' : 'ghost'} size="sm">
      <a href={href} aria-current={active ? 'page' : undefined}>
        {icon}
        {label}
      </a>
    </Button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-2 backdrop-blur">
        <a href={to('/')} className="flex items-center gap-2.5" aria-label="Knight School home">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-8" />
          <span className="hidden text-lg font-semibold sm:block">Knight School</span>
        </a>
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto" aria-label="Main">
          {link(
            to('/browse'),
            'Browse',
            route.page === 'openings' || route.page === 'course' || route.page === 'play' || route.page === 'glossary',
            <Search aria-hidden />,
          )}
          {link(to('/quiz'), 'Quiz', route.page === 'review', <Library aria-hidden />)}
          {link(to('/guess'), 'Guess', route.page === 'guess', <Telescope aria-hidden />)}
          {link(to('/speed'), 'Speed', route.page === 'speed', <Timer aria-hidden />)}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={route.page === 'profile' ? 'secondary' : 'ghost'} size="icon" aria-label="Profile">
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
        {route.page === 'home' && <HomePage />}
        {route.page === 'profile' && <ProfilePage tab={route.tab} />}
        {route.page === 'openings' && <OpeningsPage />}
        {route.page === 'course' && <CoursePage courseId={route.id} />}
        {route.page === 'glossary' && <GlossaryPage />}
        {route.page === 'play' && <PlayPage course={route.course} line={route.line} mode={route.mode} />}
        {route.page === 'review' && <ReviewPage />}
        {route.page === 'guess' && <GuessPage />}
        {route.page === 'speed' && <SpeedPage />}
        {route.page === 'credits' && <CreditsPage />}
        {route.page === 'lab' && <LabPage />}
      </main>
      <SiteFooter />
    </div>
  );
}
