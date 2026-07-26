// @ts-check
import { defineConfig } from 'astro/config';

// 정적 사이트로 빌드. Cloudflare Pages / GitHub Pages / 로컬 preview 어디든 배포 가능.
// Phase 3에서 adapter 붙일 때까지 SSR 없이 정적 유지.
export default defineConfig({
  site: 'https://studyops-wiki.local',
  base: '/',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: false,
  },
});
