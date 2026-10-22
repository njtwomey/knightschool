/** A sideline earns a card only when its parent position is reached in at least this share of games at the band. */
export const MIN_POPULARITY_FOR_CARD = 0.05;

/** Rating band and speeds the explorer is asked about at build time. */
export const EXPLORER_BAND = { ratings: [1000, 1200, 1400, 1600], speeds: ['blitz', 'rapid'] } as const;

/** A correct, unaided answer inside this time is rated Easy rather than Good. */
export const EASY_WITHIN_MS = 5000;

/** New cards introduced per day when the learner has not chosen a number. */
export const DEFAULT_NEW_CARDS_PER_DAY = 10;

/** Cards in one training session. */
export const SESSION_SIZE = 20;

/** `/play/<course>/all/...` practises every branch, so no line may use this id. */
export const RESERVED_LINE_ID = 'all';
