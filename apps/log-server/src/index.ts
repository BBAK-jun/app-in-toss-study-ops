import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './env';
import { HttpError, formatHttpError } from './lib/http-error';
import { logRoutes } from './routes/logs';
import { adminLogRoutes } from './routes/admin/logs';
import { adminLogArchiveRoutes } from './routes/admin/logs-archive';
import { adminLogMetricsRoutes } from './routes/admin/logs-metrics';
import { runRetentionJob } from './scheduled';

const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  const requestId = c.req.header('cf-ray') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  if (!origin) return next();

  const isDev = c.env.ENVIRONMENT !== 'production';
  const allowedOrigins = isDev
    ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8787']
    : (c.env.ALLOWED_ORIGINS?.split(',').map((s: string) => s.trim()) ?? []);

  if (allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Max-Age', '86400');
  }

  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

app.onError((err, c) => {
  const requestId = c.get('requestId') ?? 'unknown';
  return formatHttpError(err, { requestId, method: c.req.method, path: c.req.path });
});

app.route('/logs', logRoutes);
app.route('/admin/logs', adminLogRoutes);
app.route('/admin/logs/archive', adminLogArchiveRoutes);
app.route('/admin/logs/metrics', adminLogMetricsRoutes);

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

export default {
  async fetch(request: Request, env: AppEnv['Bindings'], ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(
    _controller: ScheduledController,
    env: AppEnv['Bindings'],
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runRetentionJob(env));
  },
};
