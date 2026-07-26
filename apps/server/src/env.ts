// Cloudflare Workers Bindings 타입 (wrangler.toml의 binding + env + secrets).
// D1 binding "DB", 환경변수는 [vars] 또는 .dev.vars / wrangler secret.

export interface Bindings {
  DB: D1Database;
  TOSS_AUTH_MODE: 'dev' | 'live';
  TOSS_API_BASE_URL: string;
  SESSION_SECRET: string;
  DISCORD_WEBHOOK_DEFAULT?: string;
}

// Hono app 전체 컨텍스트 타입. 모든 라우트/미들웨어에서 공유.
// Variables.user 는 authMiddleware 통과 후 세팅됨.
export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    user: { userKey: number };
  };
};
