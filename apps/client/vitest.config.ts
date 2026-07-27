// Vitest 설정 — 클라이언트 로직 단위 테스트 (logger 모듈 등).
// indexedDB는 fake-indexeddb로 폴리필 (vitest.setup.ts). React 컴포넌트 테스트는
// 필요시 environment: 'jsdom' + @testing-library/react 별도 도입.
//
// @studyops/shared는 Vite alias로 소스 직접 참조 — 별도 빌드 없이 타입/로직 공유.
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
  resolve: {
    alias: {
      '@studyops/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
});
