// apps/client/granite.config.ts — Apps-in-Toss 웹앱 설정(문서 4-5).
// 설치된 @apps-in-toss/web-framework 의 defineConfig 는
// brand({ displayName, primaryColor, icon }) 와 permissions(배열) 를 필수로 받는다.
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'studyopsbot',
  brand: {
    displayName: '스터디옵스',
    primaryColor: '#0064FF',
    icon: './src/assets/icon.png',
  },
  permissions: [], // MVP: 추가 권한 최소화
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'pnpm run dev',
      build: 'pnpm run build',
    },
  },
  webViewProps: {
    // iOS Safe Area & 레이아웃 처리: 시뮬레이터에서 레이아웃 겹침 방지
    bounces: true,
    pullToRefreshEnabled: false,
    allowsInlineMediaPlayback: true,
    allowsBackForwardNavigationGestures: true,
    mediaPlaybackRequiresUserAction: false,
  },
  outdir: 'dist',
});
