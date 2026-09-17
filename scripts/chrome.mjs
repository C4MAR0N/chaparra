import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/*
 * Chrome sin interfaz, conducido por el protocolo de DevTools.
 *
 * Lo usan el guion de capturas y el del gráfico destacado: las tiendas piden
 * píxeles exactos, y recortar una ventana a ojo no vale. Node 22 trae
 * WebSocket incorporado, así que no hace falta ninguna dependencia para
 * hablar con él.
 */

const RAIZ = resolve(import.meta.dirname, '..');
export const esperar = ms => new Promise(ok => setTimeout(ok, ms));

export function buscarChrome() {
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

/** Cliente mínimo del protocolo: abrir, mandar, esperar respuesta. */
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

/**
 * Arranca Chrome y devuelve el canal ya abierto, más `cerrar` para dejarlo todo
 * recogido. Lanza si el navegador no llega a abrir el puerto de depuración.
 */
export async function abrirChrome(puerto) {
  const perfil = join(RAIZ, 'node_modules', '.cache', 'chrome-capturas');
  await mkdir(perfil, { recursive: true });
  const proceso = spawn(
    buscarChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      `--remote-debugging-port=${puerto}`,
      `--user-data-dir=${perfil}`,
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  let objetivo;
  for (let intento = 0; intento < 40 && !objetivo; intento++) {
    await esperar(250);
    try {
      const lista = await fetch(`http://127.0.0.1:${puerto}/json/list`).then(r => r.json());
      objetivo = lista.find(t => t.type === 'page');
    } catch {
      /* Todavía está arrancando. */
    }
  }
  if (!objetivo) {
    proceso.kill();
    throw new Error('Chrome no ha abierto el puerto de depuración.');
  }

  const cdp = await conectar(objetivo.webSocketDebuggerUrl);
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

  return {
    enviar: cdp.enviar,
    evaluar,
    cerrar: () => {
      cdp.cerrar();
      proceso.kill();
    }
  };
}
