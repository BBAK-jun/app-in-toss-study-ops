import { createStore, get, set, del, keys, values } from 'idb-keyval';
import type { LogEntry } from '@studyops/shared';
import { LOG_RETENTION_DAYS } from '@studyops/shared';

const store = createStore('studyops-logs', 'queue');
export const MAX_QUEUE_SIZE = 1000;

export interface QueuedLog {
  id: string;
  entry: LogEntry;
  attempts: number;
  createdAt: number;
  seq: number;
}

let seqCounter = 0;

export async function enqueueLog(entry: LogEntry): Promise<void> {
  const currentSize = await getQueueSize();
  if (currentSize >= MAX_QUEUE_SIZE) {
    return;
  }
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const queued: QueuedLog = {
    id,
    entry,
    attempts: 0,
    createdAt: Date.now(),
    seq: seqCounter++,
  };
  await set(id, queued, store);
}

export async function dequeueBatch(max: number): Promise<QueuedLog[]> {
  const allKeys = (await keys(store)) as IDBValidKey[];
  if (allKeys.length === 0) return [];

  const allValues = (await values(store)) as QueuedLog[];
  allValues.sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.seq - b.seq;
  });
  return allValues.slice(0, max);
}

export async function removeBatch(ids: string[]): Promise<void> {
  for (const id of ids) {
    await del(id, store);
  }
}

export async function incrementAttempts(ids: string[]): Promise<void> {
  for (const id of ids) {
    const existing = (await get(id, store)) as QueuedLog | undefined;
    if (!existing) continue;
    await set(id, { ...existing, attempts: existing.attempts + 1 }, store);
  }
}

export async function purgeExpired(maxAgeMs: number): Promise<number> {
  const allValues = (await values(store)) as QueuedLog[];
  const cutoff = Date.now() - maxAgeMs;
  let deleted = 0;
  for (const q of allValues) {
    if (q.createdAt < cutoff) {
      await del(q.id, store);
      deleted++;
    }
  }
  return deleted;
}

export async function getQueueSize(): Promise<number> {
  const allKeys = (await keys(store)) as IDBValidKey[];
  return allKeys.length;
}

export async function purgeAll(): Promise<void> {
  const allKeys = (await keys(store)) as IDBValidKey[];
  for (const k of allKeys) {
    await del(k, store);
  }
}

export async function purgeExpiredByRetention(): Promise<number> {
  const maxAge = LOG_RETENTION_DAYS.debug * 24 * 60 * 60 * 1000;
  return purgeExpired(maxAge);
}

export async function _setQueuedLogForTest(queued: QueuedLog): Promise<void> {
  await set(queued.id, queued, store);
}
