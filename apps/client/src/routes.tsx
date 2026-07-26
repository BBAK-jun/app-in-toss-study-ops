// apps/client/src/routes.tsx
// 라우트 + 레이아웃 메타데이터의 단일 진실 소스(single source of truth).
//
// 페이지 컴포넌트는 더 이상 AppShell 을 import 하지 않는다.
// 각 페이지의 title / back / right / hideChrome 정책은 이 파일의 LayoutSpec 으로 선언되고,
// GnbLayout / FullscreenLayout 이 useMatches() 로 읽어 AppShell 또는 bare <Outlet/> 으로 입힌다.
//
// 새 라우트 추가 절차:
//   1. 페이지 컴포넌트 작성(본문만).
//   2. 이 배열에 한 줄 추가(layoutGroup + layout 메타데이터).
// 그 외 파일은 건드릴 필요 없음.

import type { RouteSpec } from './layout/types';
import { LoginPage } from './pages/LoginPage';
import { StudiesPage } from './pages/StudiesPage';
import { StudyDetailPage } from './pages/StudyDetailPage';
import { RoundDetailPage } from './pages/RoundDetailPage';
import { SubmissionCreatePage } from './pages/SubmissionCreatePage';
import { ReminderPage } from './pages/ReminderPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RefreshButton } from './layout/RefreshButton';

/**
 * 앱의 모든 라우트. App.tsx 가 이 배열을 읽어 layoutGroup 별로
 * <Route element={<Layout/>}> 아래 자식 <Route>들을 자동 생성한다.
 */
export const routes: RouteSpec[] = [
  // --- fullscreen 그룹: 호스트 앱이 자체 앱바를 주거나, 인증/온보딩처럼 GNB 가 불필요한 화면 ---
  {
    path: '/login',
    element: <LoginPage />,
    protected: false,
    layoutGroup: 'fullscreen',
    layout: { hideChrome: true },
  },

  // --- gnb 그룹: 기본 모바일 레이아웃(AppShell + Top/TopNavigation) ---
  {
    path: '/',
    element: <StudiesPage />,
    protected: true,
    layoutGroup: 'gnb',
    layout: {
      title: '내 스터디',
      right: <RefreshButton refreshKey="studies" />,
    },
  },
  {
    path: '/studies/:studyId',
    element: <StudyDetailPage />,
    protected: true,
    layoutGroup: 'gnb',
    // title 은 StudyDetailPage 가 자체 state 로 관리(기존 동작 보존) - usePageTitle 훅으로 주입.
    layout: { back: true },
  },
  {
    path: '/rounds/:roundId',
    element: <RoundDetailPage />,
    protected: true,
    layoutGroup: 'gnb',
    // title 은 RoundDetailPage 가 자체 state 로 관리.
    layout: { back: true, right: <RefreshButton refreshKey="rounds" /> },
  },
  {
    path: '/rounds/:roundId/submit',
    element: <SubmissionCreatePage />,
    protected: true,
    layoutGroup: 'gnb',
    layout: { title: '제출 등록', back: true },
  },
  {
    path: '/rounds/:roundId/reminder',
    element: <ReminderPage />,
    protected: true,
    layoutGroup: 'gnb',
    layout: { title: '리마인드/공유', back: true },
  },

  // --- 404 ---
  {
    path: '*',
    element: <NotFoundPage />,
    protected: false,
    layoutGroup: 'gnb',
    layout: { title: '앗' },
  },
];

