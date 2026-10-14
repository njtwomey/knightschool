import { ulid } from 'ulid';

/** Client-side id for user-state rows. ULIDs sort by creation time and merge cleanly across devices. */
export function newId(): string {
  return ulid();
}
