import workerPdf from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/*
 * Sacar el texto de un justificante para poder proponer los datos de la factura.
 *
 * Todo ocurre en el dispositivo. Ni la foto ni el PDF salen del móvil: leerlos
 * en un servidor sería más preciso, pero significaría mandar las cuentas del
 * ganadero a un tercero, y eso no se hace sin motivo.
 *
 * Tres caminos, del bueno al malo:
 *   1. PDF con texto dentro (el que llega por correo) -> se lee exacto.
 *   2. Foto, con el lector de textos del propio sistema -> gratis e inmediato,
 *      pero solo lo tienen algunos navegadores, sobre todo en Android.
 *   3. Foto, con Tesseract -> funciona en todas partes, pero hay que descargar
 *      el motor la primera vez y acierta menos con un papel arrugado.
 */

export type Progreso = (paso: string) => void;

/** Más páginas que esto en una factura de campo es un listado, no una factura. */
const MAX_PAGINAS = 5;
/** Con menos texto que esto, el PDF es un escaneo: hay que pasarlo por el lector. */
const MINIMO_TEXTO = 40;
/** Ancho al que se rasteriza un PDF escaneado: por debajo, el lector no acierta. */
const ANCHO_OCR = 2000;

export const esPdf = (dataUrl: string) => dataUrl.startsWith('data:application/pdf');

function bytesDe(dataUrl: string): Uint8Array {
  const binario = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binario.length);
  for (let n = 0; n < binario.length; n++) bytes[n] = binario.charCodeAt(n);
  return bytes;
}

async function abrirPdf(dataUrl: string) {
  /* pdf.js 4 da por hecho `Promise.withResolvers`, que Safari no tuvo hasta
   * 17.4. Sin este apaño, en un iPhone de hace dos años no abre nada. */
  const P = Promise as unknown as { withResolvers?: unknown };
  if (typeof P.withResolvers !== 'function') {
    P.withResolvers = function <T>() {
      let resolve!: (value: T) => void, reject!: (motivo?: unknown) => void;
      const promise = new Promise<T>((s, n) => {
        resolve = s;
        reject = n;
      });
      return { promise, resolve, reject };
    };
  }
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerPdf;
  return pdfjs.getDocument({ data: bytesDe(dataUrl), isEvalSupported: false }).promise;
}

async function textoDelPdf(dataUrl: string, avisar: Progreso) {
  avisar('Abriendo el PDF…');
  const doc = await abrirPdf(dataUrl);
  const paginas = Math.min(doc.numPages, MAX_PAGINAS);
  const trozos: string[] = [];
  for (let n = 1; n <= paginas; n++) {
    const pagina = await doc.getPage(n);
    const contenido = await pagina.getTextContent();
    /* Los fragmentos vienen sueltos y sin saltos de línea. `hasEOL` marca dónde
     * acababa cada renglón, y el renglón importa: «TOTAL» y su importe tienen
     * que quedar en la misma línea para que el intérprete los relacione. */
    let linea = '';
    for (const pieza of contenido.items) {
      if (!('str' in pieza)) continue;
      linea += pieza.str;
      if (pieza.hasEOL) {
        trozos.push(linea);
        linea = '';
      }
    }
    if (linea) trozos.push(linea);
  }
  return { doc, texto: trozos.join('\n') };
}

/** Dibuja la primera página en un lienzo para poder pasarla por el lector. */
async function rasterizar(doc: Awaited<ReturnType<typeof abrirPdf>>): Promise<Blob> {
  const pagina = await doc.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: Math.min(4, ANCHO_OCR / base.width) });
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(viewport.width);
  lienzo.height = Math.round(viewport.height);
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Este navegador no puede preparar la imagen del PDF.');
  await pagina.render({ canvasContext: ctx, viewport }).promise;
  return new Promise<Blob>((resolve, reject) =>
    lienzo.toBlob(
      b => (b ? resolve(b) : reject(new Error('No se ha podido leer el PDF.'))),
      'image/png'
    )
  );
}

interface DetectorDeTexto {
  detect: (fuente: ImageBitmap) => Promise<{ rawValue: string }[]>;
}

/*
 * Lector del propio sistema operativo. En Android va muy bien y no descarga
 * nada; donde no exista, se devuelve null y se tira del motor propio.
 */
async function leerConElSistema(fuente: Blob): Promise<string | null> {
  const Detector = (window as unknown as { TextDetector?: new () => DetectorDeTexto }).TextDetector;
  if (!Detector) return null;
  try {
    const bitmap = await createImageBitmap(fuente);
    try {
      const bloques = await new Detector().detect(bitmap);
      const texto = bloques.map(b => b.rawValue).join('\n');
      return texto.trim().length >= MINIMO_TEXTO ? texto : null;
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

async function leerConTesseract(fuente: Blob, avisar: Progreso): Promise<string> {
  avisar('Preparando el lector…');
  const { createWorker } = await import('tesseract.js');
  /*
   * Motor y diccionario salen de este mismo dominio, no de un CDN: así la app
   * no depende de un tercero y, una vez descargados, el lector funciona también
   * sin cobertura.
   */
  const base = new URL('ocr/', document.baseURI).href;
  const worker = await createWorker('spa', 1, {
    workerPath: base + 'worker.min.js',
    corePath: base,
    langPath: base,
    gzip: true,
    legacyCore: false,
    legacyLang: false,
    logger: m => {
      if (m.status === 'recognizing text') avisar('Leyendo la imagen…');
      else if (String(m.status).includes('loading')) avisar('Descargando el lector…');
    }
  });
  try {
    const { data } = await worker.recognize(fuente);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

async function leerImagen(fuente: Blob, avisar: Progreso): Promise<string> {
  avisar('Leyendo la imagen…');
  return (await leerConElSistema(fuente)) ?? (await leerConTesseract(fuente, avisar));
}

/**
 * Devuelve el texto de un justificante, sea PDF o foto. Lanza si no hay nada
 * legible: proponer campos a partir de ruido sería peor que no proponer nada.
 */
export async function leerJustificante(dataUrl: string, avisar: Progreso = () => {}) {
  if (esPdf(dataUrl)) {
    const { doc, texto } = await textoDelPdf(dataUrl, avisar);
    if (texto.trim().length >= MINIMO_TEXTO) return texto;
    // PDF sin capa de texto: es un escaneo disfrazado de PDF.
    avisar('El PDF es un escaneo: hay que leerlo como una imagen…');
    return leerImagen(await rasterizar(doc), avisar);
  }
  const respuesta = await fetch(dataUrl);
  return leerImagen(await respuesta.blob(), avisar);
}
