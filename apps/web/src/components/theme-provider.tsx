import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'knightschool.theme';

type ThemeContextValue = {
  /** What the person chose; 'system' follows the device. */
  theme: Theme;
  /** What is on screen right now. */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// localStorage can throw (private windows, blocked site data), so the theme must work without it.
function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolved, setResolved] = useState(() => resolve(theme));

  useEffect(() => {
    const apply = () => {
      const next = resolve(theme);
      document.documentElement.classList.toggle('dark', next === 'dark');
      setResolved(next);
    };
    apply();
    if (theme !== 'system') return;
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onChange = apply;
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
