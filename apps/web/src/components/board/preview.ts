import { create } from 'zustand';

/**
 * A position the learner is pointing at in the text (see `RichText`). Boards marked `previewable` show it in place of
 * their own position while it is set. `pinned` keeps it after the pointer leaves (a tap on a phone).
 */
type PreviewState = {
  epd: string | null;
  pinned: boolean;
  show: (epd: string) => void;
  /** Called when the pointer leaves: clears unless the preview was pinned by a click. */
  hide: () => void;
  /** A click: pin the preview, or unpin and clear it if this position is already pinned. */
  toggle: (epd: string) => void;
  clear: () => void;
};

export const usePreview = create<PreviewState>((set, get) => ({
  epd: null,
  pinned: false,
  show: (epd) => set({ epd }),
  hide: () => {
    if (!get().pinned) set({ epd: null });
  },
  toggle: (epd) => set(get().pinned && get().epd === epd ? { epd: null, pinned: false } : { epd, pinned: true }),
  clear: () => set({ epd: null, pinned: false }),
}));
