import { getToken } from '../../api/client';
import { removeBatch, incrementAttempts, type QueuedLog } from './storage';
import { isWithinMaxAttempts } from './backoff';
import type { LogBatchPayload } from '@studyops/shared';

export interface SendResult {
  sent: number;
  failed: number;
  deadLettered: number;
}

const SESSION_ID_KEY = 'studyops_log_session';

export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

function getUserAgent(): string {
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent;
  }
  return 'unknown';
}

const BATCH_SIZE = 50;

export async function sendBatch(
  entries: QueuedLog[],
  baseUrl: string,
): Promise<SendResult> {
  if (entries.length === 0) return { sent: 0, failed: 0, deadLettered: 0 };

  const toSend = entries.slice(0, BATCH_SIZE);
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const payload: LogBatchPayload = {
    entries: toSend.map((q) => q.entry),
    client: {
      sessionId: getSessionId(),
      userAgent: getUserAgent(),
    },
  };

  try {
    const res = await fetch(`${baseUrl}/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 202) {
      const body = await res.json().catch(() => ({ accepted: toSend.length }));
      const accepted = (body as { accepted?: number })?.accepted ?? toSend.length;
      await removeBatch(toSend.map((q) => q.id));
      return { sent: accepted, failed: 0, deadLettered: 0 };
    }

    const deadLettered = await handleFailedEntries(toSend);
    return { sent: 0, failed: toSend.length, deadLettered };
  } catch {
    const deadLettered = await handleFailedEntries(toSend);
    return { sent: 0, failed: toSend.length, deadLettered };
  }
}

async function handleFailedEntries(entries: QueuedLog[]): Promise<number> {
  const ids = entries.map((q) => q.id);
  await incrementAttempts(ids);

  const dead: string[] = [];
  for (const entry of entries) {
    if (!isWithinMaxAttempts(entry.attempts + 1)) {
      dead.push(entry.id);
    }
  }
  if (dead.length > 0) {
    await removeBatch(dead);
  }
  return dead.length;
}
