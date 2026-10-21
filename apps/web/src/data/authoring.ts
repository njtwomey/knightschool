import { newId, type AuthoredKind } from '@knightschool/core';
import { whenStorageReady } from './storage';

/** One change to authored content: an item's new text (PGN for a chapter, course.yaml JSON for a course), or null to delete it. */
export type AuthoredChangeInput = { kind: AuthoredKind; itemId: string; body: string | null };

/**
 * Saves one action of the editor: every change together, each keeping what it replaces in the history, so undo takes
 * the whole action back. Deletes are soft.
 */
export async function saveAuthored(changes: AuthoredChangeInput[]): Promise<void> {
  if (changes.length === 0) return;
  const { storage } = await whenStorageReady();
  await storage.authoring.apply({
    group: newId(),
    at: new Date().toISOString(),
    edits: changes.map((change) => ({ historyId: newId(), ...change })),
  });
}

/** Takes back the last action not yet undone. Returns false when there was nothing to undo. */
export async function undoAuthored(): Promise<boolean> {
  const { storage } = await whenStorageReady();
  return (await storage.authoring.undo(newId(), new Date().toISOString(), newId)) !== undefined;
}
