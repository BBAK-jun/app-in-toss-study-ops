import type { ApiErrorResponse } from '@studyops/shared';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

const DEFAULT_TOKEN_KEY = 'studyops_session';

export function createSessionTokenStore(key: string = DEFAULT_TOKEN_KEY): TokenStore {
  return {
    get: () => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (token) => {
      try {
        sessionStorage.setItem(key, token);
      } catch {
        // sessionStorage unavailable (private mode) — token stays in memory only
      }
    },
    clear: () => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

export interface ClientConfig {
  baseUrl: string;
  tokenStore?: TokenStore;
}

export type FetchFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export function createFetchFn(baseUrl: string, tokenStore: TokenStore): FetchFn {
  return async function fetchFn<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = tokenStore.get();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as ApiErrorResponse);
      const code = body?.error?.code ?? 'INTERNAL_ERROR';
      const message = body?.error?.message ?? res.statusText;
      throw new ApiError(code, message, res.status);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  };
}
