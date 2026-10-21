/** An authored course's pages in Create: its details, its lines, its path and publishing. */
export const CREATE_TABS = [
  { tab: 'details', name: 'Details', blurb: 'Name, side, introduction, plans, motifs and groups.' },
  { tab: 'lines', name: 'Lines', blurb: 'Every line of the course: add, rename, copy, delete, open to edit.' },
  { tab: 'path', name: 'Path', blurb: 'The order to study the lines in, and what is a bonus.' },
  { tab: 'publish', name: 'Publish', blurb: 'Propose the course for the app.' },
] as const;
export type CreateTab = (typeof CREATE_TABS)[number]['tab'];

const TAB_NAMES: readonly string[] = CREATE_TABS.map((item) => item.tab);
/** Is this the last part of a course's address in Create a tab (rather than a line)? */
export const isCreateTab = (segment: string): segment is CreateTab => TAB_NAMES.includes(segment);

/** `/create/<course>` (its details) or `/create/<course>/<tab>`. */
export const createHref = (course: string, tab: CreateTab = 'details') =>
  tab === 'details' ? `/create/${course}` : `/create/${course}/${tab}`;

/** `/create/<course>/<line>`: the line editor. */
export const lineEditHref = (course: string, line: string) => `/create/${course}/${line}`;
