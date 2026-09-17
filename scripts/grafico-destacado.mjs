import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { abrirChrome, esperar } from './chrome.mjs';

/*
 * Gráfico destacado de Google Play: la banda que corona la ficha.
 *
 * Play lo pide en 1024x500 exactos y sin canal alfa, así que sale en JPEG
 * dibujado por el propio navegador, con la tipografía y los colores de la
 * aplicación. Nada de píxeles estirados ni de capturas recortadas.
 *
 * Dos cosas mandan en el diseño. La primera es que en el móvil esta imagen se
 * ve del tamaño de un sello: por eso hay una sola frase, grande, y ningún
 * párrafo. La segunda es que Play superpone el icono y el título encima en
 * algunas superficies, así que la mitad derecha se deja respirar y todo lo que
 * hay que leer queda lejos de los bordes.
 *
 * Uso:  node scripts/grafico-destacado.mjs
 */

const RAIZ = resolve(import.meta.dirname, '..');
const SALIDA = join(RAIZ, 'capturas', 'google-play');
const PUERTO_CDP = 9334;
const ANCHO = 1024;
const ALTO = 500;

const COLORES = {
  verdeOscuro: '#173928',
  verde: '#1F4A33',
  verdeClaro: '#3E7554',
  hueso: '#FAFAF9',
  tierra: '#A8630F'
};

/** La hoja de la marca, la misma de `public/icon.svg`. */
const HOJA = `
  <g fill="none" stroke="${COLORES.hueso}" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </g>`;

async function paginaHtml() {
  // La tipografía va incrustada: el navegador abre un archivo suelto, sin servidor.
  const fuente = await readFile(join(RAIZ, 'public', 'fonts', 'plus-jakarta-sans-latin.woff2'));
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Plus Jakarta Sans';
    font-weight: 200 800;
    src: url(data:font/woff2;base64,${fuente.toString('base64')}) format('woff2');
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${ANCHO}px; height: ${ALTO}px; overflow: hidden;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    color: ${COLORES.hueso};
    background: ${COLORES.verde};
  }
  .lienzo {
    position: relative; width: 100%; height: 100%;
    background:
      radial-gradient(120% 140% at 88% 18%, ${COLORES.verdeClaro} 0%, transparent 55%),
      linear-gradient(118deg, ${COLORES.verde} 0%, ${COLORES.verdeOscuro} 100%);
    display: flex; align-items: center;
  }
  /* Líneas de cercado: sugieren el campo sin competir con el texto. */
  .cercado {
    position: absolute; inset: 0; opacity: 0.16;
    background-image: repeating-linear-gradient(
      101deg, transparent 0 64px, ${COLORES.hueso} 64px 65px
    );
    mask-image: linear-gradient(100deg, transparent 38%, #000 100%);
  }
  .loma {
    position: absolute; right: -60px; bottom: -190px;
    width: 520px; height: 520px; border-radius: 50%;
    background: ${COLORES.verdeOscuro}; opacity: 0.55;
  }
  .texto { position: relative; padding: 0 0 0 76px; max-width: 640px; }
  .marca { display: flex; align-items: center; gap: 18px; }
  .marca svg { width: 62px; height: 62px; }
  .marca span { font-size: 62px; font-weight: 800; letter-spacing: -0.02em; }
  h1 {
    margin-top: 26px; font-size: 40px; line-height: 1.16;
    font-weight: 700; letter-spacing: -0.015em; max-width: 560px;
  }
  .apoyo {
    margin-top: 22px; display: flex; gap: 10px; flex-wrap: wrap;
  }
  .apoyo b {
    font-size: 19px; font-weight: 600; padding: 9px 17px; border-radius: 999px;
    background: rgba(250, 250, 249, 0.13);
    border: 1px solid rgba(250, 250, 249, 0.22);
  }
  .acento { color: #F0C48A; }
</style></head>
<body>
  <div class="lienzo">
    <div class="cercado"></div>
    <div class="loma"></div>
    <div class="texto">
      <div class="marca">
        <svg viewBox="0 0 24 24">${HOJA}</svg>
        <span>Chaparra</span>
      </div>
      <h1>Tu cuaderno de campo,<br /><span class="acento">también sin cobertura</span></h1>
      <div class="apoyo">
        <b>Ganado</b><b>Sanidad</b><b>Producción</b><b>Facturas</b>
      </div>
    </div>
  </div>
</body></html>`;
}

async function main() {
  await mkdir(SALIDA, { recursive: true });
  const html = await paginaHtml();
  const temporal = join(SALIDA, '.grafico-destacado.html');
  await writeFile(temporal, html, 'utf8');

  const chrome = await abrirChrome(PUERTO_CDP);
  try {
    await chrome.enviar('Emulation.setDeviceMetricsOverride', {
      width: ANCHO,
      height: ALTO,
      deviceScaleFactor: 1,
      mobile: false
    });
    await chrome.enviar('Page.navigate', { url: 'file:///' + temporal.replace(/\\/g, '/') });
    await esperar(1800);
    // JPEG y no PNG: Play pide 24 bits sin alfa, y así no hay duda.
    const { data } = await chrome.enviar('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 94,
      captureBeyondViewport: false
    });
    const destino = join(SALIDA, 'grafico-destacado.jpg');
    await writeFile(destino, Buffer.from(data, 'base64'));
    console.log(`Gráfico destacado · ${ANCHO}x${ALTO} · ${destino}`);
  } finally {
    chrome.cerrar();
  }
}

await main();
