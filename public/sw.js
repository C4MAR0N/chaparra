/*
 * Service worker de Chaparra.
 *
 * Objetivo: que la app siga abriéndose y funcionando en el campo, donde a menudo
 * no hay cobertura. No hay servidor ni sincronización: los datos del ganadero
 * viven en su dispositivo, así que basta con tener el esqueleto de la aplicación
 * disponible sin conexión.
 *
 * Estrategias:
 *   - Navegación  -> red primero, y si falla, el index.html cacheado.
 *   - Estáticos   -> caché primero, revalidando en segundo plano.
 *   - Tipografías -> caché primero (Google Fonts).
 *   - Resto       -> se deja pasar sin tocar.
 */

const VERSION = 'v1';
const SHELL = `chaparra-shell-${VERSION}`;
const ASSETS = `chaparra-assets-${VERSION}`;
const FONTS = `chaparra-fonts-${VERSION}`;
const ACTUALES = [SHELL, ASSETS, FONTS];

const INDEX = new URL('./', self.location).href;

const ORIGENES_FUENTES = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(cache => cache.add(new Request(INDEX, { cache: 'reload' })))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(nombres =>
        Promise.all(nombres.filter(n => !ACTUALES.includes(n)).map(n => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

async function cachePrimero(request, nombreCache) {
  const cache = await caches.open(nombreCache);
  const guardado = await cache.match(request);
  if (guardado) {
    // Revalida en segundo plano sin bloquear la respuesta.
    fetch(request)
      .then(res => res.ok && cache.put(request, res.clone()))
      .catch(() => {});
    return guardado;
  }
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function redPrimero(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(INDEX, res.clone());
    return res;
  } catch (error) {
    const guardado = await cache.match(INDEX);
    if (guardado) return guardado;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(redPrimero(request));
    return;
  }

  if (ORIGENES_FUENTES.includes(url.origin)) {
    event.respondWith(cachePrimero(request, FONTS));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cachePrimero(request, ASSETS));
  }
});
