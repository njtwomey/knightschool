import { LayoutGrid, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';
import { to } from '@/router/location';

export function Header() {
  const [theme, setTheme] = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <a href={to('/')} className="flex items-center gap-2.5" aria-label="Knight School home">
          <img src={to('/icon.svg')} alt="" className="size-8" />
          <span className="text-lg font-semibold">Knight School</span>
        </a>
        <nav className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <a href={to('/mocks')}>
              <LayoutGrid aria-hidden /> Mocks
            </a>
          </Button>
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
