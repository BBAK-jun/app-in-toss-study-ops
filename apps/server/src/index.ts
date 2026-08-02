import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { AppEnv } from './env';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { requestIdMiddleware } from './middleware/request-id';
import { corsMiddleware } from './middleware/cors';
import { loggingMiddleware } from './middleware/logging';
import { healthRoutes } from './routes/health';
import { authRoutes } from './auth/routes';
import { studyRoutes } from './contexts/study/presentation/study-routes';
import { roundRoutes } from './contexts/round/presentation/round-routes';
import { systemClock } from './contexts/round/infrastructure/clock';
import { cryptoIds } from './contexts/round/infrastructure/id-generator';
import { D1UnitOfWork } from './contexts/round/infrastructure/unit-of-work';
import { DrizzleStudyOwnershipService } from './contexts/round/infrastructure/study-ownership.drizzle';
import { D1StudyUnitOfWork } from './contexts/study/infrastructure/unit-of-work';
import { studyCryptoIds } from './contexts/study/infrastructure/id-generator';
import { assertBootEnvironment, logBootInfo } from './boot-check';
import { HttpError, formatHttpError } from './lib/http-error';
import { StudyOpsMcpAgent } from './mcp/server';

export { StudyOpsMcpAgent };

const app = new Hono<AppEnv>();

let bootVerified = false;
function ensureBoot(env: AppEnv['Bindings']): void {
  if (!bootVerified) {
    assertBootEnvironment(env);
    logBootInfo(env);
    bootVerified = true;
  }
}

app.use('*', logger());
app.use('*', requestIdMiddleware);
app.use('*', corsMiddleware);
app.use('*', loggingMiddleware);
// Round + Study 컨텍스트 DI 주입 — clock/ids 는 싱글턴, UoW/소유권 서비스는 요청마다 c.env.DB 로부터 생성.
app.use('*', async (c, next) => {
  c.set('clock', systemClock);
  c.set('ids', cryptoIds);
  c.set('newUow', () => new D1UnitOfWork(c.env.DB));
  c.set('newOwnership', () => new DrizzleStudyOwnershipService(c.env.DB));
  c.set('studyIds', studyCryptoIds);
  c.set('newStudyUow', () => new D1StudyUnitOfWork(c.env.DB));
  await next();
});
app.onError(errorHandler);

app.route('/', healthRoutes);
app.route('/auth', authRoutes);

const protectedApi = new Hono<AppEnv>();
protectedApi.use('*', authMiddleware);
protectedApi.route('/studies', studyRoutes);
protectedApi.route('/rounds', roundRoutes);

app.route('/', protectedApi);

export default {
  async fetch(request: Request, env: AppEnv['Bindings'], ctx: ExecutionContext): Promise<Response> {
    ensureBoot(env);

    const url = new URL(request.url);

    if (url.pathname.startsWith('/mcp')) {
      // /mcp는 Hono 체인 밖 — requestId/errorHandler를 직접 호출해 동일 포맷/로그를 유지 (A3).
      const requestId = request.headers.get('cf-ray') || crypto.randomUUID();

      const mcpIp = request.headers.get('cf-connecting-ip') || 'unknown';
      const { success: mcpRateOk } = await env.MCP_RATE_LIMITER.limit({ key: `mcp:${mcpIp}` });
      if (!mcpRateOk) {
        return formatHttpError(
          new HttpError(429, 'TOO_MANY_REQUESTS', 'Rate limit exceeded. Try again later.'),
          { requestId, method: request.method, path: url.pathname, userKey: null },
        );
      }

      const auth = request.headers.get('Authorization');
      if (!env.MCP_API_TOKEN || auth !== `Bearer ${env.MCP_API_TOKEN}`) {
        return formatHttpError(
          new HttpError(401, 'UNAUTHORIZED', 'Invalid or missing MCP API token'),
          { requestId, method: request.method, path: url.pathname, userKey: null },
        );
      }
      return StudyOpsMcpAgent.serve('/mcp', { binding: 'STUDYOPS_MCP' }).fetch(
        request,
        env,
        ctx,
      );
    }

    return app.fetch(request, env, ctx);
  },

  async scheduled(
    _controller: ScheduledController,
    env: AppEnv['Bindings'],
    ctx: ExecutionContext,
  ): Promise<void> {
    ensureBoot(env);
    // Log retention cron moved to apps/log-server (distributed architecture)
    ctx.waitUntil(
      Promise.resolve(
        console.log(
          JSON.stringify({
            level: 'info',
            event: 'cron.trigger',
            message: 'Scheduled trigger received — no-op (retention moved to log-server)',
            cronTrigger: _controller.cron,
          }),
        ),
      ),
    );
  },
};
