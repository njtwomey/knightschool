/**
 * The URL hash carries view state (which variation is on the board, filters, the moves played so far) as
 * `#key=value&key=value`. Values are percent-encoded; empty values are left out, so a clear state is an empty hash.
 */
export type HashParams = Record<string, string>;

export function parseHash(hash: string): HashParams {
  const params: HashParams = {};
  const text = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const pair of text.split('&')) {
    if (!pair) continue;
    const at = pair.indexOf('=');
    const key = decodeURIComponent(at < 0 ? pair : pair.slice(0, at));
    let value = '';
    try {
      value = at < 0 ? '' : decodeURIComponent(pair.slice(at + 1));
    } catch {
      continue; // a damaged value is dropped rather than breaking the page
    }
    if (key && value) params[key] = value;
  }
  return params;
}

export function buildHash(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params)
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return pairs.length ? `#${pairs.join('&')}` : '';
}

/** Moves travel in the hash as `e2e4.e7e5`: UCI never contains a dot, and it stays short and readable. */
export const encodeMoves = (ucis: string[]) => ucis.join('.');
export const decodeMoves = (text: string | undefined) =>
  text ? text.split('.').filter((uci) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) : [];
