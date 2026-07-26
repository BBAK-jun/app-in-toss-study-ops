// 헬스체크 라우트 — GET /health (라이트), GET /ready (딥).
// /health: 부하 없는 라이트체크 (warm 상태만). k8s/ALB liveness용.
// /ready: D1 연결 + ENVIRONMENT + 필수 secrets 존재 검사. 장애 시 503. 배포 직후/장애 진단용.
import { Hono } from 'hono';
import type { AppEnv } from '../env';

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/health', (c) => {
  return c.json({ ok: true, ts: Date.now() }, 200);
});

healthRoutes.get('/ready', async (c) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks.db = { ok: true };
  } catch (e) {
    checks.db = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  checks.environment = {
    ok: c.env.ENVIRONMENT === 'dev' || c.env.ENVIRONMENT === 'production',
    detail: c.env.ENVIRONMENT ?? 'unset',
  };

  checks.sessionSecret = { ok: !!c.env.SESSION_SECRET };

  if (c.env.ENVIRONMENT === 'production') {
    checks.mcpApiToken = { ok: !!c.env.MCP_API_TOKEN };
  }

  const allOk = Object.values(checks).every((v) => v.ok);
  return c.json({ ok: allOk, checks, ts: Date.now() }, allOk ? 200 : 503);
});
