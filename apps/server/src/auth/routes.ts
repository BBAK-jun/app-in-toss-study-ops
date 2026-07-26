// 인증 라우트 — POST /auth/login (공개), GET /auth/me + POST /auth/logout (인증 필요).
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../lib/http-error';
import { issueSession } from '../lib/session';
import { resolveTossUser } from './toss';
import { createDb } from '../db/client';
import { users } from '../db/schema';
import type { LoginRequest, LoginResponse, SessionUser } from '@studyops/shared';

export const authRoutes = new Hono<AppEnv>();

// POST /auth/login — 인가코드 → 세션 토큰 발급
authRoutes.post('/login', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<LoginRequest> | null;
  if (!body || typeof body.authorizationCode !== 'string' || !body.referrer) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'authorizationCode and referrer are required');
  }
  if (body.referrer !== 'DEFAULT' && body.referrer !== 'SANDBOX') {
    throw new HttpError(400, 'VALIDATION_ERROR', "referrer must be 'DEFAULT' or 'SANDBOX'");
  }

  const tossUser = await resolveTossUser(c.env, body.authorizationCode, body.referrer);
  const db = createDb(c.env.DB);
  const now = Date.now();

  const existing = await db.select().from(users).where(eq(users.userKey, tossUser.userKey)).all();
  const displayName =
    tossUser.name ?? existing[0]?.displayName ?? `사용자 ${tossUser.userKey}`;
  if (existing.length === 0) {
    await db
      .insert(users)
      .values({ userKey: tossUser.userKey, displayName, createdAt: now });
  } else {
    await db.update(users).set({ displayName }).where(eq(users.userKey, tossUser.userKey));
  }

  const sessionToken = await issueSession(c.env, tossUser.userKey);
  const user: SessionUser = { userKey: tossUser.userKey, displayName };
  const res: LoginResponse = { sessionToken, user };
  return c.json(res, 200);
});

// 인증 필요 서브라우트
const protectedAuth = new Hono<AppEnv>();
protectedAuth.use('*', authMiddleware);

// GET /auth/me — 현재 사용자
protectedAuth.get('/me', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const row = await db.select().from(users).where(eq(users.userKey, userKey)).get();
  if (!row) {
    throw new HttpError(404, 'NOT_FOUND', 'User not found');
  }
  const user: SessionUser = { userKey: row.userKey, displayName: row.displayName };
  return c.json(user, 200);
});

// POST /auth/logout — stateless JWT, 클라이언트 토큰 폐기만 (204)
protectedAuth.post('/logout', (c) => {
  return c.body(null, 204);
});

authRoutes.route('/', protectedAuth);
