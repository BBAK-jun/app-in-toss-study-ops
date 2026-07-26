import { describe, it, expect, beforeEach } from 'vitest';
import { LOG_EVENTS } from '@studyops/shared';
import {
  enqueueLog,
  dequeueBatch,
  removeBatch,
  incrementAttempts,
  purgeExpired,
  getQueueSize,
  purgeAll,
  _setQueuedLogForTest,
  type QueuedLog,
} from './storage';

beforeEach(async () => {
  await purgeAll();
});

describe('enqueueLog / getQueueSize', () => {
  it('엔트리를 큐에 추가하고 size가 증가한다', async () => {
    const entry = { ts: 1, level: 'info' as const, source: 'client' as const, event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'test' };
    await enqueueLog(entry);
    expect(await getQueueSize()).toBe(1);
  });

  it('여러 엔트리 추가 후 size 반영', async () => {
    for (let i = 0; i < 5; i++) {
      await enqueueLog({ ts: i, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: `m${i}` });
    }
    expect(await getQueueSize()).toBe(5);
  });
});

describe('dequeueBatch', () => {
  it('FIFO 순서로 배치 반환 (createdAt 오름차순)', async () => {
    for (let i = 0; i < 5; i++) {
      await enqueueLog({ ts: i, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: `m${i}` });
    }
    const batch = await dequeueBatch(3);
    expect(batch).toHaveLength(3);
    expect(batch[0].entry.message).toBe('m0');
    expect(batch[2].entry.message).toBe('m2');
  });

  it('max보다 적으면 있는 만큼만 반환', async () => {
    await enqueueLog({ ts: 1, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'a' });
    const batch = await dequeueBatch(10);
    expect(batch).toHaveLength(1);
  });

  it('빈 큐는 빈 배열 반환', async () => {
    const batch = await dequeueBatch(10);
    expect(batch).toEqual([]);
  });

  it('반환된 항목에는 id, entry, attempts, createdAt가 있다', async () => {
    await enqueueLog({ ts: 1, level: 'warn', source: 'client', event: LOG_EVENTS.CLIENT_API_ERROR, message: 'x' });
    const batch = await dequeueBatch(1);
    expect(batch[0].id).toBeTruthy();
    expect(batch[0].entry).toBeTruthy();
    expect(batch[0].attempts).toBe(0);
    expect(batch[0].createdAt).toBeGreaterThan(0);
  });
});

describe('removeBatch', () => {
  it('주어진 id들의 항목을 삭제한다', async () => {
    await enqueueLog({ ts: 1, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'a' });
    await enqueueLog({ ts: 2, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'b' });

    const batch = await dequeueBatch(2);
    await removeBatch(batch.map((b) => b.id));

    expect(await getQueueSize()).toBe(0);
  });

  it('존재하지 않는 id는 무시한다', async () => {
    await removeBatch(['nonexistent']);
    expect(await getQueueSize()).toBe(0);
  });
});

describe('incrementAttempts', () => {
  it('attempts를 1 증가시킨다', async () => {
    await enqueueLog({ ts: 1, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'a' });
    const batch = await dequeueBatch(1);
    await incrementAttempts(batch.map((b) => b.id));

    const remaining = await dequeueBatch(1);
    expect(remaining[0].attempts).toBe(1);
  });
});

describe('purgeExpired', () => {
  it('maxAge보다 오래된 항목을 삭제한다', async () => {
    const oldTs = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await enqueueLog({ ts: 1, level: 'debug', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'old' });

    const batch = await dequeueBatch(1);
    await incrementAttempts(batch.map((b) => b.id));

    const newEntry: QueuedLog = { ...batch[0], createdAt: oldTs };
    await _setQueuedLogForTest(newEntry);

    const deleted = await purgeExpired(7 * 24 * 60 * 60 * 1000);
    expect(deleted).toBe(1);
    expect(await getQueueSize()).toBe(0);
  });

  it('maxAge 이내의 항목은 유지한다', async () => {
    await enqueueLog({ ts: 1, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'recent' });
    const deleted = await purgeExpired(7 * 24 * 60 * 60 * 1000);
    expect(deleted).toBe(0);
    expect(await getQueueSize()).toBe(1);
  });
});
