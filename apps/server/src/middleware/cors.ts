// CORS 화이트리스트 미들웨어 — ENVIRONMENT 기반 origin 결정. ADR-011.
// prod: ALLOWED_ORIGINS var (콤마 구분) 에서 읽어 매칭되는 origin만 허용. 미설정 시 모든 cross-origin 차단.
// dev: localhost 하드코딩 (Vite 5173, wrangler 8787). ALLOWED_ORIGINS 무시.
// same-origin 요청은 Origin 헤더가 없으므로 자동 통과 (allowedOrigin=null → 헤더 미추가).
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';

const DEV_ORIGINS = new Set(['http://localhost:5173', 'http://localhost:8787']);

function pickAllowedOrigin(
  requestOrigin: string | undefined,
  env: AppEnv['Bindings'],
): string | null {
  if (!requestOrigin) return null;

  if (env.ENVIRONMENT === 'production') {
    const raw = env.ALLOWED_ORIGINS?.trim();
    if (!raw) return null;
    const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return allowed.includes(requestOrigin) ? requestOrigin : null;
  }

  return DEV_ORIGINS.has(requestOrigin) ? requestOrigin : null;
}

export const corsMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const allowedOrigin = pickAllowedOrigin(c.req.header('Origin'), c.env);

  if (c.req.method === 'OPTIONS') {
    if (allowedOrigin) {
      c.header('Access-Control-Allow-Origin', allowedOrigin);
      c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-Id');
      c.header('Access-Control-Max-Age', '86400');
      c.header('Vary', 'Origin');
    }
    return c.body(null, 204);
  }

  await next();

  if (allowedOrigin) {
    c.header('Access-Control-Allow-Origin', allowedOrigin);
    c.header('Vary', 'Origin');
  }
};
