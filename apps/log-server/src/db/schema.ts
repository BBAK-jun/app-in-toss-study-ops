import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey(),
  ts: integer('ts').notNull(),
  level: text('level').notNull(),
  source: text('source').notNull(),
  event: text('event').notNull(),
  message: text('message').notNull(),

  userId: integer('user_id'),
  sessionId: text('session_id'),
  requestId: text('request_id'),

  method: text('method'),
  path: text('path'),
  status: integer('status'),
  durationMs: integer('duration_ms'),

  context: text('context'),
  stack: text('stack'),

  env: text('env').notNull(),
  version: text('version'),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),
});
