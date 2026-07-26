import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { buildInfoPlugin } from './vite-plugins/build-info';

// SPA 라우트(/studies/:id, /rounds/:id) 문서 요청이 API 프록시로 빨려들어
// 401이 뜨는 버그 수정: 브라우저 네비게이션(Accept: text/html)은 index.html을
// 서브하고, XHR/fetch(Accept: application/json)만 워커로 프록시한다.
function spaBypass(req) {
  if (req.headers.accept?.includes('text/html')) return '/index.html';
  return undefined;
}

// https://vitejs.dev/config/
// Cloudflare Worker(포트 8787)와의 CORS 이슈를 피하기 위해 개발 환경에서는
// /auth, /studies, /rounds 경로를 로컬 워커로 프록시한다.
// VITE_API_BASE_URL이 비어 있으면(같은 출처) 프록시가 동작하고,
// 명시된 경우(예: http://localhost:8787)에는 직접 호출한다.
export default defineConfig({
  plugins: [react(), buildInfoPlugin()],
  resolve: {
    alias: {
      '@studyops/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    // DEV-ONLY: 외부 터널(trycloudflare 등) 호스트 허용. 피그마 변환기/원격 렌더링용.
    allowedHosts: ['.trycloudflare.com', 'localhost'],
    proxy: {
      // SPA 라우트(/studies/:id, /rounds/:id) 문서 요청이 API 프록시로 빨려들어
      // 401이 뜨는 버그 수정: 브라우저 네비게이션(Accept: text/html)은 index.html을
      // 서브하고, XHR/fetch(Accept: application/json)만 워커로 프록시한다.
      '/auth': { target: 'http://localhost:8787', changeOrigin: true, bypass: spaBypass },
      '/studies': { target: 'http://localhost:8787', changeOrigin: true, bypass: spaBypass },
      '/rounds': { target: 'http://localhost:8787', changeOrigin: true, bypass: spaBypass },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // TDS / emotion 을 별도 청크로 분리해 초기 번들을 가볍게 유지(4-10 R2 참고).
        manualChunks: {
          tds: ['@toss/tds-mobile', '@toss/tds-mobile-ait'],
          emotion: ['@emotion/react'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
