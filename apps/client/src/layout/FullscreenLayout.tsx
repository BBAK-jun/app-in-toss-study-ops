import { Outlet } from '@tanstack/react-router';

export function FullscreenLayout() {
  return (
    <main style={{ flex: 1 }}>
      <Outlet />
    </main>
  );
}
