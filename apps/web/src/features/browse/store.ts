import {
  continueLine,
  nodeAt,
  pathFromUcis,
  playUci,
  variantPath,
  type Family,
  type LineEdge,
  type OpeningContent,
  type OpeningIndexEntry,
} from '@knightschool/core';
import { create } from 'zustand';
import { loadFamilies, loadIndex, loadOpening } from '@/data/content';

type Status = 'idle' | 'loading' | 'ready' | 'error';

type BrowseState = {
  index: OpeningIndexEntry[];
  /** The openings that courses are grouped under, in listing order. */
  families: Family[];
  indexStatus: Status;
  indexError: string | null;
  /** The opening whose page is open, and every course of it, loaded. */
  familyId: string | null;
  contents: Record<string, OpeningContent>;
  /** The course shown on the board (`content` is its data). */
  openingId: string | null;
  /** The variation last put on the board with "Show", so a refresh or shared link can show the same one. */
  shownVariant: string | null;
  content: OpeningContent | null;
  contentStatus: Status;
  contentError: string | null;
  /** Moves from the start position to the one on the board. Always the start of `line`. */
  path: LineEdge[];
  /** The whole line being looked at: `path` and the moves after it. Stays put while stepping within it. */
  line: LineEdge[];
  /** Set when the learner tries a move that is not in the opening; cleared on the next navigation. */
  notice: string | null;

  loadIndex: () => Promise<void>;
  /** Opens an opening's page: loads all its courses and puts the first on the board. */
  selectFamily: (id: string | null) => Promise<void>;
  /** Puts a variation of one of the open opening's courses on the board, at its last move. */
  showLine: (courseId: string, lineId: string) => void;
  /** Puts a saved view back: a course, optionally a variation, and the moves played so far. Unknown parts are ignored. */
  restoreView: (view: { course?: string; variant?: string; moves: string[] }) => void;
  setPath: (path: LineEdge[]) => void;
  stepBack: () => void;
  stepForward: () => void;
  toStart: () => void;
  toEnd: () => void;
  /** Plays a move on the board if the opening has it. Returns false and sets `notice` otherwise. */
  tryMove: (uci: string) => boolean;
};

export const useBrowse = create<BrowseState>((set, get) => ({
  index: [],
  families: [],
  indexStatus: 'idle',
  indexError: null,
  familyId: null,
  contents: {},
  openingId: null,
  shownVariant: null,
  content: null,
  contentStatus: 'idle',
  contentError: null,
  path: [],
  line: [],
  notice: null,

  async loadIndex() {
    if (get().indexStatus === 'loading' || get().indexStatus === 'ready') return;
    set({ indexStatus: 'loading', indexError: null });
    try {
      const [index, families] = await Promise.all([loadIndex(), loadFamilies()]);
      set({ index, families, indexStatus: 'ready' });
    } catch (error) {
      set({ indexStatus: 'error', indexError: error instanceof Error ? error.message : String(error) });
    }
  },

  async selectFamily(id) {
    if (id === get().familyId) return;
    set({
      familyId: id,
      contents: {},
      openingId: null,
      shownVariant: null,
      path: [],
      line: [],
      notice: null,
      content: null,
      contentError: null,
    });
    if (!id) {
      set({ contentStatus: 'idle' });
      return;
    }
    set({ contentStatus: 'loading' });
    try {
      await get().loadIndex();
      // loadIndex may still be running from App's effect: wait for it before looking the opening up.
      while (get().indexStatus === 'loading') await new Promise((resolve) => setTimeout(resolve, 20));
      const family = get().families.find((candidate) => candidate.id === id);
      if (!family) throw new Error(`There is no opening called "${id}".`);
      const loaded = await Promise.all(family.courses.map((course) => loadOpening(course)));
      if (get().familyId !== id) return;
      const contents = Object.fromEntries(loaded.map((content) => [content.opening.id, content]));
      // The course that teaches the opening itself goes on the board first, else the first course.
      const first = loaded.find((content) => !content.opening.against && !content.opening.motif) ?? loaded[0]!;
      set({
        contents,
        content: first,
        openingId: first.opening.id,
        line: continueLine(first, []),
        contentStatus: 'ready',
      });
    } catch (error) {
      if (get().familyId === id) {
        set({ contentStatus: 'error', contentError: error instanceof Error ? error.message : String(error) });
      }
    }
  },

  showLine(courseId, lineId) {
    const content = get().contents[courseId];
    if (!content) return;
    const path = variantPath(content, lineId);
    set({ content, openingId: courseId, shownVariant: lineId, path, line: path, notice: null });
  },

  restoreView({ course, variant, moves }) {
    const { contents } = get();
    const content = (course && contents[course]) || get().content;
    if (!content) return;
    const path = pathFromUcis(content, moves);
    // Keep stepping along the variation that was shown, when the moves still fit it.
    const shown =
      variant && content.opening.variants.some((candidate) => candidate.id === variant)
        ? variantPath(content, variant)
        : null;
    const fits = shown !== null && path.every((edge, i) => shown[i]?.uci === edge.uci);
    set({
      content,
      openingId: content.opening.id,
      shownVariant: fits ? (variant ?? null) : null,
      path,
      line: fits ? shown : continueLine(content, path),
      notice: null,
    });
  },

  setPath: (path) => set((state) => withPath(state, path)),
  stepBack: () => set((state) => ({ path: state.path.slice(0, -1), notice: null })),
  toStart: () => set({ path: [], notice: null }),

  stepForward() {
    const { line, path } = get();
    const next = line[path.length];
    if (next) set({ path: [...path, next], notice: null });
  },

  toEnd: () => set((state) => ({ path: state.line, notice: null })),

  tryMove(uci) {
    const { content, path } = get();
    if (!content) return false;
    const epd = currentEpd(content, path);
    // A pawn reaching the last rank is sent without a piece; the opening decides which promotion it knows.
    const edge = nodeAt(content, epd).moves.find((move) => move.uci === uci || move.uci.startsWith(uci));
    if (edge) {
      set((state) => withPath(state, [...path, edge]));
      return true;
    }
    let san = uci;
    try {
      san = playUci(epd, uci).san;
    } catch {
      set({ notice: 'That move is not legal here.' });
      return false;
    }
    set({ notice: `${san} is not in this opening. Pick one of the moves in the list, or step forward.` });
    return false;
  },
}));

type Position = Pick<BrowseState, 'content' | 'line'>;

/** Moves to a path. The displayed line is kept when the path is within it, and follows the path otherwise. */
function withPath(state: Position, path: LineEdge[]): Pick<BrowseState, 'path' | 'line' | 'notice'> {
  const within = path.every((edge, i) => state.line[i]?.uci === edge.uci);
  return { path, line: within || !state.content ? state.line : continueLine(state.content, path), notice: null };
}

export function currentEpd(content: OpeningContent, path: LineEdge[]): string {
  return path.at(-1)?.to ?? content.opening.rootEpd;
}
