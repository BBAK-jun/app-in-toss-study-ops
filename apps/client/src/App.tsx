import { RouterProvider } from '@tanstack/react-router';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverlayProvider } from 'overlay-kit';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';

import { router } from './router/router';
import { SessionProvider } from './context/SessionContext';
import { RuntimeEnvironmentProvider } from './runtime/RuntimeEnvironment';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <TDSMobileAITProvider>
      <RuntimeEnvironmentProvider>
        <QueryClientProvider client={queryClient}>
          <OverlayProvider>
            <SessionProvider>
              <NuqsAdapter>
                <RouterProvider router={router} />
              </NuqsAdapter>
            </SessionProvider>
          </OverlayProvider>
        </QueryClientProvider>
      </RuntimeEnvironmentProvider>
    </TDSMobileAITProvider>
  );
}
