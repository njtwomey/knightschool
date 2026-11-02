import type { AttemptRow, LearnerStore, ReviewRow } from '@knightschool/storage';
import type { Card } from '@knightschool/core';

/**
 * The learner's data, as the pages use it. The types live with the SQLite implementation (packages/storage, opened
 * with `openLearnerStore()` from data/storage); tests use the in-memory one below. Every write is a whole row with an
 * id and an `at` time.
 */
export type { AttemptRow, LearnerStore, ReviewRow };

/** Everything in memory: for tests, and where the browser cannot keep data (data/storage). Lost on reload. */
export function memoryStore(): LearnerStore {
  const cards = new Map<string, Card>();
  const reviews: ReviewRow[] = [];
  const attempts: AttemptRow[] = [];
  const settings = new Map<string, string>();
  return {
    cards: {
      all: async () => [...cards.values()],
      get: async (id) => cards.get(id),
      put: async (card) => void cards.set(card.id, card),
    },
    reviews: {
      add: async (review) => void reviews.push(review),
      forCards: async (ids) => reviews.filter((review) => ids.includes(review.cardId)),
    },
    attempts: {
      add: async (attempt) => void attempts.push(attempt),
      recent: async (limit) => attempts.slice(-limit).reverse(),
    },
    settings: {
      get: async (key) => settings.get(key),
      set: async (key, value) => void settings.set(key, value),
      all: async () => Object.fromEntries(settings),
      remove: async (key) => void settings.delete(key),
    },
  };
}
