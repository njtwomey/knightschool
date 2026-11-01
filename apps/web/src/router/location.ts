import { useSyncExternalStore } from 'react';

/** The site may be served under a base path (a GitHub Pages project site); routes are written without it. */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const to = (path: string): string => `${BASE}${path}`;

const current = () => window.location.pathname.slice(BASE.length) || '/';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function navigate(path: string): void {
  window.history.pushState(null, '', to(path));
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

/** The current path without the base, kept in step with the address bar. */
export const usePath = (): string => useSyncExternalStore(subscribe, current);

/** Plain links navigate without a reload: one listener on the document picks up clicks on same-site anchors. */
export function startRouter(): void {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const anchor = (event.target as Element | null)?.closest('a');
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE)) return;
    event.preventDefault();
    window.history.pushState(null, '', url.pathname + url.search + url.hash);
    notify();
  });
}
