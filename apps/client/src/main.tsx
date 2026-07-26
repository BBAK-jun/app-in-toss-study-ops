import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverlayProvider } from 'overlay-kit';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';

import { App } from './App';
import { SessionProvider } from './context/SessionContext';
import { RuntimeEnvironmentProvider } from './runtime/RuntimeEnvironment';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30초 동안 동일 쿼리 재요청 방지
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <TDSMobileAITProvider>
      <RuntimeEnvironmentProvider>
        <QueryClientProvider client={queryClient}>
          <OverlayProvider>
            <SessionProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </SessionProvider>
          </OverlayProvider>
        </QueryClientProvider>
      </RuntimeEnvironmentProvider>
    </TDSMobileAITProvider>
  </StrictMode>,
);
