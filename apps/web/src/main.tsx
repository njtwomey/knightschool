import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { registerSW } from 'virtual:pwa-register';
import { startRouter } from '@/router/location';
import './index.css';

// Keeps the offline copy current: a new version installs in the background and applies on the next visit.
registerSW({ immediate: true });
startRouter();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
