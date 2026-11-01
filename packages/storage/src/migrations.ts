/**
 * The learner database's schema, as numbered SQL migrations (docs/v2/schemas/learner.md, upgrades.md). Each runs in
 * its own transaction on open; the version is kept in `meta`. Never edit a released migration: add the next one.
 * Additive by default (new tables and columns); a migration may also rewrite rows, in the same transaction.
 *
 * Every table but `meta` has an id (for `settings`, the key) and an `at` time. `reviews` and `attempts` are logs:
 * rows are added, never changed (a trigger refuses an update).
 */
export type Migration = { version: number; statements: readonly string[] };

const appendOnly = (table: string) =>
  `create trigger ${table}_append_only before update on ${table} begin select raise(abort, '${table} are only ever added to'); end`;

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: [
      'create table meta (key text primary key, value text not null) strict',
      'create table settings (key text primary key, value text not null, at text not null) strict',
      `create table cards (
        id text primary key,
        at text not null,
        due text not null,
        stability real not null,
        difficulty real not null,
        scheduled_days real not null,
        learning_steps integer not null,
        reps integer not null,
        lapses integer not null,
        state text not null,
        last_review text
      ) strict`,
      'create index cards_due on cards (due)',
      `create table reviews (
        id text primary key,
        at text not null,
        card_id text not null,
        rating text not null,
        ms integer not null,
        hint integer not null
      ) strict`,
      'create index reviews_card on reviews (card_id, at)',
      appendOnly('reviews'),
    ],
  },
  {
    version: 2,
    statements: [
      `create table attempts (
        id text primary key,
        at text not null,
        session text not null,
        mode text not null,
        ref text not null,
        result text not null,
        tries text not null,
        ms integer not null,
        hint integer not null,
        shown integer not null
      ) strict`,
      'create index attempts_at on attempts (at)',
      appendOnly('attempts'),
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.at(-1)?.version ?? 0;
