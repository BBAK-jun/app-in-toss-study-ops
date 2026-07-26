import { Navigate, Route, Routes } from 'react-router-dom';

import { GnbLayout } from './layout/GnbLayout';
import { FullscreenLayout } from './layout/FullscreenLayout';
import { PageLayoutProvider } from './layout/PageLayoutContext';
import type { LayoutGroup, RouteHandle, RouteSpec } from './layout/types';
import { routes } from './routes';
import { useSession } from './hooks/useSession';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

const LAYOUT_GROUPS: Array<LayoutGroup> = ['gnb', 'fullscreen'];

const LAYOUT_ELEMENT: Record<LayoutGroup, React.ReactElement> = {
  gnb: <GnbLayout />,
  fullscreen: <FullscreenLayout />,
};

export function App() {
  const grouped = groupRoutesByLayout(routes);

  return (
    <PageLayoutProvider>
      <Routes>
        {LAYOUT_GROUPS.map((group) => {
          const specs = grouped[group];
          if (!specs || specs.length === 0) return null;
          return (
            <Route key={group} element={LAYOUT_ELEMENT[group]}>
              {specs.map((spec) => (
                <Route
                  key={spec.path}
                  path={spec.path}
                  element={wrapProtected(spec)}
                  handle={toHandle(spec)}
                />
              ))}
            </Route>
          );
        })}
      </Routes>
    </PageLayoutProvider>
  );
}

function wrapProtected(spec: RouteSpec) {
  return spec.protected ? <Protected>{spec.element}</Protected> : spec.element;
}

function toHandle(spec: RouteSpec): RouteHandle {
  return { layout: spec.layout, layoutGroup: spec.layoutGroup ?? 'gnb' };
}

function groupRoutesByLayout(specs: RouteSpec[]): Record<LayoutGroup, RouteSpec[]> {
  const result: Record<LayoutGroup, RouteSpec[]> = { gnb: [], fullscreen: [] };
  for (const spec of specs) {
    const group: LayoutGroup = spec.layoutGroup ?? 'gnb';
    result[group].push(spec);
  }
  return result;
}
