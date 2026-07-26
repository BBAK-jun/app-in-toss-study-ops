import type { ApiErrorResponse } from '@studyops/shared';

// API 베이스 URL — 빈 값이면 같은 출처(Vite proxy)로 동작(문서 4-5).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// 세션 토큰 저장 키. localStorage 금지 → sessionStorage(문서 4-4).
const DEFAULT_TOKEN_KEY = 'studyops_session';

export function getToken(key: string = DEFAULT_TOKEN_KEY): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setToken(token: string, key: string = DEFAULT_TOKEN_KEY): void {
  try {
    sessionStorage.setItem(key, token);
  } catch {
    // 세션 스토리지 접근 불가(프라이빗 모드 등) → 무시. 인증은 메모리에서만 유지.
  }
}

export function clearToken(key: string = DEFAULT_TOKEN_KEY): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// 정규화된 API 에러. code 는 ApiErrorCode, status 는 HTTP 상태.
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

// fetch 래퍼 — JSON 처리 + Bearer 토큰 주입 + 에러 정규화.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as ApiErrorResponse));
    const code = body?.error?.code ?? 'INTERNAL_ERROR';
    const message = body?.error?.message ?? res.statusText;
    throw new ApiError(code, message, res.status);
  }
  if (res.status === 204) return undefined as T;
  // 빈 본문 대비
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
