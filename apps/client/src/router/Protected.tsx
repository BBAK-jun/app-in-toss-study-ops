import { Outlet, useRouter } from '@tanstack/react-router';

import { useSession } from '../hooks/useSession';

export function Protected() {
  const { user, loading } = useSession();
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    void router.navigate({ to: '/login', replace: true });
    return null;
  }

  return <Outlet />;
}
