/** What an author says about a move (docs/v2/schemas/annotations.md): every part optional. */
export type Note = {
  text?: string;
  nag?: number[];
  arrows?: string[];
  circles?: string[];
  icons?: string[];
  tags?: string[];
  ideas?: string[];
};

const list = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
    .map((item) => String(item).trim())
    .filter(Boolean);

/**
 * A note from the parser's comment and commands. Standard `[%cal]` / `[%csl]` arrive as lists; our own `[%icon]`,
 * `[%tag]` and `[%idea]` as strings, comma-separated. Empty parts are left out, and an empty note is undefined.
 */
export function noteFrom(diag: Record<string, unknown> | null | undefined, nags: readonly string[] | null | undefined) {
  const note: Note = {};
  const text = typeof diag?.comment === 'string' ? diag.comment.replace(/\s+/g, ' ').trim() : '';
  if (text) note.text = text;
  const nag = (nags ?? []).map((value) => Number(value.replace('$', ''))).filter((value) => value > 0);
  if (nag.length) note.nag = nag;
  const parts = {
    arrows: list(diag?.colorArrows),
    circles: list(diag?.colorFields),
    icons: list(diag?.icon),
    tags: list(diag?.tag),
    ideas: list(diag?.idea),
  };
  for (const [key, value] of Object.entries(parts)) if (value.length) note[key as keyof typeof parts] = value;
  return Object.keys(note).length ? note : undefined;
}

/** NAGs 2 (?) and 4 (??): a move marked this way, first in a variation, makes it a refutation. */
export const isWrongNag = (nag: readonly number[] | undefined) =>
  (nag ?? []).some((value) => value === 2 || value === 4);
