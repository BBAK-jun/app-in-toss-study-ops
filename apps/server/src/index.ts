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
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));
app.onError(errorHandler);

app.route('/', healthRoutes);
app.route('/auth', authRoutes);

const protectedApi = new Hono<AppEnv>();
protectedApi.use('*', authMiddleware);
protectedApi.route('/studies', studyRoutes);
protectedApi.route('/rounds', roundRoutes);

app.route('/', protectedApi);

export default {
  fetch(request: Request, env: AppEnv['Bindings'], ctx: ExecutionContext): Response | Promise<Response> {
    ensureBoot(env);

    const url = new URL(request.url);

    if (url.pathname.startsWith('/mcp')) {
      const auth = request.headers.get('Authorization');
      if (!env.MCP_API_TOKEN || auth !== `Bearer ${env.MCP_API_TOKEN}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return StudyOpsMcpAgent.serve('/mcp', { binding: 'STUDYOPS_MCP' }).fetch(
        request,
        env,
        ctx,
      );
    }

    return app.fetch(request, env, ctx);
  },
};
