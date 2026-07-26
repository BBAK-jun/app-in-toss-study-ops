// Vitest 설정 — Cloudflare Workers 환경에서 테스트 실행 (Miniflare 기반).
// ADR-012 참조. wrangler.jsonc 의 binding(D1, vars)을 그대로 상속.
// Secrets (SESSION_SECRET, MCP_API_TOKEN)은 miniflare.bindings 에서 주입 —
// 실제 wrangler secret 이 아닌 테스트 전용 값.
//
// v4 API: cloudflareTest 플러그인이 pool 설정 + wrangler binding 상속을 담당.
// (이전 defineWorkersConfig / pool:'workers' 방식은 v3에서 deprecated)
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // boot-check 통과용 최소 secrets. prod 전용 검증은 별도 테스트에서.
        bindings: {
          SESSION_SECRET: 'test-session-secret-at-least-32-chars-long',
          MCP_API_TOKEN: 'test-mcp-api-token',
        },
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
