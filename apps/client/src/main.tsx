import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';

import { App } from './App';
import { SessionProvider } from './context/SessionContext';
import { RuntimeEnvironmentProvider } from './runtime/RuntimeEnvironment';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <TDSMobileAITProvider>
      <RuntimeEnvironmentProvider>
        <SessionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SessionProvider>
      </RuntimeEnvironmentProvider>
    </TDSMobileAITProvider>
  </StrictMode>,
);
