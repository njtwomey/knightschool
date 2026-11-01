import type { Card } from '@knightschool/core';
import type { Row, SqlValue, Statement } from './executor';
import type { AttemptRow, CardRow, ReviewRow, SettingRow } from './rows';

// Each table's columns, and the mapping between a row in SQLite and the shape the app and the export use. Selects
// alias snake_case columns to the app's names; booleans are 0 or 1, tries are JSON text.

export const placeholders = (count: number) => Array.from({ length: count }, () => '?').join(', ');

export const CARD_SELECT =
  'select id, at, due, stability, difficulty, scheduled_days as scheduledDays, learning_steps as learningSteps, ' +
  'reps, lapses, state, last_review as lastReview from cards';
const CARD_COLUMNS = [
  'id',
  'at',
  'due',
  'stability',
  'difficulty',
  'scheduled_days',
  'learning_steps',
  'reps',
  'lapses',
  'state',
  'last_review',
];

export const cardFromRow = (row: Row): Card => {
  const { at: _at, ...card } = cardRowFromRow(row);
  return card;
};

export const cardRowFromRow = (row: Row): CardRow => row as unknown as CardRow;

/** Writes a card; with `newerOnly`, an existing row is replaced only by a newer one (import). */
export function putCard(card: CardRow, newerOnly = false): Statement {
  const updates = CARD_COLUMNS.slice(1)
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  const params: SqlValue[] = [
    card.id,
    card.at,
    card.due,
    card.stability,
    card.difficulty,
    card.scheduledDays,
    card.learningSteps,
    card.reps,
    card.lapses,
    card.state,
    card.lastReview,
  ];
  return {
    sql:
      `insert into cards (${CARD_COLUMNS.join(', ')}) values (${placeholders(CARD_COLUMNS.length)}) ` +
      `on conflict (id) do update set ${updates}${newerOnly ? ' where excluded.at > cards.at' : ''}`,
    params,
  };
}

export const SETTING_SELECT = 'select key, value, at from settings';

export function putSetting(setting: SettingRow, newerOnly = false): Statement {
  return {
    sql:
      'insert into settings (key, value, at) values (?, ?, ?) on conflict (key) do update set value = excluded.value, ' +
      `at = excluded.at${newerOnly ? ' where excluded.at > settings.at' : ''}`,
    params: [setting.key, setting.value, setting.at],
  };
}

export const REVIEW_SELECT = 'select id, at, card_id as cardId, rating, ms, hint from reviews';

export const reviewFromRow = (row: Row): ReviewRow => ({ ...(row as unknown as ReviewRow), hint: row.hint === 1 });

/** Adds a review. A log: an id already there fails (`orIgnore`: is kept as it is, for import). */
export function addReview(review: ReviewRow, orIgnore = false): Statement {
  return {
    sql: `insert ${orIgnore ? 'or ignore ' : ''}into reviews (id, at, card_id, rating, ms, hint) values (?, ?, ?, ?, ?, ?)`,
    params: [review.id, review.at, review.cardId, review.rating, review.ms, review.hint ? 1 : 0],
  };
}

export const ATTEMPT_SELECT = 'select id, at, session, mode, ref, result, tries, ms, hint, shown from attempts';

export const attemptFromRow = (row: Row): AttemptRow => ({
  ...(row as unknown as AttemptRow),
  tries: JSON.parse(String(row.tries)) as AttemptRow['tries'],
  hint: row.hint === 1,
  shown: row.shown === 1,
});

/** Adds an attempt. A log: an id already there fails (`orIgnore`: is kept as it is, for import). */
export function addAttempt(attempt: AttemptRow, orIgnore = false): Statement {
  return {
    sql:
      `insert ${orIgnore ? 'or ignore ' : ''}into attempts (id, at, session, mode, ref, result, tries, ms, hint, shown) ` +
      'values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    params: [
      attempt.id,
      attempt.at,
      attempt.session,
      attempt.mode,
      attempt.ref,
      attempt.result,
      JSON.stringify(attempt.tries),
      attempt.ms,
      attempt.hint ? 1 : 0,
      attempt.shown ? 1 : 0,
    ],
  };
}
