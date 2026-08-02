// 로그 보관 정책 실행 — ADR-011 + ADR-014 Phase 2.
// 매일 cron이 호출. 레벨별 보관 일수(LOG_RETENTION_DAYS)를 초과한 로그를 처리.
//
// ADR-014: R2 바인딩이 있고 레벨이 fatal이 아닌 경우, 삭제 전 R2에 JSONL로 아카이빙.
// R2 아카이빙 실패시 D1 삭제를 수행하지 않음 (데이터 손실 방지).
// R2 바인딩이 없거나 fatal 레벨인 경우, 기존대로 직접 삭제.

import { LOG_LEVELS, LOG_RETENTION_DAYS, type LogLevel } from '@studyops/shared';
import { archiveBatch, type LogArchiveRow } from './archive';

const SELECT_SQL = 'SELECT * FROM logs WHERE ts < ? AND level = ? ORDER BY ts LIMIT ?';
const DELETE_BY_IDS_SQL = (idCount: number) =>
  `DELETE FROM logs WHERE id IN (${idCount > 0 ? Array(idCount).fill('?').join(',') : 'NULL'})`;
const DELETE_BY_CUTOFF_SQL = 'DELETE FROM logs WHERE ts < ? AND level = ?';

const ARCHIVE_BATCH_SIZE = 500;
const IS_ARCHIVABLE_LEVEL = (level: LogLevel): boolean => level !== 'fatal';

export interface RetentionResult {
  level: LogLevel;
  days: number;
  archivedCount: number;
  deletedCount: number;
  archiveError?: string;
  error?: string;
}

export interface RetentionSummary {
  results: RetentionResult[];
  totalArchived: number;
  totalDeleted: number;
  startedAt: number;
  finishedAt: number;
}

export async function archiveAndDeleteOldLogs(
  db: D1Database,
  r2: R2Bucket | undefined,
  level: LogLevel,
  days: number,
): Promise<RetentionResult> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const shouldArchive = r2 !== undefined && IS_ARCHIVABLE_LEVEL(level);

  if (!shouldArchive) {
    const result = await db
      .prepare(DELETE_BY_CUTOFF_SQL)
      .bind(cutoff, level)
      .run<{ changes: number }>();

    return {
      level,
      days,
      archivedCount: 0,
      deletedCount: result.meta?.changes ?? 0,
    };
  }

  const selected = await db
    .prepare(SELECT_SQL)
    .bind(cutoff, level, ARCHIVE_BATCH_SIZE)
    .all<LogArchiveRow>();

  const rows = selected.results ?? [];
  if (rows.length === 0) {
    return { level, days, archivedCount: 0, deletedCount: 0 };
  }

  try {
    await archiveBatch(r2 as R2Bucket, rows, 1);
  } catch (err) {
    return {
      level,
      days,
      archivedCount: 0,
      deletedCount: 0,
      archiveError: err instanceof Error ? err.message : String(err),
    };
  }

  const ids = rows.map((r) => r.id);
  await db
    .prepare(DELETE_BY_IDS_SQL(ids.length))
    .bind(...ids)
    .run();

  return {
    level,
    days,
    archivedCount: rows.length,
    deletedCount: rows.length,
  };
}

export async function deleteLogsOlderThan(
  db: D1Database,
  level: LogLevel,
  days: number,
): Promise<RetentionResult> {
  const result = await db
    .prepare(DELETE_BY_CUTOFF_SQL)
    .bind(Date.now() - days * 24 * 60 * 60 * 1000, level)
    .run<{ changes: number }>();

  return {
    level,
    days,
    archivedCount: 0,
    deletedCount: result.meta?.changes ?? 0,
  };
}

export async function deleteOldLogs(
  db: D1Database,
  r2?: R2Bucket,
): Promise<RetentionResult[]> {
  const results: RetentionResult[] = [];

  for (const level of LOG_LEVELS) {
    const days = LOG_RETENTION_DAYS[level];
    try {
      const result = await archiveAndDeleteOldLogs(db, r2, level, days);
      results.push(result);
    } catch (err) {
      results.push({
        level,
        days,
        archivedCount: 0,
        deletedCount: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
