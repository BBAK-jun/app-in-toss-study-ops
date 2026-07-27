import { describe, it, expect, vi } from 'vitest';
import { deleteOldLogs, deleteLogsOlderThan, archiveAndDeleteOldLogs } from './retention';
import { LOG_RETENTION_DAYS, LOG_LEVELS } from '@studyops/shared';
import type { LogArchiveRow } from './archive';

function mockDb(selectResults: LogArchiveRow[] = []) {
  const prepares: { sql: string; binds: unknown[]; result: unknown }[] = [];

  const db = {
    prepare: vi.fn().mockImplementation((sql: string) => {
      const entry: { sql: string; binds: unknown[]; result: unknown } = { sql, binds: [], result: null };
      prepares.push(entry);
      return {
        bind: vi.fn().mockImplementation((...args: unknown[]) => {
          entry.binds = args;
          return {
            all: vi.fn().mockImplementation(async () => {
              if (sql.startsWith('SELECT')) {
                entry.result = { results: selectResults };
                return { results: selectResults };
              }
              return null;
            }),
            run: vi.fn().mockImplementation(async () => {
              entry.result = { meta: { changes: selectResults.length } };
              return { meta: { changes: selectResults.length } };
            }),
          };
        }),
      };
    }),
  } as unknown as D1Database;
  return { db, prepares };
}

function mockR2(fail?: Error): { r2: R2Bucket; putFn: ReturnType<typeof vi.fn> } {
  const putFn = vi.fn(async () => {
    if (fail) throw fail;
  });
  const r2 = { put: putFn } as unknown as R2Bucket;
  return { r2, putFn };
}

function makeArchiveRow(overrides: Partial<LogArchiveRow> = {}): LogArchiveRow {
  return {
    id: 1,
    ts: Date.now() - 10 * 24 * 60 * 60 * 1000,
    level: 'debug',
    source: 'server',
    event: 'study.created',
    message: 'test',
    userId: null,
    sessionId: null,
    requestId: null,
    method: null,
    path: null,
    status: null,
    durationMs: null,
    context: null,
    stack: null,
    env: 'dev',
    version: null,
    userAgent: null,
    ipHash: null,
    ...overrides,
  };
}

describe('deleteLogsOlderThan', () => {
  it('주어진 level과 days에 대해 DELETE 쿼리를 실행한다', async () => {
    const { db } = mockDb();
    (db.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 5 } }),
      }),
    });

    const result = await deleteLogsOlderThan(db, 'debug', 7);
    expect(result.deletedCount).toBe(5);
    expect(result.level).toBe('debug');
    expect(result.days).toBe(7);
    expect(result.archivedCount).toBe(0);
  });
});

describe('archiveAndDeleteOldLogs', () => {
  it('R2 바인딩 + non-fatal level: 아카이브 후 삭제', async () => {
    const rows = [makeArchiveRow({ id: 1 }), makeArchiveRow({ id: 2 })];
    const { db } = mockDb(rows);
    const { r2, putFn } = mockR2();

    const result = await archiveAndDeleteOldLogs(db, r2, 'debug', 7);

    expect(result.archivedCount).toBe(2);
    expect(result.deletedCount).toBe(2);
    expect(putFn.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('R2 아카이빙 실패시 D1 삭제를 수행하지 않는다', async () => {
    const rows = [makeArchiveRow({ id: 1 }), makeArchiveRow({ id: 2 })];
    const { db, prepares } = mockDb(rows);
    const { r2 } = mockR2(new Error('R2 network error'));

    const result = await archiveAndDeleteOldLogs(db, r2, 'debug', 7);

    expect(result.archivedCount).toBe(0);
    expect(result.deletedCount).toBe(0);
    expect(result.archiveError).toContain('R2 network error');
    const deleteCalls = prepares.filter((p) => p.sql.startsWith('DELETE'));
    expect(deleteCalls).toHaveLength(0);
  });

  it('R2 바인딩이 없으면 직접 삭제 (graceful degradation)', async () => {
    const { db } = mockDb([]);
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => ({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 99 } }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }));

    const result = await archiveAndDeleteOldLogs(db, undefined, 'debug', 7);

    expect(result.archivedCount).toBe(0);
    expect(result.deletedCount).toBe(99);
  });

  it('fatal level은 아카이브하지 않고 직접 삭제', async () => {
    const { db } = mockDb([]);
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => ({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ meta: { changes: 3 } }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }));
    const { r2, putFn } = mockR2();

    const result = await archiveAndDeleteOldLogs(db, r2, 'fatal', 365);

    expect(result.archivedCount).toBe(0);
    expect(result.deletedCount).toBe(3);
    expect(putFn.mock.calls.length).toBe(0);
  });

  it('만료된 row가 없으면 아카이브/삭제 모두 0', async () => {
    const { db } = mockDb([]);
    const { r2, putFn } = mockR2();

    const result = await archiveAndDeleteOldLogs(db, r2, 'info', 30);

    expect(result.archivedCount).toBe(0);
    expect(result.deletedCount).toBe(0);
    expect(putFn.mock.calls.length).toBe(0);
  });
});

describe('deleteOldLogs', () => {
  it('모든 로그 레벨에 대해 처리 후 결과를 반환한다', async () => {
    const { db } = mockDb([]);

    const results = await deleteOldLogs(db, undefined);
    expect(results).toHaveLength(LOG_LEVELS.length);
    expect(results[0].level).toBe('debug');
    expect(results[0].days).toBe(LOG_RETENTION_DAYS.debug);
  });

  it('R2 바인딩을 전달하면 non-fatal 레벨을 아카이브한다', async () => {
    const rows = [makeArchiveRow({ id: 1, level: 'debug' })];
    const { db } = mockDb(rows);
    const { r2 } = mockR2();

    const results = await deleteOldLogs(db, r2);
    const debugResult = results.find((r) => r.level === 'debug');
    expect(debugResult?.archivedCount).toBe(1);
  });

  it('D1 에러 시 해당 레벨은 error를 기록하고 계속 진행한다', async () => {
    const { db } = mockDb([]);
    let callIdx = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const idx = callIdx++;
      return {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockImplementation(async () => {
            if (idx === 2) throw new Error('D1 syntax error');
            return { meta: { changes: 0 } };
          }),
        }),
      };
    });

    const results = await deleteOldLogs(db, undefined);
    expect(results[2].error).toBeDefined();
    expect(results[0].error).toBeUndefined();
  });
});
