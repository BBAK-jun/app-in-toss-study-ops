// R2 로그 아카이빙 — ADR-014 Phase 2.
//
// D1 retention cron이 만료시키는 로그를 R2 + JSONL로 영구 보관.
// Parquet 마이그레이션은 Phase 3에서 검증 후 결정 (parquet-wasm Workers 호환성).
//
// 파티션 스키마 (Hive-style — DuckDB partition pruning 최적화):
//   year=2026/month=07/day=27/level=error/20260727-error-{batchSeq}.jsonl
//
// 안전 보장:
//   1. R2 PUT 성공 후에만 D1 DELETE 호출 (retention.ts에서 보장)
//   2. context 필드는 D1의 JSON 문자열을 파싱하여 중첩 객체로 저장 (DuckDB 분석 용이)
//   3. fatal 레벨은 아카이브 제외 (ADR-014 §3 — D1에 장기 보관)

export interface LogArchiveRow {
  id: number;
  ts: number;
  level: string;
  source: string;
  event: string;
  message: string;
  userId: number | null;
  sessionId: string | null;
  requestId: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  durationMs: number | null;
  context: string | null;
  stack: string | null;
  env: string;
  version: string | null;
  userAgent: string | null;
  ipHash: string | null;
}

export interface ArchiveBatchResult {
  r2Key: string;
  rowCount: number;
  byteSize: number;
}

const BATCH_SEQ_PADDING = 4;

export function buildR2Key(ts: number, level: string, batchSeq: number): string {
  const date = new Date(ts);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStamp = `${year}${month}${day}`;
  const seq = String(batchSeq).padStart(BATCH_SEQ_PADDING, '0');
  return `year=${year}/month=${month}/day=${day}/level=${level}/${dateStamp}-${level}-${seq}.jsonl`;
}

interface NormalizedArchiveRow {
  id: number;
  ts: number;
  level: string;
  source: string;
  event: string;
  message: string;
  userId: number | null;
  sessionId: string | null;
  requestId: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  durationMs: number | null;
  context: Record<string, unknown> | null;
  stack: string | null;
  env: string;
  version: string | null;
  userAgent: string | null;
  ipHash: string | null;
}

function normalizeRow(row: LogArchiveRow): NormalizedArchiveRow {
  let parsedContext: Record<string, unknown> | null = null;
  if (row.context) {
    try {
      parsedContext = JSON.parse(row.context) as Record<string, unknown>;
    } catch {
      parsedContext = { _raw: row.context };
    }
  }
  return {
    id: row.id,
    ts: row.ts,
    level: row.level,
    source: row.source,
    event: row.event,
    message: row.message,
    userId: row.userId,
    sessionId: row.sessionId,
    requestId: row.requestId,
    method: row.method,
    path: row.path,
    status: row.status,
    durationMs: row.durationMs,
    context: parsedContext,
    stack: row.stack,
    env: row.env,
    version: row.version,
    userAgent: row.userAgent,
    ipHash: row.ipHash,
  };
}

export function serializeRowsToJsonl(rows: LogArchiveRow[]): string {
  const normalized = rows.map(normalizeRow);
  return normalized.map((row) => JSON.stringify(row)).join('\n') + (normalized.length > 0 ? '\n' : '');
}

interface DayGroup {
  dayKey: string;
  rows: LogArchiveRow[];
}

function groupByDay(rows: LogArchiveRow[]): DayGroup[] {
  const groups = new Map<string, LogArchiveRow[]>();
  for (const row of rows) {
    const date = new Date(row.ts);
    const dayKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const existing = groups.get(dayKey);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(dayKey, [row]);
    }
  }
  return [...groups.entries()].map(([dayKey, groupRows]) => ({ dayKey, rows: groupRows }));
}

export async function archiveBatch(
  r2: R2Bucket,
  rows: LogArchiveRow[],
  batchSeq: number,
): Promise<ArchiveBatchResult> {
  if (rows.length === 0) {
    throw new Error('archiveBatch: empty rows');
  }

  const dayGroups = groupByDay(rows);
  let lastResult: ArchiveBatchResult | null = null;

  for (const group of dayGroups) {
    const jsonl = serializeRowsToJsonl(group.rows);
    const firstTs = group.rows[0].ts;
    const level = group.rows[0].level;
    const r2Key = buildR2Key(firstTs, level, batchSeq);

    await r2.put(r2Key, jsonl, {
      httpMetadata: { contentType: 'application/x-ndjson' },
    });

    lastResult = {
      r2Key,
      rowCount: group.rows.length,
      byteSize: new TextEncoder().encode(jsonl).byteLength,
    };
  }

  if (!lastResult) {
    throw new Error('archiveBatch: no day groups produced');
  }
  return lastResult;
}
