import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LOG_EVENTS } from '@studyops/shared';
import { sendBatch } from './transport';
import { enqueueLog, dequeueBatch, purgeAll } from './storage';

vi.mock('../../api/client', () => ({
  getToken: vi.fn(() => 'test-token'),
}));

const BASE_URL = '';

beforeEach(async () => {
  vi.clearAllMocks();
  await purgeAll();
});

describe('sendBatch', () => {
  it('성공시 202를 받고 큐에서 제거한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ accepted: 1 }), { status: 202 }),
    );

    await enqueueLog({ ts: 1, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: 'test' });
    const batch = await dequeueBatch(10);

    const result = await sendBatch(batch, BASE_URL);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);

    const remaining = await dequeueBatch(10);
    expect(remaining).toHaveLength(0);
  });

  it('서버 에러시 attempts를 증가시키고 큐에 유지한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'oops' }), { status: 500 }),
    );

    await enqueueLog({ ts: 1, level: 'warn', source: 'client', event: LOG_EVENTS.CLIENT_API_ERROR, message: 'fail' });
    const batch = await dequeueBatch(10);

    const result = await sendBatch(batch, BASE_URL);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);

    const remaining = await dequeueBatch(10);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].attempts).toBe(1);
  });

  it('네트워크 에러시 attempts를 증가시키고 큐에 유지한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    await enqueueLog({ ts: 1, level: 'error', source: 'client', event: LOG_EVENTS.CLIENT_API_ERROR, message: 'netfail' });
    const batch = await dequeueBatch(10);

    const result = await sendBatch(batch, BASE_URL);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);

    const remaining = await dequeueBatch(10);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].attempts).toBe(1);
  });

  it('빈 배치는 fetch를 호출하지 않는다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await sendBatch([], BASE_URL);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('여러 엔트리를 한 번에 전송한다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ accepted: 3 }), { status: 202 }),
    );

    for (let i = 0; i < 3; i++) {
      await enqueueLog({ ts: i, level: 'info', source: 'client', event: LOG_EVENTS.CLIENT_PAGE_VIEW, message: `m${i}` });
    }
    const batch = await dequeueBatch(10);

    const result = await sendBatch(batch, BASE_URL);
    expect(result.sent).toBe(3);

    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.entries).toHaveLength(3);
    expect(callBody.client.sessionId).toBeTruthy();
    expect(callBody.client.userAgent).toBeTruthy();
  });
});
