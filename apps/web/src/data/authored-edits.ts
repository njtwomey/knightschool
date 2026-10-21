import { newId, type AuthoredKind } from '@knightschool/core';
import type { Storage } from '@knightschool/storage';
import { whenStorageReady } from './storage';

/**
 * The settings key holding what each recent editor action was called ("reorder the path"), by its history group, so
 * Undo can say what it takes back. Kept in settings so it travels with an export; only the latest ones are kept.
 */
export const UNDO_LABELS_KEY = 'authoringUndoLabels';
const LABELS_KEPT = 100;

/** What recent actions were called, by history group. Empty when none are known. */
export async function loadUndoLabels(storage: Storage): Promise<Record<string, string>> {
  try {
    const parsed: unknown = JSON.parse((await storage.settings.get(UNDO_LABELS_KEY)) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** One change to authored content: an item's new text (PGN for a chapter, course.yaml JSON for a course), or null to delete it. */
export type AuthoredChangeInput = { kind: AuthoredKind; itemId: string; body: string | null };

/**
 * Saves one action of the editor: every change together, each keeping what it replaces in the history, so undo takes
 * the whole action back. Deletes are soft. `label` ("move Main line to bonus") is what Undo will say it takes back.
 */
export async function saveAuthored(changes: AuthoredChangeInput[], label?: string): Promise<void> {
  if (changes.length === 0) return;
  const { storage } = await whenStorageReady();
  const group = newId();
  const at = new Date().toISOString();
  await storage.authoring.apply({ group, at, edits: changes.map((change) => ({ historyId: newId(), ...change })) });
  if (!label) return;
  // Group ids are ULIDs, so sorting keeps the newest.
  const labels = { ...(await loadUndoLabels(storage)), [group]: label };
  const kept = Object.fromEntries(
    Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-LABELS_KEPT),
  );
  await storage.settings.set(UNDO_LABELS_KEY, JSON.stringify(kept), at);
}

/** Takes back the last action not yet undone. Returns false when there was nothing to undo. */
export async function undoAuthored(): Promise<boolean> {
  const { storage } = await whenStorageReady();
  return (await storage.authoring.undo(newId(), new Date().toISOString(), newId)) !== undefined;
}
