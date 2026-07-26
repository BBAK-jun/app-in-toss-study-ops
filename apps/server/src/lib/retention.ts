// 로그 보관 정책 실행 — ADR-011.
// 매일 cron이 호출. 레벨별 보관 일수(LOG_RETENTION_DAYS)를 초과한 로그를 DELETE.
// 실패한 레벨은 스킵하고 나머지 계속 실행 (한 레벨 실패가 전체 중단 유발 X).

import { LOG_LEVELS, LOG_RETENTION_DAYS, type LogLevel } from '@studyops/shared';

const DELETE_SQL = 'DELETE FROM logs WHERE ts < ? AND level = ?';

export interface RetentionResult {
  level: LogLevel;
  days: number;
  deletedCount: number;
  error?: string;
}

export interface RetentionSummary {
  results: RetentionResult[];
  totalDeleted: number;
  startedAt: number;
  finishedAt: number;
}

export async function deleteLogsOlderThan(
  db: D1Database,
  level: LogLevel,
  days: number,
): Promise<RetentionResult> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const result = await db
    .prepare(DELETE_SQL)
    .bind(cutoff, level)
    .run<{ changes: number }>();

  return {
    level,
    days,
    deletedCount: result.meta?.changes ?? 0,
  };
}

export async function deleteOldLogs(db: D1Database): Promise<RetentionResult[]> {
  const results: RetentionResult[] = [];

  for (const level of LOG_LEVELS) {
    const days = LOG_RETENTION_DAYS[level];
    try {
      const result = await deleteLogsOlderThan(db, level, days);
      results.push(result);
    } catch (err) {
      results.push({
        level,
        days,
        deletedCount: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
