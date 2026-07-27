import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// 루트 Vitest 설정 — server (순수 단위 테스트) + client (DOM/IndexedDB) 단위 테스트.
// Workers/D1 통합 테스트(@cloudflare/vitest-pool-workers)는 apps/server/vitest.config.mts
// 에서 별도 실행 — `npm run test:workers`. cloudflare:test 모듈을 import하는 테스트는
// 여기서 exclude.
//
// 커버리지:
//   apps/server/src/**/*.test.ts        — 서버 단위 로직 (순수 함수, D1은 mock)
//   packages/shared/src/**/*.test.ts    — 공유 타입/상수 검증
//   apps/client/src/**/*.test.ts(x)     — 클라이언트 로직 (IndexedDB는 fake-indexeddb)
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'apps/server/src/**/*.test.ts',
      'packages/shared/src/**/*.test.ts',
      'apps/client/src/**/*.test.{ts,tsx}',
    ],
    // cloudflare:test (Workers pool) import하는 통합 테스트 — server config 에서 실행
    exclude: [
      'node_modules/**',
      'dist/**',
      '.wrangler/**',
      'apps/server/src/middleware/cors.test.ts',
      'apps/server/src/routes/health.test.ts',
    ],
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'apps/server/src/lib/**/*.ts',
        'apps/server/src/middleware/**/*.ts',
        'apps/client/src/lib/logger/**/*.ts',
        'packages/shared/src/**/*.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@studyops/shared': fileURLToPath(
        new URL('./packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
});
