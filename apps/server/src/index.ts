// Hono app 엔트리. 라우트 마운트 + 미들웨어 (logger, cors, errorHandler, auth).
// ARCHITECTURE.md 4-3 코드 기반. /studies/* → studyRoutes, /rounds/* → roundRoutes.
//
// 부팅 검사: 첫 요청에서 assertBootEnvironment 실행 (isolate lifetime 동안 1회).
// 모듈 수준 변수지만 request-scoped 상태가 아님 — workers-best-practices "no global
// request state" 규칙 미위반. cold start 때마다 재평가됨.
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
import { assertBootEnvironment, logBootInfo } from './boot-check';

const app = new Hono<AppEnv>();

// 부팅 검사 — 첫 요청에서만 실행 (isolate cold start 시 1회).
// 실패 시 throw → errorHandler 가 500 반환 + 구조화 로그.
let bootVerified = false;
app.use('*', async (c, next) => {
  if (!bootVerified) {
    assertBootEnvironment(c.env);
    logBootInfo(c.env);
    bootVerified = true;
  }
  await next();
});

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
