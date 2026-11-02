import { useSyncExternalStore } from 'react';

/*
 * Undo for settings (docs/v2/components/undo-button.md, history `settings`): kept in memory for the page's life, as
 * docs/v2/stores/settings.md proposes; settings are cheap to set again. One entry per action, however many values it
 * changed (a preset picked with your changes cleared, a group reset).
 */

export type SettingsUndoEntry = { id: number; label: string; at: number; revert: () => void };

let entries: SettingsUndoEntry[] = [];
let nextId = 1;
let batch: { label: string; reverts: (() => void)[] } | null = null;
let undoing = false;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

/** Records one change; inside `settingsBatch` it joins the batch's single entry. Undoing records nothing. */
export function recordSettingChange(label: string, revert: () => void): void {
  if (undoing) return;
  if (batch) {
    batch.reverts.push(revert);
    return;
  }
  entries = [...entries.slice(-19), { id: nextId++, label, at: Date.now(), revert }];
  notify();
}

/** Runs several setting writes as one undoable action, named `label`. */
export function settingsBatch(label: string, run: () => void): void {
  if (batch) {
    run();
    return;
  }
  batch = { label, reverts: [] };
  try {
    run();
  } finally {
    const { reverts } = batch;
    batch = null;
    if (reverts.length > 0) recordSettingChange(label, () => [...reverts].reverse().forEach((revert) => revert()));
  }
}

/** Takes back the last action; returns its label, or null when there is nothing to undo. */
export function undoSettingChange(): string | null {
  const last = entries.at(-1);
  if (!last) return null;
  entries = entries.slice(0, -1);
  undoing = true;
  try {
    last.revert();
  } finally {
    undoing = false;
  }
  notify();
  return last.label;
}

const lastEntry = () => entries.at(-1) ?? null;

/** The last undoable settings action (its label names the Undo button), or null. */
export function useLastSettingChange(): SettingsUndoEntry | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    lastEntry,
    lastEntry,
  );
}
