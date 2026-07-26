// Hono app 엔트리. 라우트 마운트 + 미들웨어 (logger, cors, errorHandler, auth).
// ARCHITECTURE.md 4-3 코드 기반. /studies/* → studyRoutes, /rounds/* → roundRoutes.
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import type { AppEnv } from './env';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { healthRoutes } from './routes/health';
import { authRoutes } from './auth/routes';
import { studyRoutes } from './routes/studies';
import { roundRoutes } from './routes/rounds';

const app = new Hono<AppEnv>();

app.use('*', logger());
// MVP: Bearer 토큰 인증(쿠키 X)이라 와일드카드 출처 허용. Pages 도메인 확정 후 origin 좁히기 권장.
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));
app.onError(errorHandler);

// 공개 라우트
app.route('/', healthRoutes);
app.route('/auth', authRoutes);

// 인증 필요 라우트 그룹
const protectedApi = new Hono<AppEnv>();
protectedApi.use('*', authMiddleware);
protectedApi.route('/studies', studyRoutes);
protectedApi.route('/rounds', roundRoutes);

app.route('/', protectedApi);

export default app;
