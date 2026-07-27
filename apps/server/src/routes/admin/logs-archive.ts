// R2 아카이브 쿼리 엔드포인트 — ADR-014 Phase 4.
//
// Worker가 R2 바인딩으로 JSONL 아카이브를 직접 읽고 클라이언트에 JSON 반환.
// duckdb-wasm(10MB)은 모바일 WebView에서 비현실적이므로 서버 사이드 방식 채택.
//
// 2개 엔드포인트:
//   GET /archive/stats  — R2 객체 수, 총 크기, 파티션 목록
//   GET /archive/query  — 날짜/레벨/이벤트 필터로 JSONL 스캔, matching rows 반환

import { Hono } from 'hono';
import type { AppEnv } from '../../env';
import { HttpError } from '../../lib/http-error';
import type {
  ArchiveStats,
  ArchivePartition,
  ArchiveQuery,
  ArchiveQueryResult,
  ArchiveRow,
} from '@studyops/shared';

export const adminLogArchiveRoutes = new Hono<AppEnv>();

const MAX_SCAN_OBJECTS = 50;
const MAX_RETURN_ROWS = 500;

adminLogArchiveRoutes.get('/stats', async (c) => {
  if (!c.env.LOG_ARCHIVE) {
    throw new HttpError(503, 'R2_NOT_CONFIGURED', 'LOG_ARCHIVE binding is missing');
  }

  const listed = await c.env.LOG_ARCHIVE.list({ limit: 1000 });
  const objects = listed.objects;

  const partitions: ArchivePartition[] = objects.map((obj) => ({
    prefix: extractPartitionPrefix(obj.key),
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded?.toISOString() ?? null,
  }));

  const totalBytes = objects.reduce((sum, obj) => sum + obj.size, 0);

  const stats: ArchiveStats = {
    objectCount: objects.length,
    totalBytes,
    partitions,
  };

  return c.json(stats);
});

adminLogArchiveRoutes.get('/query', async (c) => {
  if (!c.env.LOG_ARCHIVE) {
    throw new HttpError(503, 'R2_NOT_CONFIGURED', 'LOG_ARCHIVE binding is missing');
  }

  const year = c.req.query('year') ? Number(c.req.query('year')) : undefined;
  const month = c.req.query('month') ? Number(c.req.query('month')) : undefined;
  const level = c.req.query('level');
  const event = c.req.query('event');
  const search = c.req.query('search');
  const limit = Math.min(
    MAX_RETURN_ROWS,
    Math.max(1, Number(c.req.query('limit') ?? '100')),
  );

  const prefix = buildScanPrefix(year, month, level);

  const listed = await c.env.LOG_ARCHIVE.list({
    prefix,
    limit: MAX_SCAN_OBJECTS,
  });

  if (listed.objects.length === 0) {
    const empty: ArchiveQueryResult = { rows: [], scannedObjects: 0, truncated: false };
    return c.json(empty);
  }

  const collectedRows: ArchiveRow[] = [];
  for (const obj of listed.objects) {
    if (collectedRows.length >= limit) break;

    const range = await c.env.LOG_ARCHIVE.get(obj.key);
    if (!range) continue;

    const text = await range.text();
    const lines = text.trim().split('\n');

    for (const line of lines) {
      if (collectedRows.length >= limit) break;
      if (!line) continue;

      try {
        const row = JSON.parse(line) as ArchiveRow;
        if (event && row.event !== event) continue;
        if (search && !row.message.toLowerCase().includes(search.toLowerCase())) continue;
        collectedRows.push(row);
      } catch {
        // skip malformed line
      }
    }
  }

  const result: ArchiveQueryResult = {
    rows: collectedRows,
    scannedObjects: listed.objects.length,
    truncated: collectedRows.length >= limit,
  };

  return c.json(result);
});

function extractPartitionPrefix(key: string): string {
  const parts = key.split('/');
  if (parts.length >= 4) {
    return parts.slice(0, 4).join('/');
  }
  return key;
}

function buildScanPrefix(
  year: number | undefined,
  month: number | undefined,
  level: string | undefined,
): string {
  const segments: string[] = [];
  if (year) segments.push(`year=${year}`);
  if (month) segments.push(`month=${String(month).padStart(2, '0')}`);
  if (level) segments.push(`level=${level}`);
  return segments.length > 0 ? segments.join('/') + '/' : '';
}

// Export for unit tests.
export const __test = {
  buildScanPrefix,
  extractPartitionPrefix,
  MAX_SCAN_OBJECTS,
  MAX_RETURN_ROWS,
};
