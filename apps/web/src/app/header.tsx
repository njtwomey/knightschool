import { BookMarked, BookOpen, Dumbbell, Moon, Search, Settings, Sun, SunMedium, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';
import { useSearchKey } from '@/app/search-key';
import { to, usePath } from '@/router/location';

const under = (root: string) => (path: string) => path === root || path.startsWith(`${root}/`);

/** The menu. The page you are on is marked, however deep: the first part of its address says which item it is under. */
const NAV: { label: string; href: string; icon: LucideIcon; match: (path: string) => boolean }[] = [
  { label: 'Today', href: '/today', icon: SunMedium, match: (path) => path === '/today' },
  { label: 'Openings', href: '/openings', icon: BookOpen, match: under('/openings') },
  { label: 'Repertoire', href: '/repertoire', icon: BookMarked, match: under('/repertoire') },
  { label: 'Search', href: '/explore/search', icon: Search, match: under('/explore') },
  { label: 'Practice', href: '/practice', icon: Dumbbell, match: under('/practice') },
  { label: 'Settings', href: '/settings', icon: Settings, match: under('/settings') },
];

export function Header() {
  const [theme, setTheme] = useTheme();
  const path = usePath();
  useSearchKey();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4">
        <a href={to('/')} className="flex items-center gap-2.5" aria-label="Knight School home">
          <img src={to('/icon.svg')} alt="" className="size-8" />
          <span className="text-lg font-semibold">Knight School</span>
        </a>
        <nav className="ml-auto flex items-center gap-1">
          {NAV.map(({ label, href, icon: Icon, match }) => {
            const here = match(path);
            return (
              <Button key={href} asChild variant={here ? 'secondary' : 'ghost'} size="sm">
                <a href={to(href)} aria-current={here ? 'page' : undefined}>
                  <Icon aria-hidden /> {label}
                </a>
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === 'dark' ? 'Use the light theme' : 'Use the dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
