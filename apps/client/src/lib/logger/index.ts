import type { LogLevel, LogEvent, LogEntry } from '@studyops/shared';
import { LOG_EVENTS } from '@studyops/shared';
import { enqueueLog, dequeueBatch } from './storage';
import { sendBatch, getSessionId } from './transport';
import { calculateBackoff, isWithinMaxAttempts } from './backoff';

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_DEBOUNCE_MS = 2_000;
const BATCH_SIZE = 50;

const BASE_URL = import.meta.env.VITE_LOG_SERVER_URL ?? '';

const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';

class ClientLogger {
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private retryCount = 0;

  constructor() {
    if (isBrowser) {
      this.setupGlobalHandlers();
      this.startInterval();
    }
  }

  debug(event: LogEvent, message: string, context?: Record<string, unknown>): void {
    this.emit('debug', event, message, context);
  }

  info(event: LogEvent, message: string, context?: Record<string, unknown>): void {
    this.emit('info', event, message, context);
  }

  warn(event: LogEvent, message: string, context?: Record<string, unknown>): void {
    this.emit('warn', event, message, context);
  }

  error(
    event: LogEvent,
    message: string,
    context?: Record<string, unknown>,
    stack?: string,
  ): void {
    this.emit('error', event, message, context, stack);
  }

  fatal(
    event: LogEvent,
    message: string,
    context?: Record<string, unknown>,
    stack?: string,
  ): void {
    this.emit('fatal', event, message, context, stack);
  }

  private emit(
    level: LogLevel,
    event: LogEvent,
    message: string,
    context?: Record<string, unknown>,
    stack?: string,
  ): void {
    const entry: LogEntry = {
      ts: Date.now(),
      level,
      source: 'client',
      event,
      message,
      sessionId: getSessionId(),
      context,
      stack,
    };

    const consoleFn =
      level === 'error' || level === 'fatal'
        ? 'error'
        : level === 'warn'
          ? 'warn'
          : 'log';
    console[consoleFn](JSON.stringify(entry));

    void enqueueLog(entry);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), FLUSH_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      const batch = await dequeueBatch(BATCH_SIZE);
      if (batch.length === 0) return;
      const result = await sendBatch(batch, BASE_URL);
      if (result.failed > 0 && result.sent === 0) {
        this.retryCount++;
        if (isWithinMaxAttempts(this.retryCount)) {
          const delay = calculateBackoff(this.retryCount);
          setTimeout(() => void this.flush(), delay);
        }
      } else {
        this.retryCount = 0;
      }
    } catch {
      // Flush failures are non-fatal — entries remain in queue.
    } finally {
      this.isFlushing = false;
    }
  }

  private setupGlobalHandlers(): void {
    window.addEventListener('error', (e: ErrorEvent) => {
      this.error(
        LOG_EVENTS.CLIENT_ERROR_UNHANDLED,
        e.message || 'Unhandled error',
        { filename: e.filename, line: e.lineno, col: e.colno },
        e.error?.stack,
      );
    });

    window.addEventListener(
      'unhandledrejection',
      (e: PromiseRejectionEvent) => {
        const reason = e.reason;
        this.error(
          LOG_EVENTS.CLIENT_ERROR_PROMISE,
          reason instanceof Error ? reason.message : String(reason),
          undefined,
          reason instanceof Error ? reason.stack : undefined,
        );
      },
    );

    window.addEventListener('online', () => void this.flush());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flush();
    });

    window.addEventListener('pagehide', () => void this.flush());
  }

  private startInterval(): void {
    this.intervalTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  destroy(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.intervalTimer) clearInterval(this.intervalTimer);
  }
}

export const logger = new ClientLogger();
