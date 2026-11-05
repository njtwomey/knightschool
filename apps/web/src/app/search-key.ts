import { useEffect } from 'react';
import { keyTaken } from '@/components/board/key-owner';
import { navigate, usePath } from '@/router/location';

const SEARCH_PAGES = ['/explore/search', '/search', '/browse'];

/** `/` opens search from anywhere (docs/v2/navigation/shortcuts.md); on the search page the box takes it itself. */
export function useSearchKey() {
  const path = usePath();
  useEffect(() => {
    if (SEARCH_PAGES.includes(path)) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || keyTaken(event) || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      navigate('/explore/search');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [path]);
}
