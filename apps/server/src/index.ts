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
import { studyRoutes } from './routes/studies';
import { roundRoutes } from './routes/rounds';
import { logRoutes } from './routes/logs';
import { adminLogRoutes } from './routes/admin/logs';
import { adminLogMetricsRoutes } from './routes/admin/logs-metrics';
import { adminLogArchiveRoutes } from './routes/admin/logs-archive';
import { runRetentionJob } from './scheduled';
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
app.onError(errorHandler);

app.route('/', healthRoutes);
app.route('/auth', authRoutes);

const protectedApi = new Hono<AppEnv>();
protectedApi.use('*', authMiddleware);
protectedApi.route('/studies', studyRoutes);
protectedApi.route('/rounds', roundRoutes);
protectedApi.route('/logs', logRoutes);
  protectedApi.route('/admin/logs', adminLogRoutes);
  protectedApi.route('/admin/logs', adminLogMetricsRoutes);
  protectedApi.route('/admin/logs', adminLogArchiveRoutes);

app.route('/', protectedApi);

export default {
  fetch(request: Request, env: AppEnv['Bindings'], ctx: ExecutionContext): Response | Promise<Response> {
    ensureBoot(env);

    const url = new URL(request.url);

    if (url.pathname.startsWith('/mcp')) {
      // /mcp는 Hono 체인 밖 — requestId/errorHandler를 직접 호출해 동일 포맷/로그를 유지 (A3).
      const requestId = request.headers.get('cf-ray') || crypto.randomUUID();
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
    ctx.waitUntil(runRetentionJob(env));
  },
};
