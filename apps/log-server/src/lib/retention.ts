import { LOG_LEVELS, LOG_RETENTION_DAYS, type LogLevel } from '@studyops/shared';

const DELETE_SQL = 'DELETE FROM logs WHERE ts < ? AND level = ?';

export interface RetentionResult {
  level: LogLevel;
  days: number;
  deletedCount: number;
  error?: string;
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

  return { level, days, deletedCount: result.meta?.changes ?? 0 };
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
        level, days, deletedCount: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
