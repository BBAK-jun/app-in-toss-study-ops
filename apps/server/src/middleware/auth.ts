// Bearer 세션 토큰 검증 미들웨어.
// Authorization: Bearer <sessionToken> → verifySession → c.set('user', { userKey }).
// 검증 실패 시 401 UNAUTHORIZED.
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';
import { verifySession } from '../lib/session';

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  const session = await verifySession(c.env, token);
  if (!session) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired session token');
  }
  c.set('user', session);
  await next();
};
