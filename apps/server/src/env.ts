// Hono 앱 컨텍스트 타입. Bindings는 wrangler가 자동 생성한 `Env` 인터페이스
// (worker-configuration.d.ts)에서 가져온다 — workers-best-practices 규칙에 따라
// 손으로 Bindings를 다시 정의하지 않는다. wrangler.jsonc 변경 후 `wrangler types` 재실행.
//
// Secrets (SESSION_SECRET, DISCORD_WEBHOOK_DEFAULT)는 wrangler secret으로만 주입되므로
// 자동 생성 타입에 누락된다. 이를 보강하기 위해 Env에 intersect.
//
// ENVIRONMENT 바인딩이 wrangler.jsonc vars에 추가됨 — 부팅 시 dev/prod 분기에 사용 (boot-check).

// Secrets는 wrangler secret put으로만 설정되므로 wrangler types가 생성하지 않는다.
// 별도 인터페이스로 정의하고 Env와 intersect하여 AppEnv.Bindings를 구성.
export interface SecretBindings {
  SESSION_SECRET: string;
  DISCORD_WEBHOOK_DEFAULT?: string;
  MCP_API_TOKEN: string; // Bearer token for /mcp endpoint (Sisyphus agent). See ADR-010.
  CF_API_TOKEN?: string; // Cloudflare API token for AE SQL API reads. See ADR-013 Phase 3.
}

// Hono app 전체 컨텍스트 타입. 모든 라우트/미들웨어에서 공유.
// Variables.user 는 authMiddleware 통과 후 세팅됨.
// Variables.requestId 는 requestIdMiddleware 가 세팅 (X-Request-Id 응답 헤더 + 로그 추적).
export type AppEnv = {
  // `Env`는 wrangler types가 생성한 전역 인터페이스 (worker-configuration.d.ts).
  // 거기에 secrets를 합친다.
  Bindings: Env & SecretBindings;
  Variables: {
    user: { userKey: number };
    requestId: string;
  };
};
