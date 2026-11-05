import type { BuiltOpening } from '@knightschool/core/content';
import { IDEA_KINDS, type Idea } from '@/components/chess/idea-badge';
import { plainText } from '@/components/chess/rich-text';
import {
  openingRole,
  type PositionLine,
  type SearchItem,
  type SearchLineKind,
  type SearchRole,
} from '@/components/finding/search';
import type { LineData } from '@/components/openings/line-row';
import type { OpeningSummary, Side, Thumb } from '@/components/openings/types';
import { loadCatalog, loadNames, loadOpening, type Catalog } from '@/data/content';
import { siteConfig } from '@/data/site-config';
import { branchPly, lineMoves } from '@/features/learn/model';
import { lineHref, lineViews, openingHref, openingSummary, variationHref } from '@/features/learn/views';

/** What a result draws, beside what the search ranks it by. */
export type ResultView =
  | { kind: 'opening'; opening: OpeningSummary }
  | { kind: 'variation'; name: string; opening: string; side: Side; lines: number; thumb: Thumb; href: string }
  | { kind: 'line'; line: LineData }
  | { kind: 'idea'; idea: Idea; openings: { name: string; href: string }[] };

export type SearchData = {
  /** Everything searchable: openings in study order, variations, lines by kind, then ideas by kind. */
  items: SearchItem[];
  /** Every line for the board search, in the same order. */
  lines: PositionLine[];
  views: Map<string, ResultView>;
};

const plain = (texts: readonly (string | undefined)[]) =>
  texts
    .filter((text): text is string => Boolean(text))
    .map((text) => plainText(text))
    .join(' ');

const lineKindOf = (kind: BuiltOpening['lines'][number]['kind']): SearchLineKind => (kind === 'danger' ? 'trap' : kind);

/** The openings in the order to study them: the tracks' order, then any no track lists. */
function inStudyOrder(catalog: Catalog) {
  const ids = [...new Set(catalog.tracks.flatMap((track) => track.openings))];
  const rank = (id: string) => (ids.includes(id) ? ids.indexOf(id) : ids.length);
  return [...catalog.openings].sort((a, b) => rank(a.id) - rank(b.id));
}

/**
 * The text of a line: what is said about the moves that are its own (from where it branches, so a comment on a shared
 * move finds the line that first plays it, not every line after it), and its steps and follow-ups.
 */
function commentsOf(opening: BuiltOpening, lineId: string, ideaNames: ReadonlyMap<string, string>) {
  const texts: (string | undefined)[] = [];
  for (const move of lineMoves(opening, lineId).slice(branchPly(opening, lineId))) {
    texts.push(move.note?.text, ...(move.note?.ideas ?? []).map((id) => ideaNames.get(id)));
    for (const refutation of opening.positions[move.before]?.refutations ?? []) {
      texts.push(refutation.note?.text, ...refutation.then.map((reply) => reply.note?.text));
    }
  }
  const steps = opening.steps.filter((step) => step.line === lineId);
  for (const step of steps) texts.push(step.title, step.text);
  for (const followUp of opening.followUps ?? []) {
    if (steps.some((step) => step.id === followUp.step)) texts.push(...followUp.notes.map((note) => note?.text));
  }
  return plain(texts);
}

/** The position a variation's lines share, for its thumb. */
function sharedPosition(opening: BuiltOpening, lines: readonly string[], side: Side): Thumb {
  const runs = lines.map((id) => lineMoves(opening, id));
  const first = runs[0] ?? [];
  let same = 0;
  while (first[same] && runs.every((run) => run[same]?.uci === first[same]!.uci)) same++;
  const last = first[same - 1];
  return {
    epd: last?.after ?? opening.startEpd,
    ...(last ? { lastMove: { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) } } : {}),
    orientation: side,
  };
}

