import { useMatches, useNavigate, useOutlet } from 'react-router-dom';

import { AppShell } from '../components/AppShell';
import type { LayoutSpec, RouteHandle } from './types';
import { usePageLayoutContext } from './PageLayoutContext';
import { useRuntimeEnvironment } from '../runtime/RuntimeEnvironment';

interface LeafMatch {
  handle?: unknown;
}

export function GnbLayout() {
  const { isHostApp } = useRuntimeEnvironment();
  const { override } = usePageLayoutContext();
  const navigate = useNavigate();
  const outlet = useOutlet();

  const layout = resolveLayoutSpec(useMatches());

  if (layout?.hideChrome || isHostApp) {
    return <main style={{ flex: 1, paddingBottom: layout?.hideBottomSafeArea ? 0 : 112 }}>{outlet}</main>;
  }

  const title = resolveTitle(layout, override.title);
  const right = layout?.right;

  return (
    <AppShell title={title} onBack={layout?.back ? () => navigate(-1) : undefined} right={right}>
      {outlet}
    </AppShell>
  );
}

function resolveLayoutSpec(matches: LeafMatch[]): LayoutSpec | undefined {
  const leaf = matches.at(-1);
  const handle = leaf?.handle as RouteHandle | undefined;
  return handle?.layout;
}

function resolveTitle(layout: LayoutSpec | undefined, dynamicTitle: string | undefined): string {
  if (dynamicTitle !== undefined) return dynamicTitle;
  if (layout?.title === undefined) return '';
  if (typeof layout.title === 'function') {
    return '';
  }
  return layout.title;
}
