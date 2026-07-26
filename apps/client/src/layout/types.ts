// apps/client/src/layout/types.ts
// IoC 기반 글로벌 레이아웃 시스템의 타입 계약.
// 페이지 컴포넌트는 본문만 렌더하고, 라우트 레벨에서 LayoutSpec 메타데이터를 선언한다.
// PageFrame / GnbLayout / FullscreenLayout 등이 이 메타데이터를 읽어 렌더를 입힌다.

import type { ReactNode, ReactElement } from 'react';

/**
 * 단일 라우트의 레이아웃 정책.
 * - title: 정적 문자열 또는 라우트 params/검색 파라미터로 계산되는 함수.
 * - back: 뒤로가기 버튼 필요 여부. true면 PageFrame이 window.history.back()을 건다.
 * - right: 우측 액션 노드(버튼 등). 동적이라면 컴포넌트 자체를 element로 전달.
 * - hideChrome: true면 Top/TopNavigation 헤더 자체를 숨긴다(풀스크린/스플래시).
 * - hideBottomSafeArea: true면 main의 paddingBottom:112을 해제한다.
 */
export interface LayoutSpec {
  title?: string | ((params: Record<string, string | undefined>) => string);
  back?: boolean;
  right?: ReactNode;
  hideChrome?: boolean;
  hideBottomSafeArea?: boolean;
}

/**
 * 레이아웃 그룹 키. 동일 그룹끼리 하나의 <Route element={<Layout/>}>로 묶인다.
 * - gnb: 기본 모바일 레이아웃(AppShell의 Top/TopNavigation + main).
 * - fullscreen: 헤더 없이 본문만. host App이 자체 앱바를 제공하거나, 스플래시/온보딩에 사용.
 * 새 그룹이 필요하면 LayoutGroup 매핑 + 해당 Layout 컴포넌트를 추가한다.
 */
export type LayoutGroup = 'gnb' | 'fullscreen';

/**
 * 단일 라우트 선언. routes.tsx 의 진실 소스 배열 원소 타입.
 * react-router v6 의 handle 필드에 그대로 주입되며, GnbLayout 등이 useMatches() 로 읽는다.
 */
export interface RouteSpec {
  path: string;
  element: ReactElement;
  layout?: LayoutSpec;
  layoutGroup?: LayoutGroup; // 생략 시 'gnb'
  // Protected 래핑 필요 여부. App.tsx 가 이 값을 보고 Protected 범위를 결정한다.
  protected?: boolean;
}

/**
 * react-router useMatches() 결과의 handle 슬롯에 들어갈 타입.
 * LayoutSpec 외에 다른 handle 용도가 생기면 확장 가능(declaration merging).
 */
export interface RouteHandle {
  layout?: LayoutSpec;
  layoutGroup?: LayoutGroup;
}
