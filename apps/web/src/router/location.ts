import { useSyncExternalStore } from 'react';
import { buildHash, parseHash, type HashParams } from './hash';

/** Where the site is served from: '' at the root, '/knightschool' on a project site. Paths below are without it. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** A link target for a path inside the site, e.g. `to('/opening/caro-kann')`. */
export const to = (path: string) => `${BASE}${path}`;

export const stripBase = (pathname: string) =>
  BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname;

type Snapshot = { pathname: string; hash: string };

let snapshot: Snapshot = read();
const listeners = new Set<() => void>();

function read(): Snapshot {
  return { pathname: stripBase(window.location.pathname), hash: window.location.hash };
}

function publish() {
  const next = read();
  if (next.pathname === snapshot.pathname && next.hash === snapshot.hash) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

/** Goes to a path (with an optional ?query or #hash). Pushes a history entry unless `replace` is set. */
export function navigate(target: string, { replace = false }: { replace?: boolean } = {}) {
  const url = target.startsWith(BASE) || !target.startsWith('/') ? target : to(target);
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  publish();
  window.scrollTo(0, 0);
}

/**
 * Writes view state into the hash of the current page without adding a history entry, so refreshing or sharing the link
 * restores it. Pages call this as their state changes; it never moves the page.
 */
export function setHashState(params: Record<string, string | undefined>) {
  const hash = buildHash(params);
  if (hash === window.location.hash || (hash === '' && window.location.hash === '')) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
  publish();
}

/** The view state in the current hash. Read it when a page opens; it is not reactive to the page's own writes. */
export const readHashState = (): HashParams => parseHash(window.location.hash);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current page's path (without the base). Re-renders on navigation, back and forward. */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => snapshot.pathname);
}

/**
 * Makes ordinary `<a href>` links navigate inside the site without a reload (and leaves modified clicks, new-tab links
 * and other sites alone), follows back and forward, and upgrades old `#/route` links to real paths.
 */
export function startRouter(): () => void {
  const legacy = /^#\/(.+)$/.exec(window.location.hash);
  if (legacy) window.history.replaceState(null, '', to(`/${legacy[1]}`));
  snapshot = read();

  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as Element | null)?.closest?.('a');
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || (BASE && !url.pathname.startsWith(BASE))) return;
    event.preventDefault();
    navigate(`${url.pathname}${url.search}${url.hash}`);
  };
  const onChange = () => publish();
  document.addEventListener('click', onClick);
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
  };
}
