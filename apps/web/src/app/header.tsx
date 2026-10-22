import {
  BarChart3,
  BookText,
  CircleUser,
  GitFork,
  GraduationCap,
  LayoutDashboard,
  Library,
  Menu,
  PenLine,
  Search,
  Settings,
  Telescope,
  Timer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useStorage } from '@/data/storage';
import { profileHref } from '@/router/hrefs';
import { to } from '@/router/location';
import { headerItemOf, type HeaderItem } from '@/router/menu';
import type { Route } from '@/router/route';

/** The site header: the name, the menu (a sheet on a phone), the profile menu and the theme toggle. */
export function SiteHeader({ route }: { route: Route }) {
  // In the order you use them: find and look (Courses, Search, Tree), practise (Quiz, Speed, Name it), write your own
  // (Create), look things up (Glossary).
  const links: { item: HeaderItem; href: string; label: string; icon: ReactNode; group: number }[] = [
    { item: 'courses', href: to('/courses'), label: 'Courses', icon: <GraduationCap aria-hidden />, group: 0 },
    { item: 'search', href: to('/search'), label: 'Search', icon: <Search aria-hidden />, group: 0 },
    { item: 'tree', href: to('/tree'), label: 'Tree', icon: <GitFork aria-hidden />, group: 0 },
    { item: 'quiz', href: to('/quiz'), label: 'Quiz', icon: <Library aria-hidden />, group: 1 },
    { item: 'speed', href: to('/speed'), label: 'Speed', icon: <Timer aria-hidden />, group: 1 },
    { item: 'name-it', href: to('/name'), label: 'Name it', icon: <Telescope aria-hidden />, group: 1 },
    { item: 'create', href: to('/create'), label: 'Create', icon: <PenLine aria-hidden />, group: 2 },
    { item: 'glossary', href: to('/glossary'), label: 'Glossary', icon: <BookText aria-hidden />, group: 3 },
  ];
  const here = headerItemOf(route);
  const startsGroup = (i: number) => i > 0 && links[i]!.group !== links[i - 1]!.group;

  return (
    <>
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
              {links.map(({ item, href, label, icon }, i) => (
                <SheetClose asChild key={label}>
                  <Button
                    asChild
                    variant={item === here ? 'secondary' : 'ghost'}
                    className={`h-11 justify-start text-base ${startsGroup(i) ? 'mt-3' : ''}`}
                  >
                    <a href={href} aria-current={item === here ? 'page' : undefined}>
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
          {links.map(({ item, href, label, icon }, i) => (
            <Button
              key={label}
              asChild
              variant={item === here ? 'secondary' : 'ghost'}
              size="sm"
              className={
                startsGroup(i)
                  ? 'ml-2 before:absolute before:-left-1.5 before:h-4 before:w-px before:bg-border relative'
                  : undefined
              }
            >
              <a href={href} aria-current={item === here ? 'page' : undefined}>
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
                variant={here === 'profile' ? 'secondary' : 'ghost'}
                size="icon"
                className="pointer-coarse:size-10"
                aria-label="Profile"
              >
                <CircleUser className="size-5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <a href={to(profileHref())}>
                  <LayoutDashboard aria-hidden /> Overview
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={to(profileHref('stats'))}>
                  <BarChart3 aria-hidden /> Stats
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={to(profileHref('settings'))}>
                  <Settings aria-hidden /> Settings
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}

/** Shown while another tab has the database: progress is paused here until it is taken back. */
export function PausedBanner() {
  const status = useStorage((state) => state.status);
  if (status !== 'paused') return null;
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3 border-b bg-secondary px-4 py-2 text-sm"
      role="status"
    >
      Knight School is open in another tab, so progress is paused here.
      <Button size="sm" onClick={() => void useStorage.getState().open()}>
        Use it in this tab
      </Button>
    </div>
  );
}
