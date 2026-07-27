import { Outlet, useRouter, useMatches } from '@tanstack/react-router';

import { AppShell } from '../components/AppShell';
import type { LayoutSpec, RouteHandle } from './types';
import { usePageLayoutContext } from './PageLayoutContext';
import { useRuntimeEnvironment } from '../runtime/RuntimeEnvironment';

export function GnbLayout() {
  const { isHostApp } = useRuntimeEnvironment();
  const { override } = usePageLayoutContext();
  const router = useRouter();

  const layout = resolveLayoutSpec(useMatches());

  if (layout?.hideChrome || isHostApp) {
    return (
      <main style={{ flex: 1, paddingBottom: layout?.hideBottomSafeArea ? 0 : 112 }}>
        <Outlet />
      </main>
    );
  }

  const title = resolveTitle(layout, override.title);
  const right = layout?.right;

  return (
    <AppShell
      title={title}
      onBack={layout?.back ? () => router.history.back() : undefined}
      right={right}
    >
      <Outlet />
    </AppShell>
  );
}

function resolveLayoutSpec(matches: Array<{ staticData?: unknown }>): LayoutSpec | undefined {
  const leaf = matches.at(-1);
  const handle = leaf?.staticData as RouteHandle | undefined;
  return handle?.layout;
}

function resolveTitle(
  layout: LayoutSpec | undefined,
  dynamicTitle: string | undefined,
): string {
  if (dynamicTitle !== undefined) return dynamicTitle;
  if (layout?.title === undefined) return '';
  if (typeof layout.title === 'function') return '';
  return layout.title;
}
