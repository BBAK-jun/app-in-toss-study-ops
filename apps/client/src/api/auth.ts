import type { LoginResponse, SessionUser } from '@studyops/shared';
import { apiFetch } from './client';

// POST /auth/login — 인가코드(appLogin) → 세션 토큰 발급.
export function login(
  authorizationCode: string,
  referrer: 'DEFAULT' | 'SANDBOX',
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ authorizationCode, referrer }),
  });
}

// GET /auth/me — 현재 사용자.
export function getMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>('/auth/me');
}

// POST /auth/logout — 세션 무효화(MVP: 클라이언트 토큰 폐기가 본질).
export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}
