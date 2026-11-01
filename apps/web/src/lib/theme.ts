import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'knightschool.theme';

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

const preferred = (): Theme =>
  stored() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/** Light or dark, remembered on this device; the `dark` class on <html> switches the tokens. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(preferred);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Private windows may refuse storage; the theme still applies for this visit.
    }
  }, [theme]);
  return [theme, setTheme];
}