/** Builds what the page searches. Pure over the catalog and openings; nothing here needs the chess library. */
export function buildSearchData(catalog: Catalog, openings: readonly BuiltOpening[]): SearchData {
  const views = new Map<string, ResultView>();
  const ideaNames = new Map(catalog.ideas.map((idea) => [idea.id, idea.name]));
  const entries = new Map(catalog.openings.map((entry) => [entry.id, entry]));
  const openingItems: SearchItem[] = [];
  const variationItems: SearchItem[] = [];
  const lineItems: { item: SearchItem; position: PositionLine; lineKind: SearchLineKind }[] = [];

  for (const opening of openings) {
    const entry = entries.get(opening.id);
    if (!entry) continue;
    const who = { sides: [opening.side], roles: [openingRole(opening.side, opening.startPly)] };
    const lineId = (id: string) => `line:${opening.id}/${id}`;
    const lineViewsOf = new Map(lineViews(opening, new Map()).map((line) => [line.id, line]));
    const nameOf = (id: string) => lineViewsOf.get(id)?.name ?? id;

    const id = `opening:${opening.id}`;
    openingItems.push({
      id,
      kind: 'opening',
      name: opening.name,
      href: openingHref(opening.id),
      inside: opening.lines.map((line) => nameOf(line.id)),
      description: plain([opening.summary, opening.about.idea, opening.about.risks, opening.about.suits]),
      comments: plain([opening.about.origin]),
      lines: opening.lines.map((line) => lineId(line.id)),
      ...who,
    });
    views.set(id, { kind: 'opening', opening: openingSummary(entry) });

    for (const variation of opening.variations) {
      const id = `variation:${opening.id}/${variation.id}`;
      const name = variation.name ?? variation.id;
      const href = variationHref(opening.id, variation.id);
      variationItems.push({
        id,
        kind: 'variation',
        name,
        href,
        opening: opening.name,
        inside: variation.lines.map(nameOf),
        description: plain([variation.intro, ...variation.plans]),
        lines: variation.lines.map(lineId),
        ...who,
      });
      views.set(id, {
        kind: 'variation',
        name,
        opening: opening.name,
        side: opening.side,
        lines: variation.lines.length,
        thumb: sharedPosition(opening, variation.lines, opening.side),
        href,
      });
    }

    for (const line of opening.lines) {
      const view = lineViewsOf.get(line.id);
      if (!view) continue;
      const id = lineId(line.id);
      const lineKind = lineKindOf(line.kind);
      const branch = branchPly(opening, line.id);
      views.set(id, { kind: 'line', line: { ...view, opening: opening.name } });
      lineItems.push({
        lineKind,
        item: {
          id,
          kind: 'line',
          name: view.name,
          href: view.href,
          opening: opening.name,
          variation: view.variation,
          comments: commentsOf(opening, line.id, ideaNames),
          rare: line.kind === 'rare',
          lineKind,
          ...who,
        },
        position: {
          id,
          name: view.name,
          opening: opening.name,
          kind: view.kind,
          writtenFor: opening.side,
          moves: lineMoves(opening, line.id),
          // The line page's board starts where the line branches; before that it opens there.
          href: (ply) => (ply > branch ? `${lineHref(opening.id, line.id, 'learn')}&m=${ply - branch}` : view.href),
        },
      });
    }
  }

  // Sorted without changing the study order inside a kind; a kind the config leaves out comes last.
  const { lineOrder } = siteConfig.search;
  const rank = (kind: SearchLineKind) => (lineOrder.includes(kind) ? lineOrder.indexOf(kind) : lineOrder.length);
  const sorted = [...lineItems].sort((a, b) => rank(a.lineKind) - rank(b.lineKind));

  const kinds = Object.keys(IDEA_KINDS);
  const ideas = [...catalog.ideas].sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind));
  const ideaItems = ideas.flatMap((idea): SearchItem[] => {
    const teaching = openings.filter((opening) => opening.ideas.includes(idea.id));
    const first = teaching[0];
    if (!first) return [];
    const id = `idea:${idea.id}`;
    views.set(id, {
      kind: 'idea',
      idea: { id: idea.id, name: idea.name, kind: idea.kind, summary: idea.summary },
      openings: teaching.map((opening) => ({ name: opening.name, href: openingHref(opening.id) })),
    });
    const roles = teaching.map((opening): SearchRole => openingRole(opening.side, opening.startPly));
    return [
      {
        id,
        kind: 'idea',
        name: idea.name,
        // No idea pages yet: an idea opens the first opening that teaches it.
        href: openingHref(first.id),
        description: plain([idea.summary]),
        sides: [...new Set(teaching.map((opening) => opening.side))],
        roles: [...new Set(roles)],
      },
    ];
  });

  return {
    items: [...openingItems, ...variationItems, ...sorted.map((line) => line.item), ...ideaItems],
    lines: sorted.map((line) => line.position),
    views,
  };
}

let built: Promise<SearchData> | undefined;

/** Everything search needs, loaded the first time the page opens and kept for the visit; never the facts files. */
export function loadSearchData(): Promise<SearchData> {
  built ??= (async () => {
    const catalog = await loadCatalog();
    const openings = await Promise.all(inStudyOrder(catalog).map((entry) => loadOpening(entry.id)));
    return buildSearchData(catalog, openings);
  })();
  built.catch(() => {
    built = undefined;
  });
  return built;
}

/** The Lichess name of every position in the openings, for the board search; loaded only once it is opened. */
export async function loadPositionNames(): Promise<Map<string, string>> {
  const catalog = await loadCatalog();
  const files = await Promise.all(catalog.openings.map((entry) => loadNames(entry.id)));
  const names = new Map<string, string>();
  for (const file of files) {
    for (const [epd, found] of Object.entries(file.positions)) {
      const name = found[0]?.name;
      if (name && !names.has(epd)) names.set(epd, name);
    }
  }
  return names;
}
