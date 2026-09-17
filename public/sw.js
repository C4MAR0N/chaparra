/*
 * Service worker de Chaparra.
 *
 * Objetivo: que la app siga abriéndose y funcionando en el campo, donde a menudo
 * no hay cobertura. No hay servidor ni sincronización: los datos del ganadero
 * viven en su dispositivo, así que basta con tener el esqueleto de la aplicación
 * disponible sin conexión.
 *
 * Estrategias:
 *   - Navegación -> red primero, y si falla, el index.html cacheado.
 *   - Estáticos  -> caché primero, revalidando en segundo plano. Incluye la
 *                   tipografía, que se sirve desde este mismo dominio.
 *   - Resto      -> se deja pasar sin tocar.
 */

const VERSION = 'v2';
const SHELL = `chaparra-shell-${VERSION}`;
const ASSETS = `chaparra-assets-${VERSION}`;
const ACTUALES = [SHELL, ASSETS];

const INDEX = new URL('./', self.location).href;

/*
 * En la primera visita el service worker se activa cuando el navegador ya ha
 * pedido el JS y el CSS, así que esas peticiones no pasan por él y no se
 * cachean. Si el ganadero abriera la app y se quedara sin cobertura antes de
 * volver a entrar, no arrancaría.
 *
 * Para evitarlo, al instalar se lee el index.html y se precargan los recursos
 * que declara. Así no hace falta conocer los nombres con hash que genera Vite
 * ni generar una lista en tiempo de compilación.
 */
async function precargarRecursosDelIndice(html) {
  const cache = await caches.open(ASSETS);
  const urls = new Set();
  for (const [, ruta] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(ruta) || ruta.startsWith('data:')) continue;
    const url = new URL(ruta, INDEX);
    if (url.origin === self.location.origin) urls.add(url.href);
  }
  await Promise.all(
    [...urls].map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {
        /* Un recurso que falle no debe impedir la instalación. */
      })
    )
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch(new Request(INDEX, { cache: 'reload' }));
        if (res.ok) {
          const html = await res.clone().text();
          await (await caches.open(SHELL)).put(INDEX, res);
          await precargarRecursosDelIndice(html);
        }
      } catch {
        /* Sin conexión durante la instalación: se cacheará sobre la marcha. */
      }
      await self.skipWaiting();
    })()
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

  if (url.origin === self.location.origin) {
    event.respondWith(cachePrimero(request, ASSETS));
  }
});
