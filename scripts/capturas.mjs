/*
 * Capturas para las fichas de Google Play y la App Store.
 *
 * Las tiendas exigen píxeles exactos, así que no vale recortar una ventana a
 * ojo: se conduce un Chrome sin interfaz por el protocolo de DevTools, que
 * permite fijar el tamaño y la densidad de pantalla y pedir la imagen ya
 * medida. Node 22 trae WebSocket incorporado, de modo que no hace falta
 * ninguna dependencia nueva para hablar con él.
 *
 * La explotación es inventada (`capturas-datos.mjs`): una ficha pública no
 * puede enseñar los crotales ni las cuentas de una explotación real.
 *
 * Uso:  npm run build  &&  node scripts/capturas.mjs
 * Salida: capturas/<perfil>/<n>-<nombre>.png
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { explotacionDemo, facturaDemoPdf, usuarioDemo } from './capturas-datos.mjs';

const RAIZ = resolve(import.meta.dirname, '..');
const SITIO = join(RAIZ, 'dist');
const SALIDA = join(RAIZ, 'capturas');
const PUERTO = 5199;
const PUERTO_CDP = 9333;

/*
 * Tamaños exigidos por cada tienda. El ancho en CSS por la densidad da el
 * píxel final: 440x956 a 3 son los 1320x2868 del iPhone de 6,9 pulgadas, y
 * 960x540 a 2 son los 1920x1080 del apartado de tableta de Google Play.
 */
const PERFILES = [
  { nombre: 'app-store-iphone', ancho: 440, alto: 956, densidad: 3, movil: true },
  { nombre: 'google-play-tableta', ancho: 960, alto: 540, densidad: 2, movil: false }
];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.gz': 'application/gzip'
};

