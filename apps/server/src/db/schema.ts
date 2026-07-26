// Drizzle 스키마 — D1(SQLite) 매핑. ARCHITECTURE.md 4-2 코드 기반.
// 타임스탬프: 모두 epoch milliseconds(integer). ID: userKey만 number PK, 나머지 uuid(text).
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ─── users ────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  userKey: integer('user_key').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at').notNull(),
});

// ─── studies ──────────────────────────────────────────────────────────────
export const studies = sqliteTable('studies', {
  id: text('id').primaryKey(),
  ownerId: integer('owner_id').notNull().references(() => users.userKey, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description'),
  discordWebhookUrl: text('discord_webhook_url'),
  createdAt: integer('created_at').notNull(),
});

// ─── rounds ───────────────────────────────────────────────────────────────
export const rounds = sqliteTable('rounds', {
  id: text('id').primaryKey(),
  studyId: text('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  title: text('title').notNull(),
  dueAt: integer('due_at'),
  createdAt: integer('created_at').notNull(),
});

// ─── participants ─────────────────────────────────────────────────────────
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  studyId: text('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  discordHandle: text('discord_handle'),
  createdAt: integer('created_at').notNull(),
});

// ─── submissions ──────────────────────────────────────────────────────────
// 회차당 참여자 1제출. UNIQUE(roundId, participantId).
export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
    participantId: text('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    note: text('note'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => ({
    uniqRoundParticipant: uniqueIndex('uniq_round_participant').on(t.roundId, t.participantId),
  }),
);

// FK 조회 성능용 일반 인덱스는 D1에 자동 생성되지 않으므로
// 마이그레이션 SQL(src/db/migrations/*.sql)에서 CREATE INDEX 로 관리.
