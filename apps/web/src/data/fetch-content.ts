// Written by `pnpm content:build`. Served from the same origin, so offline caching can precache them.
export const contentUrl = (file: string) => `${import.meta.env.BASE_URL}content/${file}`;

/** A content file was asked for that is not there: a course that has been removed or renamed, or no build yet. */
export class MissingContent extends Error {}

/** One of the built content files, as JSON. Throws `MissingContent` when the host has no such file. */
export async function fetchContent(file: string): Promise<unknown> {
  const response = await fetch(contentUrl(file));
  // Hosts answer an unknown path with the app's own page (200 in dev, 404 on GitHub Pages), never with JSON.
  const isJson = (response.headers.get('content-type') ?? '').includes('json');
  if (!response.ok || !isJson)
    throw new MissingContent(`Could not load ${file} (${response.ok ? 'not found' : response.status}).`);
  return response.json();
}

/**
 * `load` run once and its promise shared by every caller, unless it fails: then the next call tries again, so a
 * dropped connection does not leave the page broken until a reload.
 */
export function onceRetryable<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    if (!pending) {
      const attempt = load();
      pending = attempt;
      attempt.catch(() => {
        if (pending === attempt) pending = undefined;
      });
    }
    return pending;
  };
}
