import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// 루트 Vitest 설정 — server (Workers 환경 흉내) + client (DOM/IndexedDB) 단위 테스트.
// Workers/D1 통합 테스트(@cloudflare/vitest-pool-workers)는 별도 도입 필요시 추가.
//
// 커버리지:
//   apps/server/src/**/*.test.ts        — 서버 로직 (순수 함수, D1은 mock)
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
    exclude: ['node_modules/**', 'dist/**', '.wrangler/**'],
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
