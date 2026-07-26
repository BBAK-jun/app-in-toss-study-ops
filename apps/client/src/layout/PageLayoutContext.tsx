// apps/client/src/layout/PageLayoutContext.tsx
//
// 페이지가 레이아웃 메타데이터를 "런타임에" override 할 수 있게 해주는 컨텍스트.
//
// 배경: routes.tsx 의 LayoutSpec 은 정적(라우트 선언 시점). title/back/right/hideChrome
// 대부분은 정적으로 충분하지만, 일부 페이지(StudyDetailPage / RoundDetailPage)는
// 데이터 패칭 후에야 title 을 확정할 수 있다.
//
// 이 컨텍스트는 두 가지 용도를 통합:
// 1. 동적 title override (데이터 fetch 후 확정)
// 2. 새로고침 콜백 등록 (right 버튼이 페이지 state 에 접근)
//
// GnbLayout 은 route handle 의 정적 LayoutSpec + 이 컨텍스트의 런타임 override 를
// 합쳐서 최종 렌더에 사용한다. override 가 우선.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * 페이지가 런타임에 레이아웃에 영향을 주는 값.
 * - title: route 의 정적 title 보다 우선.
 * - onRefresh: right 버튼(RefreshButton)이 호출할 콜백. 페이지의 데이터 reload 함수.
 *   라우트 메타데이터가 RefreshButton 을 렌더하되, 클릭 시점에 이 콜백을 찾아 호출한다.
 */
export interface PageLayoutOverride {
  title?: string;
  onRefresh?: () => void;
}

interface PageLayoutContextValue {
  override: PageLayoutOverride;
  setOverride: (next: PageLayoutOverride) => void;
}

const PageLayoutContext = createContext<PageLayoutContextValue | null>(null);

export function PageLayoutProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<PageLayoutOverride>({});

  const setOverride = useMemo(
    () =>
      (next: PageLayoutOverride) => {
        setOverrideState((prev) => {
          if (prev.title === next.title && prev.onRefresh === next.onRefresh) {
            return prev;
          }
          return next;
        });
      },
    [],
  );

  const value = useMemo<PageLayoutContextValue>(
    () => ({ override, setOverride }),
    [override, setOverride],
  );
  return <PageLayoutContext.Provider value={value}>{children}</PageLayoutContext.Provider>;
}

/**
 * GnbLayout 이 읽는 공식 hook. Provider 없으면 빈 override 로 폴백.
 */
export function usePageLayoutContext(): PageLayoutContextValue {
  const ctx = useContext(PageLayoutContext);
  return ctx ?? { override: {}, setOverride: () => {} };
}

/**
 * 페이지가 호출하는 훅. 페이지 컴포넌트 안에서 usePageLayout({...}) 호출 한 번으로
 * 현재 라우트의 동적 title / 새로고침 콜백을 GnbLayout 에 전달한다.
 *
 * 사용 예:
 *   const refresh = useCallback(async () => { ... }, [studyId]);
 *   usePageLayout({ title: study?.title, onRefresh: refresh });
 *
 * 동작:
 *   - deps(title / onRefresh 참조) 가 바뀌면 컨텍스트를 갱신.
 *   - 얕은 비교라 값이 같으면 setState no-op.
 *   - unmount 시 자동으로 override 를 비운다(다음 페이지에 섞이지 않게).
 *
 * 주의:
 *   - 첫 렌더에는 아직 override 가 반영되지 않는다(useEffect 타이밍).
 *     데이터 fetch 후 title 이 정해지는 페이지(StudyDetailPage 등)는 이 미세 지연이
 *     사용자 경험에 영향을 주지 않는다. 정적 title 은 routes.tsx 의 LayoutSpec 에 두면
 *     즉시 반영된다.
 *   - onRefresh 는 매 렌더 새 함수면 setState 가 계속 트리거되므로, useCallback 으로 안정화.
 */
export function usePageLayout(override: PageLayoutOverride): void {
  const { setOverride } = usePageLayoutContext();

  useEffect(() => {
    setOverride({ title: override.title, onRefresh: override.onRefresh });
    return () => setOverride({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override.title, override.onRefresh, setOverride]);
}
