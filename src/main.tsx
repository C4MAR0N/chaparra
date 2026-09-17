import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeStorage } from './services/storage';
import './index.css';
initializeStorage();

// El ganadero usa la app en el campo, donde a menudo no hay cobertura: el service
// worker mantiene disponible el esqueleto de la aplicación sin conexión. En
// desarrollo no se registra, para no servir versiones cacheadas al recargar.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        /* Sin conexión o navegador sin soporte: la app funciona igual, solo que en línea. */
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
