// log-server 단위 테스트 설정 — 순수 함수 검증 전용.
// (analytics 데이터포인트 매핑·청크 분할, R2 아카이브 JSONL 직렬화·키 빌드,
//  AE SQL 빌더). pool-workers/D1/miniflare 불필요 → node 환경.
// server 의 cloudflareTest(pool-workers) 설정과 대조.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
