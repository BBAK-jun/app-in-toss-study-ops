// 헬스체크 — GET /health → { ok, ts }
import { Hono } from 'hono';
import type { AppEnv } from '../env';

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/health', (c) => {
  return c.json({ ok: true, ts: Date.now() }, 200);
});
