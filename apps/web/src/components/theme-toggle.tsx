import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';

/** Flips between light and dark. "Match my device" lives on the Settings page. */
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      className="pointer-coarse:size-10"
      aria-label={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
    >
      {resolved === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </Button>
  );
}
