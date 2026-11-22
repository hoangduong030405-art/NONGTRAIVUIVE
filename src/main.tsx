import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles/themes.css';

// NOTE: React.StrictMode is intentionally omitted — its dev-only double mount
// would boot the Phaser WebGL context twice.
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(<App />);

// Offline-first PWA cache (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
