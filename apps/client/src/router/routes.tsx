import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router';

import { FullscreenLayout } from '../layout/FullscreenLayout';
import { GnbLayout } from '../layout/GnbLayout';
import { RefreshButton } from '../layout/RefreshButton';
import type { RouteHandle } from '../layout/types';
import { LoginPage } from '../pages/LoginPage';
import { Protected } from './Protected';

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundBoundary,
});

function RootComponent() {
  return <Outlet />;
}

function NotFoundBoundary() {
  return null;
}

const fullscreenLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_fullscreen',
  component: FullscreenLayout,
});

const gnbLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_gnb',
  component: GnbLayout,
});

const protectedRoute = createRoute({
  getParentRoute: () => gnbLayoutRoute,
  id: '_protected',
  component: Protected,
});

const loginRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'login',
  component: LoginPage,
  staticData: {
    layout: { hideChrome: true },
    layoutGroup: 'fullscreen',
  } satisfies RouteHandle,
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: lazyRouteComponent(() => import('../pages/StudiesPage'), 'StudiesPage'),
  staticData: {
    layout: {
      title: '내 스터디',
      right: <RefreshButton refreshKey="studies" />,
    },
    layoutGroup: 'gnb',
  } satisfies RouteHandle,
});

const studyDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: 'studies/$studyId',
  component: lazyRouteComponent(() => import('../pages/StudyDetailPage'), 'StudyDetailPage'),
  staticData: {
    layout: { back: true },
    layoutGroup: 'gnb',
  } satisfies RouteHandle,
});

const roundDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: 'rounds/$roundId',
  component: lazyRouteComponent(() => import('../pages/RoundDetailPage'), 'RoundDetailPage'),
  staticData: {
    layout: { back: true, right: <RefreshButton refreshKey="rounds" /> },
    layoutGroup: 'gnb',
  } satisfies RouteHandle,
});

const submissionCreateRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: 'rounds/$roundId/submit',
  component: lazyRouteComponent(
    () => import('../pages/SubmissionCreatePage'),
    'SubmissionCreatePage',
  ),
  staticData: {
    layout: { title: '제출 등록', back: true },
    layoutGroup: 'gnb',
  } satisfies RouteHandle,
});

const reminderRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: 'rounds/$roundId/reminder',
  component: lazyRouteComponent(() => import('../pages/ReminderPage'), 'ReminderPage'),
  staticData: {
    layout: { title: '리마인드/공유', back: true },
    layoutGroup: 'gnb',
  } satisfies RouteHandle,
});

const notFoundRoute = createRoute({
  getParentRoute: () => gnbLayoutRoute,
  path: '$',
  component: lazyRouteComponent(() => import('../pages/NotFoundPage'), 'NotFoundPage'),
  staticData: {
    layout: { title: '앗' },
    layoutGroup: 'gnb',
  } satisfies RouteHandle,
});

export const routeTree = rootRoute.addChildren([
  fullscreenLayoutRoute.addChildren([loginRoute]),
  gnbLayoutRoute.addChildren([
    protectedRoute.addChildren([
      indexRoute,
      studyDetailRoute,
      roundDetailRoute,
      submissionCreateRoute,
      reminderRoute,
    ]),
    notFoundRoute,
  ]),
]);
