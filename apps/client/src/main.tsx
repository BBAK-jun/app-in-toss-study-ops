import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { App } from './App';
import { SessionProvider } from './context/SessionContext';

// Provider 중첩(문서 4-5):
// TDSMobileAITProvider(TDS 테마/글로벌) → SessionProvider(인증) → BrowserRouter(라우팅) → App
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <TDSMobileAITProvider>
      <SessionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SessionProvider>
    </TDSMobileAITProvider>
  </StrictMode>,
);