/** PDF mínimo con una capa de texto, para la captura del lector de facturas. */
function pdfDeDemostracion(lineas) {
  const escapar = t => t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const ops = ['BT', '/F1 11 Tf', '16 TL', '56 760 Td'];
  for (const l of lineas) ops.push(l ? `(${escapar(l)}) Tj` : '()Tj', 'T*');
  ops.push('ET');
  const flujo = Buffer.from(ops.join('\n'), 'latin1');
  const objetos = [
    Buffer.from('<</Type/Catalog/Pages 2 0 R>>'),
    Buffer.from('<</Type/Pages/Kids[3 0 R]/Count 1>>'),
    Buffer.from(
      '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>'
    ),
    Buffer.concat([
      Buffer.from(`<</Length ${flujo.length}>>stream\n`),
      flujo,
      Buffer.from('\nendstream')
    ]),
    Buffer.from('<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>')
  ];
  let salida = Buffer.from('%PDF-1.4\n');
  const posiciones = [];
  objetos.forEach((o, i) => {
    posiciones.push(salida.length);
    salida = Buffer.concat([salida, Buffer.from(`${i + 1} 0 obj`), o, Buffer.from('endobj\n')]);
  });
  const xref = salida.length;
  let cola = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const p of posiciones) cola += `${String(p).padStart(10, '0')} 00000 n \n`;
  cola += `trailer<</Size ${objetos.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.concat([salida, Buffer.from(cola)]);
}

function servir(raiz, pdf) {
  const servidor = createServer(async (pet, res) => {
    const ruta = decodeURIComponent((pet.url ?? '/').split('?')[0]);
    if (ruta === '/factura-demo.pdf') {
      res.writeHead(200, { 'content-type': 'application/pdf' });
      return res.end(pdf);
    }
    const destino = join(raiz, ruta === '/' ? 'index.html' : ruta.replace(/^\/+/, ''));
    try {
      const cuerpo = await readFile(destino);
      res.writeHead(200, { 'content-type': TIPOS[extname(destino)] ?? 'application/octet-stream' });
      res.end(cuerpo);
    } catch {
      // Una aplicación de una sola página resuelve sus rutas en el cliente.
      res.writeHead(200, { 'content-type': TIPOS['.html'] });
      res.end(await readFile(join(raiz, 'index.html')));
    }
  });
  return new Promise(ok => servidor.listen(PUERTO, () => ok(servidor)));
}

function buscarChrome() {
  const candidatos = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ].filter(Boolean);
  const encontrado = candidatos.find(c => existsSync(c));
  if (!encontrado) throw new Error('No se ha encontrado Chrome ni Edge. Define CHROME=<ruta>.');
  return encontrado;
}

/** Cliente mínimo del protocolo de DevTools: abrir, mandar, esperar respuesta. */
async function conectar(url) {
  const ws = new WebSocket(url);
  const pendientes = new Map();
  let siguienteId = 0;
  await new Promise((ok, fallo) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => fallo(new Error('No se ha podido hablar con Chrome.')), {
      once: true
    });
  });
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(String(ev.data));
    const espera = pendientes.get(msg.id);
    if (!espera) return;
    pendientes.delete(msg.id);
    msg.error ? espera.fallo(new Error(msg.error.message)) : espera.ok(msg.result);
  });
  return {
    enviar: (method, params = {}) =>
      new Promise((ok, fallo) => {
        const id = ++siguienteId;
        pendientes.set(id, { ok, fallo });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    cerrar: () => ws.close()
  };
}

const esperar = ms => new Promise(ok => setTimeout(ok, ms));

async function main() {
  if (!existsSync(join(SITIO, 'index.html')))
    throw new Error('Falta dist/. Ejecuta `npm run build` antes que esto.');

  const pdf = pdfDeDemostracion(facturaDemoPdf);
  const servidor = await servir(SITIO, pdf);
  const perfilChrome = join(RAIZ, 'node_modules', '.cache', 'chrome-capturas');
  await mkdir(perfilChrome, { recursive: true });

  const chrome = spawn(
    buscarChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      `--remote-debugging-port=${PUERTO_CDP}`,
      `--user-data-dir=${perfilChrome}`,
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  let cdp;
  try {
    let objetivo;
    for (let intento = 0; intento < 40 && !objetivo; intento++) {
      await esperar(250);
      try {
        const lista = await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`).then(r => r.json());
        objetivo = lista.find(t => t.type === 'page');
      } catch {
        /* Chrome todavía está arrancando. */
      }
    }
    if (!objetivo) throw new Error('Chrome no ha abierto el puerto de depuración.');
    cdp = await conectar(objetivo.webSocketDebuggerUrl);
    await cdp.enviar('Page.enable');
    await cdp.enviar('Runtime.enable');

    const evaluar = async expresion => {
      const r = await cdp.enviar('Runtime.evaluate', {
        expression: expresion,
        awaitPromise: true,
        returnByValue: true
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'fallo');
      return r.result.value;
    };

    const ir = async ruta => {
      await cdp.enviar('Page.navigate', { url: `http://127.0.0.1:${PUERTO}${ruta}` });
      await esperar(2200);
    };

    /*
     * Una captura de tienda tiene que enseñar lo que hace la aplicación, no su
     * cabecera. En las pantallas largas se baja hasta el primer gráfico antes
     * de disparar; el encuadre de 16:9 apenas da para media pantalla.
     */
    const bajarHasta = texto =>
      evaluar(`(async () => {
        const titulos = [...document.querySelectorAll('h2, h3')];
        const objetivo = titulos.find(h => h.textContent.includes(${JSON.stringify(texto)}));
        if (objetivo) objetivo.scrollIntoView({ block: 'start' });
        window.scrollBy(0, -16);
        await new Promise(r => setTimeout(r, 700));
        return objetivo ? 'ok' : 'no encontrado: ' + ${JSON.stringify(texto)};
      })()`);

    const capturar = async (perfil, n, nombre) => {
      const { data } = await cdp.enviar('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
      });
      const destino = join(SALIDA, perfil.nombre, `${n}-${nombre}.png`);
      await writeFile(destino, Buffer.from(data, 'base64'));
      const px = `${perfil.ancho * perfil.densidad}x${perfil.alto * perfil.densidad}`;
      console.log(`  ${n}. ${nombre} · ${px}`);
    };

    for (const perfil of PERFILES) {
      console.log(`\n${perfil.nombre} (${perfil.ancho}x${perfil.alto} @${perfil.densidad})`);
      await rm(join(SALIDA, perfil.nombre), { recursive: true, force: true });
      await mkdir(join(SALIDA, perfil.nombre), { recursive: true });
      await cdp.enviar('Emulation.setDeviceMetricsOverride', {
        width: perfil.ancho,
        height: perfil.alto,
        deviceScaleFactor: perfil.densidad,
        mobile: perfil.movil
      });

      await ir('/');
      await evaluar(`(() => {
        localStorage.clear();
        const u = ${JSON.stringify(usuarioDemo.id)};
        localStorage.setItem('chaparra:v2:users', JSON.stringify([${JSON.stringify(usuarioDemo)}]));
        localStorage.setItem('chaparra:v2:session', JSON.stringify({ userId: u, expiresAt: Date.now() + 864e5 }));
        const d = ${JSON.stringify(explotacionDemo)};
        for (const k of Object.keys(d)) localStorage.setItem('chaparra:v2:u:' + u + ':' + k, JSON.stringify(d[k]));
        return 'ok';
      })()`);

      await ir('/');
      await capturar(perfil, 1, 'rebano');

      await evaluar(`(async () => {
        const fila = [...document.querySelectorAll('button')].find(b => /^ES9\\d+/.test(b.textContent.trim()));
        fila.click();
        await new Promise(r => setTimeout(r, 900));
        return 'ok';
      })()`);
      await capturar(perfil, 2, 'ficha-animal');

      await evaluar(`(async () => {
        document.querySelector('dialog')?.querySelector('button[aria-label*="Cerrar"], button')?.click();
        await new Promise(r => setTimeout(r, 400));
        return 'ok';
      })()`);
      await ir('/?seccion=produccion');
      console.log('  ' + (await bajarHasta('Evolución de los últimos 30 días')));
      await capturar(perfil, 3, 'produccion');

      await ir('/?seccion=facturas');
      await capturar(perfil, 4, 'facturas');

      await evaluar(`(async () => {
        const abrir = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Añadir registro'));
        abrir.click();
        await new Promise(r => setTimeout(r, 700));
        const blob = await fetch('/factura-demo.pdf').then(r => r.blob());
        const dt = new DataTransfer();
        dt.items.add(new File([blob], 'factura.pdf', { type: 'application/pdf' }));
        const input = document.querySelectorAll('input[type="file"]')[0];
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 1200));
        [...document.querySelectorAll('button')].find(b => b.textContent.includes('Rellenar desde')).click();
        await new Promise(r => setTimeout(r, 4000));
        /* Encuadrar el aviso de la lectura: sin él la captura es un formulario
         * cualquiera, y lo que se quiere enseñar es que se ha rellenado solo. */
        const aviso = [...document.querySelectorAll('[role="status"]')]
          .find(n => n.textContent.includes('Se ha leído'));
        if (aviso) aviso.scrollIntoView({ block: 'end' });
        await new Promise(r => setTimeout(r, 600));
        return aviso ? 'ok' : 'sin aviso de lectura';
      })()`).then(r => console.log('  ' + r));
      await capturar(perfil, 5, 'lectura-justificante');

      await ir('/?seccion=informes');
      await esperar(1800);
      console.log('  ' + (await bajarHasta('registrados mes a mes')));
      await capturar(perfil, 6, 'informes');
    }
    console.log(`\nListo. Imágenes en ${SALIDA}`);
  } finally {
    cdp?.cerrar();
    chrome.kill();
    servidor.close();
  }
}

await main();
