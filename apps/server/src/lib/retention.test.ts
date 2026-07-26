import { describe, it, expect, vi } from 'vitest';
import { deleteOldLogs, deleteLogsOlderThan } from './retention';
import { LOG_RETENTION_DAYS, LOG_LEVELS } from '@studyops/shared';

function mockDb() {
  const binds: unknown[][] = [];
  const runResults: { meta: { changes: number } }[] = [];
  const db = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn((...args: unknown[]) => {
        binds.push(args);
        return { run: vi.fn().mockResolvedValue(runResults[binds.length - 1] ?? { meta: { changes: 0 } }) };
      }),
    }),
  } as unknown as D1Database;
  return { db, binds };
}

describe('deleteLogsOlderThan', () => {
  it('주어진 level과 days에 대해 DELETE 쿼리를 실행한다', async () => {
    const { db, binds } = mockDb();
    (db.prepare as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      bind: vi.fn((...args: unknown[]) => {
        binds.push(args);
        return { run: vi.fn().mockResolvedValue({ meta: { changes: 5 } }) };
      }),
    });

    const result = await deleteLogsOlderThan(db, 'debug', 7);
    expect(result.deletedCount).toBe(5);
    expect(result.level).toBe('debug');
    expect(result.days).toBe(7);
    // bind 인자: (cutoff_ts, level) 순서
    expect(binds[0][0]).toBeLessThan(Date.now());
    expect(binds[0][1]).toBe('debug');
  });
});

describe('deleteOldLogs', () => {
  it('모든 로그 레벨에 대해 보관 기간 적용 후 삭제한다', async () => {
    const { db } = mockDb();

    // 각 레벨마다 changes 반환
    let callIdx = 0;
    const changesPerLevel = [3, 10, 5, 2, 0];
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const idx = callIdx++;
      return {
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { changes: changesPerLevel[idx] ?? 0 } }),
        }),
      };
    });

    const results = await deleteOldLogs(db);
    expect(results).toHaveLength(LOG_LEVELS.length);
    expect(results[0].level).toBe('debug');
    expect(results[0].days).toBe(LOG_RETENTION_DAYS.debug);
    expect(results[1].level).toBe('info');
    expect(results[1].days).toBe(LOG_RETENTION_DAYS.info);
  });

  it('총 삭제 개수를 합산하여 반환한다', async () => {
    const { db } = mockDb();
    let callIdx = 0;
    const changesPerLevel = [3, 10, 5, 2, 0];
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const idx = callIdx++;
      return {
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { changes: changesPerLevel[idx] ?? 0 } }),
        }),
      };
    });

    const summary = await deleteOldLogs(db);
    const totalDeleted = summary.reduce((sum, r) => sum + r.deletedCount, 0);
    expect(totalDeleted).toBe(20);
  });

  it('D1 에러 시 해당 레벨은 deletedCount=0으로 기록하고 계속 진행한다', async () => {
    const { db } = mockDb();
    let callIdx = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const idx = callIdx++;
      return {
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(
            idx === 2
              ? Promise.reject(new Error('D1 syntax error'))
              : { meta: { changes: 1 } },
          ),
        }),
      };
    });

    const results = await deleteOldLogs(db);
    expect(results[2].deletedCount).toBe(0);
    expect(results[2].error).toBeDefined();
    // 나머지 레벨은 정상
    expect(results[0].deletedCount).toBe(1);
    expect(results[4].deletedCount).toBe(1);
  });
});
